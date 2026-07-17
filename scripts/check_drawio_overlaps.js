#!/usr/bin/env node
/**
 * check_drawio_overlaps.js — heurystyczny detektor kolizji w plikach .drawio
 *
 * Wykrywa (per strona <diagram>):
 *  - nachodzące na siebie etykiety (etykieta krawędzi vs etykieta, etykieta vs kształt)
 *  - nachodzące na siebie kształty (bez relacji kontener-zawartość)
 *  - dzieci wystające poza swój kontener (subgraph FE/BE)
 *  - kolizje z tytułem ramki alt/opt lub kontenera
 *  - przepełnienie treści w panelach tekstowych (tabele HTML wyższe niż box)
 *  - elementy poza granicami strony
 *
 * Współrzędne dzieci kontenerów są przeliczane na absolutne (łańcuch parentów).
 * Etykiety krawędzi z source/target (bez punktów) kotwiczone są w połowie odcinka
 * między punktami wyjścia/wejścia (exitX/entryX) lub środkami kształtów — to
 * przybliżenie, więc dla takich etykiet stosowana jest większa tolerancja.
 *
 * Użycie: node check_drawio_overlaps.js <plik.drawio> [kolejne...]
 *         node check_drawio_overlaps.js --all   (wszystkie z export/drawio/)
 * Kod wyjścia: 0 = czysto, 1 = kolizje (ERROR), 2 = błąd parsowania.
 */
const fs = require('fs');
const path = require('path');

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function stripHtml(value) {
  let s = value.replace(/<br\s*\/?>/gi, '\n').replace(/<\/tr>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  return s.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

function parseStyle(style) {
  const map = {};
  (style || '').split(';').forEach(tok => {
    if (!tok) return;
    const i = tok.indexOf('=');
    if (i === -1) map[tok] = true;
    else map[tok.slice(0, i)] = tok.slice(i + 1);
  });
  return map;
}

function textBox(lines, fontSize, bold) {
  const charW = fontSize * (bold ? 0.64 : 0.58);
  const w = Math.max(...lines.map(l => l.length), 0) * charW;
  const h = lines.length * fontSize * 1.4;
  return { w, h };
}

function parsePages(file) {
  const xml = fs.readFileSync(file, 'utf8');
  const pages = [];
  const pageRe = /<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g;
  let pm;
  while ((pm = pageRe.exec(xml)) !== null) {
    const nameM = /name="([^"]*)"/.exec(pm[1]);
    const body = pm[2];
    const cells = [];
    const cellRe = /<mxCell\b[\s\S]*?(?:\/>|<\/mxCell>)/g;
    let m;
    while ((m = cellRe.exec(body)) !== null) {
      const chunk = m[0];
      const tag = chunk.slice(0, chunk.indexOf('>') + 1);
      const attrs = {};
      let a;
      const attrRe = /([\w-]+)="([^"]*)"/g;
      while ((a = attrRe.exec(tag)) !== null) attrs[a[1]] = a[2];
      const cell = {
        id: attrs.id || '',
        value: decodeEntities(attrs.value || ''),
        style: attrs.style || '',
        styleMap: parseStyle(attrs.style || ''),
        isVertex: attrs.vertex === '1',
        isEdge: attrs.edge === '1',
        parent: attrs.parent || '',
        source: attrs.source || null,
        target: attrs.target || null,
        geo: null, points: [], sourcePoint: null, targetPoint: null,
      };
      const g = /<mxGeometry\b([^>]*?)\/?>/.exec(chunk);
      if (g) {
        const ga = {};
        let gm; const gRe = /([\w-]+)="([^"]*)"/g;
        while ((gm = gRe.exec(g[1])) !== null) ga[gm[1]] = gm[2];
        cell.geo = {
          x: parseFloat(ga.x || '0'), y: parseFloat(ga.y || '0'),
          w: parseFloat(ga.width || '0'), h: parseFloat(ga.height || '0'),
        };
      }
      const pRe = /<mxPoint x="([-\d.]+)" y="([-\d.]+)"(?: as="(\w+)")?\s*\/>/g;
      let p;
      while ((p = pRe.exec(chunk)) !== null) {
        const pt = { x: parseFloat(p[1]), y: parseFloat(p[2]) };
        if (p[3] === 'sourcePoint') cell.sourcePoint = pt;
        else if (p[3] === 'targetPoint') cell.targetPoint = pt;
        else if (!p[3]) cell.points.push(pt);
      }
      cells.push(cell);
    }
    const page = { w: 0, h: 0 };
    const pg = /<mxGraphModel\b[^>]*pageWidth="(\d+)"[^>]*pageHeight="(\d+)"/.exec(body);
    if (pg) { page.w = parseInt(pg[1], 10); page.h = parseInt(pg[2], 10); }
    pages.push({ name: nameM ? decodeEntities(nameM[1]) : `strona ${pages.length + 1}`, cells, page });
  }
  return pages;
}

function rectsIntersect(A, B, tol) {
  const ix = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
  const iy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
  if (ix > tol && iy > tol) return { ix: Math.round(ix), iy: Math.round(iy) };
  return null;
}

function contains(outer, inner, slack) {
  return inner.x >= outer.x - slack && inner.y >= outer.y - slack &&
    inner.x + inner.w <= outer.x + outer.w + slack &&
    inner.y + inner.h <= outer.y + outer.h + slack;
}

function isAncestor(byId, ancestorId, cellId) {
  let cur = byId.get(cellId);
  let guard = 0;
  while (cur && guard++ < 50) {
    if (cur.parent === ancestorId) return true;
    cur = byId.get(cur.parent);
  }
  return false;
}

function analyzePage(pageObj, issues) {
  const { cells, page } = pageObj;
  const byId = new Map(cells.map(c => [c.id, c]));
  const parentIds = new Set(cells.map(c => c.parent));

  // absolutne współrzędne (łańcuch parentów-kontenerów)
  function absRect(c) {
    if (!c.geo) return null;
    let x = c.geo.x, y = c.geo.y;
    let cur = byId.get(c.parent);
    let guard = 0;
    while (cur && cur.geo && cur.isVertex && guard++ < 50) {
      x += cur.geo.x; y += cur.geo.y;
      cur = byId.get(cur.parent);
    }
    return { x, y, w: c.geo.w, h: c.geo.h };
  }

  const labels = [];      // {id, rect, text, approx}
  const solids = [];      // węzły, aktorzy, notatki
  const containers = [];  // subgraph FE/BE (container=1) + ramki alt/opt
  const panels = [];      // panele tekstowe z tłem

  for (const c of cells) {
    if (!c.id || c.id === '0' || c.id === '1') continue;
    const sm = c.styleMap;
    const fs_ = parseInt(sm.fontSize || '12', 10);
    const bold = sm.fontStyle === '1' || /<b>/.test(c.value);

    if (c.isVertex && c.geo) {
      const rect = absRect(c);
      const isText = (c.style || '').startsWith('text;');
      const isContainer = sm.container === '1' || parentIds.has(c.id);
      const isFrame = sm.fillColor === 'none' || !!sm.dashPattern;
      if (isContainer || isFrame) {
        containers.push({ id: c.id, rect, value: c.value, fontSize: fs_, bold, cell: c });
      } else if (isText && sm.fillColor) {
        panels.push({ id: c.id, rect, value: c.value, fontSize: fs_, cell: c });
      } else if (isText) {
        const lines = stripHtml(c.value);
        const tb = textBox(lines, fs_, bold);
        // realny obszar tekstu wewnątrz geometrii wg wyrównania
        let x = rect.x;
        if (sm.align === 'center' || !sm.align) x = rect.x + Math.max(0, (rect.w - tb.w) / 2);
        const w = Math.min(Math.max(tb.w, 10), Math.max(rect.w, tb.w));
        const y = rect.y + Math.max(0, (rect.h - tb.h) / 2);
        labels.push({ id: c.id, rect: { x, y, w, h: tb.h }, text: lines.join(' | '), approx: false, parent: c.parent });
      } else {
        solids.push({ id: c.id, rect, value: c.value, cell: c });
      }
    }

    if (c.isEdge && c.value && c.value.trim()) {
      const lines = stripHtml(c.value);
      const tb = textBox(lines, fs_, bold);
      let anchor = null, approx = false;
      if (c.sourcePoint && c.targetPoint) {
        const pts = [c.sourcePoint, ...c.points, c.targetPoint];
        let total = 0; const segs = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const L = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
          segs.push(L); total += L;
        }
        let half = total / 2;
        anchor = { x: pts[0].x, y: pts[0].y };
        for (let i = 0; i < segs.length; i++) {
          if (half <= segs[i]) {
            const t = segs[i] === 0 ? 0 : half / segs[i];
            anchor = { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t };
            break;
          }
          half -= segs[i];
        }
      } else if (c.source && c.target && byId.has(c.source) && byId.has(c.target)) {
        const sr = absRect(byId.get(c.source));
        const tr = absRect(byId.get(c.target));
        if (sr && tr) {
          const sm2 = c.styleMap;
          const sx = sm2.exitX !== undefined ? sr.x + sr.w * parseFloat(sm2.exitX) : sr.x + sr.w / 2;
          const sy = sm2.exitY !== undefined ? sr.y + sr.h * parseFloat(sm2.exitY) : sr.y + sr.h / 2;
          const tx = sm2.entryX !== undefined ? tr.x + tr.w * parseFloat(sm2.entryX) : tr.x + tr.w / 2;
          const ty = sm2.entryY !== undefined ? tr.y + tr.h * parseFloat(sm2.entryY) : tr.y + tr.h / 2;
          anchor = { x: (sx + tx) / 2, y: (sy + ty) / 2 };
          approx = true; // routing ortogonalny może przesunąć etykietę
        }
      }
      if (anchor) {
        labels.push({
          id: c.id,
          rect: { x: anchor.x - tb.w / 2, y: anchor.y - tb.h / 2, w: tb.w, h: tb.h },
          text: lines.join(' | '), approx,
          srcRef: c.source, tgtRef: c.target,
        });
      }
    }
  }

  const fmt = r => `(${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}x${Math.round(r.h)})`;
  const tolFor = (a, b) => (a.approx || b.approx) ? 12 : 4;

  // 1) etykieta vs etykieta
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) {
      const ov = rectsIntersect(labels[i].rect, labels[j].rect, tolFor(labels[i], labels[j]));
      if (ov) issues.push({ level: labels[i].approx || labels[j].approx ? 'WARN' : 'ERROR', type: 'label-label',
        msg: `Etykiety nachodzą na siebie: [${labels[i].id}] "${labels[i].text}" ${fmt(labels[i].rect)} vs [${labels[j].id}] "${labels[j].text}" ${fmt(labels[j].rect)} — przecięcie ${ov.ix}x${ov.iy}px` });
    }

  // 2) etykieta vs pełny kształt (pomijając kształty połączone tą krawędzią)
  for (const L of labels)
    for (const S of solids) {
      if (L.srcRef === S.id || L.tgtRef === S.id) continue;
      const ov = rectsIntersect(L.rect, S.rect, L.approx ? 14 : 6);
      if (ov) issues.push({ level: L.approx ? 'WARN' : 'ERROR', type: 'label-shape',
        msg: `Etykieta [${L.id}] "${L.text}" ${fmt(L.rect)} nachodzi na kształt [${S.id}] "${stripHtml(S.value).join(' ').slice(0, 60)}" ${fmt(S.rect)} — przecięcie ${ov.ix}x${ov.iy}px` });
    }

  // 3) kształt vs kształt
  for (let i = 0; i < solids.length; i++)
    for (let j = i + 1; j < solids.length; j++) {
      const A = solids[i].rect, B = solids[j].rect;
      if (contains(A, B, 2) || contains(B, A, 2)) continue;
      const ov = rectsIntersect(A, B, 4);
      if (ov) issues.push({ level: 'ERROR', type: 'shape-shape',
        msg: `Kształty nachodzą na siebie: [${solids[i].id}] "${stripHtml(solids[i].value).join(' ').slice(0, 40)}" ${fmt(A)} vs [${solids[j].id}] "${stripHtml(solids[j].value).join(' ').slice(0, 40)}" ${fmt(B)} — przecięcie ${ov.ix}x${ov.iy}px` });
    }

  // 4) dziecko wystaje poza kontener
  for (const C of containers) {
    if (C.cell.styleMap.container !== '1') continue;
    for (const S of solids) {
      if (!isAncestor(byId, C.id, S.id)) continue;
      if (!contains(C.rect, S.rect, 4)) issues.push({ level: 'ERROR', type: 'child-outside',
        msg: `Kształt [${S.id}] ${fmt(S.rect)} wystaje poza kontener [${C.id}] "${stripHtml(C.value).join(' ')}" ${fmt(C.rect)}` });
    }
  }

  // 5) tytuł ramki/kontenera vs zawartość
  for (const F of containers) {
    if (!F.value) continue;
    const lines = stripHtml(F.value);
    const tb = textBox(lines, F.fontSize, F.bold);
    const centered = F.cell.styleMap.align !== 'left';
    const tx = centered ? F.rect.x + Math.max(0, (F.rect.w - tb.w) / 2) : F.rect.x + 4;
    const titleRect = { x: tx, y: F.rect.y + 2, w: tb.w, h: Math.max(tb.h, 18) };
    for (const L of labels) {
      const ov = rectsIntersect(titleRect, L.rect, L.approx ? 10 : 3);
      if (ov) issues.push({ level: L.approx ? 'WARN' : 'ERROR', type: 'frame-title',
        msg: `Tytuł ramki [${F.id}] "${lines.join(' ')}" koliduje z etykietą [${L.id}] "${L.text}" ${fmt(L.rect)} — przecięcie ${ov.ix}x${ov.iy}px` });
    }
    for (const S of solids) {
      const ov = rectsIntersect(titleRect, S.rect, 3);
      if (ov) issues.push({ level: 'ERROR', type: 'frame-title',
        msg: `Tytuł ramki [${F.id}] "${lines.join(' ')}" koliduje z kształtem [${S.id}] ${fmt(S.rect)}` });
    }
  }

  // 6) przepełnienie paneli
  for (const P of panels) {
    const rows = (P.value.match(/<tr/gi) || []).length;
    let contentH;
    if (rows > 0) contentH = 60 + rows * 27;
    else {
      const plain = stripHtml(P.value).join(' ');
      const charW = P.fontSize * 0.58;
      const perLine = Math.max(1, Math.floor((P.rect.w - 20) / charW));
      contentH = 40 + Math.ceil(plain.length / perLine) * P.fontSize * 1.45;
    }
    if (contentH > P.rect.h + 10) {
      const overflowFill = /overflow=fill/.test(P.cell.style);
      issues.push({ level: overflowFill ? 'WARN' : 'ERROR', type: 'panel-overflow',
        msg: `Panel [${P.id}] ma ~${Math.round(contentH)}px treści przy wysokości ${Math.round(P.rect.h)}px${overflowFill ? ' (overflow=fill — sprawdź wzrokowo)' : ' — treść wyleje się poza box'}` });
    }
  }

  // 7) panel vs panel / panel vs kształt
  const allBoxes = [...panels.map(p => ({ id: p.id, rect: p.rect })), ...solids.map(s => ({ id: s.id, rect: s.rect }))];
  for (const P of panels)
    for (const B of allBoxes) {
      if (B.id === P.id) continue;
      if (contains(P.rect, B.rect, 2) || contains(B.rect, P.rect, 2)) continue;
      const ov = rectsIntersect(P.rect, B.rect, 4);
      if (ov) issues.push({ level: 'ERROR', type: 'panel-overlap',
        msg: `Panel [${P.id}] ${fmt(P.rect)} nachodzi na [${B.id}] ${fmt(B.rect)} — przecięcie ${ov.ix}x${ov.iy}px` });
    }

  // 8) poza stroną
  if (page.w > 0) {
    for (const B of [...labels, ...solids, ...panels, ...containers]) {
      if (B.rect.x < 0 || B.rect.y < 0 || B.rect.x + B.rect.w > page.w + 20 || B.rect.y + B.rect.h > page.h + 20)
        issues.push({ level: 'WARN', type: 'out-of-page',
          msg: `[${B.id}] ${fmt(B.rect)} wystaje poza stronę ${page.w}x${page.h}` });
    }
  }
}

function analyze(file) {
  let pages;
  try { pages = parsePages(file); }
  catch (e) { return { file, fatal: 'Nie mogę sparsować: ' + e.message, issues: [] }; }
  if (pages.length === 0) return { file, fatal: 'Brak stron <diagram> w pliku', issues: [] };
  const issues = [];
  for (const pg of pages) {
    const pageIssues = [];
    analyzePage(pg, pageIssues);
    for (const i of pageIssues) issues.push({ ...i, msg: (pages.length > 1 ? `[str. "${pg.name}"] ` : '') + i.msg });
  }
  const seen = new Set();
  return { file, issues: issues.filter(i => { if (seen.has(i.msg)) return false; seen.add(i.msg); return true; }) };
}

// --- main ---
let files = process.argv.slice(2);
if (files[0] === '--all') {
  const dir = path.join(__dirname, '..', 'export', 'drawio');
  files = fs.readdirSync(dir).filter(f => f.endsWith('.drawio')).map(f => path.join(dir, f));
}
if (files.length === 0) {
  console.error('Użycie: node check_drawio_overlaps.js <plik.drawio>... | --all');
  process.exit(2);
}
let hasErrors = false, hasFatal = false;
for (const f of files) {
  const res = analyze(f);
  const name = path.basename(f);
  if (res.fatal) { console.log(`\n=== ${name}: FATAL — ${res.fatal}`); hasFatal = true; continue; }
  const errs = res.issues.filter(i => i.level === 'ERROR');
  const warns = res.issues.filter(i => i.level === 'WARN');
  if (res.issues.length === 0) console.log(`=== ${name}: OK (0 kolizji)`);
  else {
    console.log(`\n=== ${name}: ${errs.length} ERROR, ${warns.length} WARN`);
    for (const i of res.issues) console.log(`  [${i.level}] ${i.type}: ${i.msg}`);
  }
  if (errs.length > 0) hasErrors = true;
}
process.exit(hasFatal ? 2 : hasErrors ? 1 : 0);
