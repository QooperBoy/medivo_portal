# F2 — Moderacja opinii

```mermaid
flowchart TD
    subgraph FE["FE — widzi admin"]
        KOLEJKA["Kolejka moderacji opinii"]
        TIMER["TIMER SLA kolejki (wartość otwarta)"]
        WFLAGI["Widok: auto-flagi (priorytet)"]
        WCALOSC["Widok: całość opinii"]
        SZCZEGOLY["Opinia + kontekst wizyty"]
        DECYZJA{"Decyzja"}
        ZATWIERDZ["Zatwierdź"]
        ODRZUC["Odrzuć + powód"]
        HISTORIA["Historia decyzji"]
    end

    subgraph BE["BE — pod spodem"]
        NOWA["Nowa opinia z tokenu (B5)"]
        AUTOFILTR["Auto-filtr treści"]
        PUBLIKACJA["Publikacja na profilu (A4)"]
        STATUS["Status moderacji dla pacjenta (B5)"]
        ODPOWIEDZ["Odpowiedź specjalisty (E8)"]
        AUDYT["Zapis decyzji + audyt (F10)"]
    end

    NOWA --> AUTOFILTR
    AUTOFILTR -->|"flaga"| WFLAGI
    AUTOFILTR -->|"czysta"| WCALOSC
    WFLAGI --> KOLEJKA
    WCALOSC --> KOLEJKA
    KOLEJKA --> TIMER
    KOLEJKA --> SZCZEGOLY
    SZCZEGOLY --> DECYZJA
    DECYZJA -->|"zatwierdź"| ZATWIERDZ
    DECYZJA -->|"odrzuć"| ODRZUC
    ZATWIERDZ --> PUBLIKACJA
    ODRZUC --> STATUS
    PUBLIKACJA --> STATUS
    PUBLIKACJA --> ODPOWIEDZ
    ZATWIERDZ --> HISTORIA
    ODRZUC --> HISTORIA
    HISTORIA --> AUDYT

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class KOLEJKA,TIMER,WFLAGI,WCALOSC,SZCZEGOLY,DECYZJA,ZATWIERDZ,ODRZUC,HISTORIA fe
    class NOWA,AUTOFILTR,PUBLIKACJA,STATUS,ODPOWIEDZ,AUDYT be
```

## Notatki
- Priorytet: P0.
- Interpretacja mapy „kolejka (auto-flagi + całość)": założenie minimalne — 100% opinii przechodzi przez moderację, auto-flagi z auto-filtra tylko priorytetyzują widok (podejrzane na wierzch).
- SLA kolejki: mapa nie podaje wartości (24 h robocze zdefiniowane tylko dla F1) — timer zaznaczony, wartość otwarta (do S3).
- Decyzja zawsze z powodem przy odrzuceniu; pacjent widzi status moderacji w [[b5-wystawienie-opinii]] (B5).
- Zatwierdzona opinia → profil A4 (badge wiarygodności) i możliwa odpowiedź specjalisty w E8.
- Opinia zakwestionowana przez specjalistę po publikacji → spór w [[f3-spory]] (F3).
- Historia decyzji widoczna w module; każdy wpis także w audycie F10.
- Powiązania: B5, E8, A4, F3, F10, G3/G4 (pipeline opinii), prompt #1.
