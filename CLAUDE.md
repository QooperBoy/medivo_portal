# Projekt: diagramy flow marketplace'u rezerwacji (logopedzi, PL)

## Źródło prawdy
`mapa-flows-inwentarz-v1.md` — ID flowów (A1…G13), kolumny FE/BE, priorytety.
Kontekst biznesowy: `architektura-v2.md`. NIE wymyślaj flowów spoza mapy;
rozbieżności/braki wpisuj do `diagrams/_rozbieznosci.md`, nie naprawiaj po cichu.

## Konwencje plików
- 1 flow = 1 plik `.md` w podfolderze grupy, nazwa: `{id}-{slug}.md` (np. `a5-checkout.md`)
- Struktura pliku: nagłówek H1 z ID i nazwą → 1 blok ```mermaid → "Notatki"
  (założenia, edge case'y) → "Co opisuje ten diagram" → "Aktorzy w tym flow"
  (tabela: Rola | Kto to jest | Co robi w tym flow) → "Objaśnienie bloków"
  (dla sequence: "Objaśnienie kroków" wg autonumeracji; tabela wyjaśniająca
  KAŻDY blok/krok prostym językiem) → "Powiązane diagramy" → "Słownik"
- Język diagramów: polski. Etykiety JEDNOZNACZNE — jasność ważniejsza niż
  zwięzłość, bez skrótowców. Każde pojęcie/skrót z diagramu musi mieć
  wyjaśnienie w "Objaśnieniu bloków" lub "Słowniku".
  Wzorzec pełnej struktury: `diagrams/00-core/00-stany-rezerwacji.md`

## Typy diagramów (dobór wg charakteru flow)
- Cykl życia stanów (rezerwacja, weryfikacja specjalisty): stateDiagram-v2
- Interakcje wieloaktorowe / async / timery (checkout, odwołania, waitlista,
  pipeline opinii, weryfikacja): sequenceDiagram z autonumber
- Nawigacja ekranowa / decyzje (SEO→wyniki→profil, panele, kolejki admina):
  flowchart TD z subgraph FE / subgraph BE
- Katalog eventów (grupa G): flowchart LR (publisher → event → konsumenci)
- E2E: flowchart LR z węzłami = ID flowów, linkujące [[pliki]]

## Aktorzy w sequenceDiagram (stałe nazwy)
actor P as Pacjent · participant FE as FE · participant API as Backend ·
participant Q as Joby/Kolejka · actor S as Specjalista · actor ADM as Admin ·
participant MSG as SMS/Email · participant PAY as Procesor płatności

## Rozdział FE/BE (wymóg z zadania)
- flowchart: zawsze subgraph FE["FE — widzi user"] i subgraph BE["BE — pod spodem"]
- sequenceDiagram: FE/API/Q/MSG/PAY jako osobni uczestnicy załatwiają rozdział
- classDef fe fill:#e8f4fd; classDef be fill:#fdf2e8; (stosuj konsekwentnie w flowchart)

## Stany rezerwacji (kanoniczne — używaj wszędzie tych nazw)
draft → locked (TTL 10 min) → pending_payment | pending_approval → confirmed
→ completed | cancelled_by_patient | cancelled_by_specialist | no_show | disputed
Sankcje/scoring: eventy booking.cancelled_late, visit.no_show → G7.

## Walidacja (obowiązkowa po każdym pliku)
mmdc -i {plik}.md -o export/svg/{id}.svg   # błąd składni = popraw, max 3 iteracje
Jeśli lokalna wersja mmdc nie przyjmuje .md: wyodrębnij blok mermaid do tmp.mmd i waliduj go.

## Definition of done (per plik)
[ ] renderuje bez błędu mmdc  [ ] FE/BE rozdzielone  [ ] każdy krok z mapy pokryty
[ ] edge case'y z mapy zaznaczone (alt/else lub węzły decyzyjne)
[ ] wpis w _index.md  [ ] odwołania do innych flowów przez ID
