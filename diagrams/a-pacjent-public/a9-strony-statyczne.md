# A9 — Strony statyczne

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        NAV["Nawigacja / stopka"]
        CENNIK["/cennik"]
        JAK["/jak-dzialaja-wyniki"]
        REGULAMIN["/regulamin"]
        PRYWATNOSC["/prywatnosc"]
        POMOC["/pomoc"]
    end

    subgraph BE["BE — pod spodem"]
        ZRODLO{"Źródło treści"}
        HARDCODE["Hardcode w repo (start)"]
        CMS["CMS (F7, później)"]
        RENDER["Render treści statycznych"]
    end

    ZRODLO -->|"P0"| HARDCODE
    ZRODLO -->|"P1"| CMS
    HARDCODE --> RENDER
    CMS --> RENDER
    RENDER --> CENNIK
    RENDER --> JAK
    RENDER --> REGULAMIN
    RENDER --> PRYWATNOSC
    RENDER --> POMOC
    NAV --> CENNIK
    NAV --> JAK
    NAV --> REGULAMIN
    NAV --> PRYWATNOSC
    NAV --> POMOC

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class NAV,CENNIK,JAK,REGULAMIN,PRYWATNOSC,POMOC fe
    class ZRODLO,HARDCODE,CMS,RENDER be
```

## Notatki
- Priorytet: P0 (treści hardcode na start; UI CMS to F7 w P1).
- `/jak-dzialaja-wyniki` — wymóg Omnibus, linkowana z wyszukiwania → [[a2-wyszukiwanie]] (A2); treść zasad rankingu: spec S5.
- `/regulamin` i `/prywatnosc` — podstawa prawna zgód z checkoutu (A5) i RODO self-service (B9).
- `/pomoc` — m.in. jak odwołać/zmienić wizytę (B3) i zasady waitlisty (B4).
- `/cennik` — założenie: cennik dla pacjentów (serwis bezpłatny?); cennik B2B dla specjalistów to osobno C2 — mapa nie precyzuje zawartości `/cennik`, do potwierdzenia.
