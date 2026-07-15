# A2 — Wyszukiwanie

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        START["Ekran wyszukiwania"]
        POLE["Pole: usługa / specjalista"]
        LOKAL["Miasto / dzielnica"]
        TOGGLE["Toggle: online / stacjonarnie"]
        FILTRY["Filtry: termin, cena, płeć, język"]
        SORT["Sortowanie"]
        SZUKAJ["Klik: Szukaj"]
        OMNIBUS["Strona /jak-dzialaja-wyniki (A9)"]
        WYNIKI["Lista wyników (A3)"]
    end

    subgraph BE["BE — pod spodem"]
        GEO["Geokodowanie miasta/dzielnicy"]
        SEARCH["Search API + indeks"]
        RANK["Ranking wg jawnych reguł"]
    end

    START --> POLE
    START --> LOKAL
    START --> TOGGLE
    POLE --> SZUKAJ
    LOKAL --> SZUKAJ
    TOGGLE --> SZUKAJ
    SZUKAJ --> SEARCH
    LOKAL -.-> GEO
    GEO --> SEARCH
    SEARCH --> RANK
    RANK --> WYNIKI
    FILTRY -->|"zawężenie"| SEARCH
    SORT -->|"zmiana kolejności"| SEARCH
    RANK -.->|"Omnibus: jawność zasad"| OMNIBUS

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class START,POLE,LOKAL,TOGGLE,FILTRY,SORT,SZUKAJ,OMNIBUS,WYNIKI fe
    class GEO,SEARCH,RANK be
```

## Notatki
- Priorytet: P0.
- Filtry z mapy: najbliższy termin, cena, płeć, język; do tego toggle online/stacjonarnie i sortowanie — zmiana filtra/sortowania odpytuje search API ponownie (bez nowego "Szukaj").
- Ranking wg jawnych reguł (Omnibus) — zasady opisane na `/jak-dzialaja-wyniki` → [[a9-strony-statyczne]] (A9); algorytm i wagi: spec S5.
- Geokodowanie: zamiana miasto/dzielnica na współrzędne do liczenia dystansu (wynik używany w A3 na karcie).
- Wyniki → [[a3-lista-wynikow]] (A3). Wybór technologii indeksu (Postgres FTS vs Meilisearch): otwarta decyzja z S5.
