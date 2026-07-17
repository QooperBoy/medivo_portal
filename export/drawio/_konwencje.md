# Konwencje generowania plików draw.io (export/drawio/)

Źródło merytoryczne: plik `.md` diagramu (blok mermaid + sekcje). Treść 1:1 — nie wymyślaj kroków, nie pomijaj gałęzi.

## Plik

- 1 diagram md → 1 plik `export/drawio/{basename}.drawio`, jedna strona:
  `<diagram id="{id-flowu}" name="{ID} — {nazwa}">`.
- Nagłówek mxfile: `host="app.diagrams.net" agent="claude-flows" version="24.0.0"`.
- Wartości komórek HTML-escapowane (`&lt;b&gt;` itd.). Polskie znaki bez zmian.
- **UWAGA:** w atrybucie `value` NIE może wystąpić surowy `<`, `>` ani `"` — zawsze `&lt;` `&gt;` `&quot;` (dotyczy też treści typu „(TTL &lt;10 min)" i cudzysłowów prostych). Naprawa hurtowa: `node scripts/fix_drawio_escapes.js <plik>`.
- `pageWidth`/`pageHeight` tak, by CAŁA zawartość mieściła się z ≥50px marginesu.

## Wspólne style

- Kolory FE: fill `#e8f4fd`, stroke `#2d7dd2`. BE: fill `#fdf2e8`, stroke `#d79b00`.
- Notatki: `shape=note`, fill `#FFF9B2`, stroke `#d6b656`, szerokość ≤380.
- Ramki/kontenery pomocnicze: dashed, stroke `#666666`.
- fontSize: tytuł strony 14, aktorzy/tytuły kontenerów 13, komunikaty/węzły 11, etykiety krawędzi flowchart 10–11.
- Tytuł strony: komórka `text` u góry — pogrubiona nazwa + `źródło: diagrams/...md`.

## Panele dolne (obowiązkowe, pod diagramem)

Kolejno, odstęp ≥30px, szerokość = szerokość diagramu:
1. **Co opisuje ten diagram** — akapit z md.
2. **Powiązane diagramy** — tabela HTML z md (ID | Plik | Jak się łączy).
3. **Słownik** — tabela HTML z md (Pojęcie | Wyjaśnienie).

Styl paneli: `text;html=1;align=left;verticalAlign=top;spacing=8;fillColor=#f5f5f5;strokeColor=#666666;rounded=1;overflow=fill;`
Wysokość panelu z tabelą: **min. 60 + 27px na wiersz tabeli**.

## Diagram sekwencji (złoty wzorzec: `a5-checkout.drawio`)

- Linie życia co **290px**, pierwsza na x=140. Tylko aktorzy występujący w md, kolejność jak w md.
- Aktorzy: boxy 160×40 na y=80. Osoby (Pacjent/Specjalista/Admin) = kolor FE, systemy (FE/Backend/Joby/SMS-Email/Płatności) = kolor BE.
- Linie życia: dashed, `#999999`, od y=120 do końca sekwencji.
- Komunikaty co **55px**. Sync: `endArrow=block;endFill=1`. Return: `dashed=1;endArrow=open;endFill=0`. Zawsze `labelBackgroundColor=#ffffff;fontSize=11`.
- Etykieta ≤44 znaków w jednej linii; dłuższa → złam `<br>` na 2 linie i dodaj +15px odstępu pod spodem.
- Self-loop (komunikat do samego siebie): waypointy x+70, wysokość 25px, etykieta jednoliniowa.
- Numeracja komunikatów = autonumber z mermaid („1: …", „2: …").
- Ramki `alt`/`opt`: dashed `#666666`, tytuł bold 11 (`verticalAlign=top;align=left`); pierwszy komunikat ≥40px pod górną krawędzią ramki; sekcja `[else]` = pozioma dashed linia przez całą ramkę + bold tekst „[else] …" tuż pod nią; ramka obejmuje w poziomie tylko uczestników, których dotyczy (+20px marginesu).

## Flowchart TD (złoty wzorzec: `f1-kolejka-weryfikacji-pwz.drawio`)

- Dwa kontenery: `FE — widzi user` (`container=1;collapsible=0;verticalAlign=top`, kolor FE) i `BE — pod spodem` (kolor BE), obok siebie.
- Węzły: fill `#ffffff`, stroke w kolorze kontenera, `rounded=1;whiteSpace=wrap`, szer. 180–220, wys. 40–60. Decyzje: `rhombus`, 160×80.
- Współrzędne dzieci kontenera są WZGLĘDNE względem kontenera. Dziecko nie może wystawać poza kontener (checker to łapie).
- Odstęp pionowy między węzłami ≥50px; kontener ma zapas ≥30px pod tytułem.
- Krawędzie: `edgeStyle=orthogonalEdgeStyle;rounded=1` + `exitX/exitY/entryX/entryY`; etykiety ≤30 znaków.

## Diagram stanów (złoty wzorzec: `00-stany-rezerwacji.drawio`)

Stany jak w wzorcu (zaokrąglone boxy z nazwą stanu + opisem), przejścia z etykietami; start/koniec jako kropki. Etykiety przejść ≤60 znaków, nie mogą kolidować z sąsiednimi (sprawdź checkerem).

## Flowchart LR / katalog eventów / E2E (złoty wzorzec: `e2e-1-pacjent-nowy.drawio`)

Węzły = ID flowów lub eventy, przepływ lewo→prawo, legenda pod diagramem (legenda nie może być szersza niż strona).

## Walidacja (obowiązkowa po każdym pliku)

1. `node scripts/check_drawio_overlaps.js "export/drawio/{plik}.drawio"` — **wszystkie ERROR muszą zniknąć** (max 4 iteracje poprawek). WARN oceń: approx-etykiety i overflow=fill mogą zostać, out-of-page → powiększ stronę.
2. Poprawność XML: `powershell "[xml](Get-Content -Raw 'export/drawio/{plik}.drawio') | Out-Null"`.
