# C1 — Landing /dla-specjalistow

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        WEJSCIE["wejście: /dla-specjalistow"] --> HERO["value prop dla specjalisty"]
        HERO --> OFERTA["oferta: 0 zł przez 6 mies."]
        OFERTA --> OFERTA2["potem od X zł/mies."]
        OFERTA2 --> SOCIAL["social proof"]
        SOCIAL --> FAQ["FAQ"]
        FAQ --> DEC{"co dalej?"}
        DEC -->|załóż konto| CTA["CTA: rejestracja"]
        DEC -->|szczegóły oferty| LINKCENNIK["link: cennik B2B"]
        DEC -->|wyjście| EXIT["opuszcza stronę"]
        CTA --> DOC3["rejestracja — C3"]
        LINKCENNIK --> DOC2["cennik — C2"]
    end
    subgraph BE["BE — pod spodem"]
        STATIC["strona statyczna — brak API"]
    end
    WEJSCIE -.-> STATIC
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class WEJSCIE,HERO,OFERTA,OFERTA2,SOCIAL,FAQ,DEC,CTA,LINKCENNIK,EXIT,DOC3,DOC2 fe
    class STATIC be
```

## Notatki
- Elementy FE wg mapy: value prop, oferta „0 zł przez 6 mies., potem od X zł/mies.", social proof, FAQ. Kolejność sekcji na stronie — założenie minimalne (mapa nie rozstrzyga układu).
- BE wg mapy: brak („—"). Subgraph BE zawiera jeden węzeł informacyjny „strona statyczna — brak API", żeby spełnić konwencję FE/BE z CLAUDE.md; hosting treści: P0 hardcode → P1 CMS (F7).
- CTA → [[c3-rejestracja]] wynika ze ścieżki E2E „Specjalista: od landing do 1. rezerwacji" (C1 → C3).
- Link do cennika → [[c2-cennik-b2b]] — założenie minimalne: landing linkuje do cennika B2B (spójna nawigacja B2B).
- Wartość „X zł/mies." nieustalona — model subskrypcji do rozstrzygnięcia w prompcie #2 (C2, E12, F6).
- Powiązania: C2, C3, F7; dalszy ciąg ścieżki: D1 → D2 → D3 → E2/E3.
