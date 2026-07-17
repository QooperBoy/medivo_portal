#!/usr/bin/env node
/**
 * fix_drawio_escapes.js — naprawia niezescape'owane znaki <, >, ", & wewnątrz
 * atrybutu value="..." w plikach .drawio. Granicą wartości jest sekwencja
 * `" style="` (kolejny atrybut mxCell), więc surowe cudzysłowy w treści
 * też zostają poprawnie objęte.
 *
 * Użycie: node fix_drawio_escapes.js <plik.drawio>...
 */
const fs = require('fs');

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  let changed = 0;
  const out = src.replace(/value="([\s\S]*?)" style="/g, (m, val) => {
    const fixed = val
      .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    if (fixed !== val) changed++;
    return `value="${fixed}" style="`;
  });
  if (changed > 0) fs.writeFileSync(file, out, 'utf8');
  console.log(`${file}: ${changed > 0 ? `poprawiono ${changed} wartości` : 'bez zmian'}`);
}
