# A7 — Potwierdzenie rezerwacji

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        WEJSCIE["Rezerwacja confirmed (A5/A6)"]
        SUKCES["Ekran sukcesu"]
        ICSFE["Pobranie .ics do kalendarza"]
        EMAIL["Email: potwierdzenie + .ics"]
        SMS["SMS: link zarządzania (token)"]
        B3LINK["Zmiana/odwołanie tokenem (B3)"]
    end

    subgraph BE["BE — pod spodem"]
        TOKENY["Generacja tokenów samoobsługi"]
        ICSGEN["Generator pliku .ics"]
        ENQUEUE["Enqueue G1 (powiadomienia)"]
    end

    WEJSCIE --> SUKCES
    WEJSCIE --> TOKENY
    TOKENY --> ENQUEUE
    ICSGEN --> ENQUEUE
    ICSGEN --> ICSFE
    SUKCES --> ICSFE
    ENQUEUE --> EMAIL
    ENQUEUE --> SMS
    SMS -->|"klik w link"| B3LINK
    EMAIL -->|"klik w link"| B3LINK

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class WEJSCIE,SUKCES,ICSFE,EMAIL,SMS,B3LINK fe
    class TOKENY,ICSGEN,ENQUEUE be
```

## Notatki
- Priorytet: P0.
- Wejście: rezerwacja w stanie kanonicznym `confirmed` — z A5 (płatność na miejscu / po akceptacji specjalisty) lub z A6 (płatność online). Flaga 2 (płatności online w POC) pozostaje OTWARTA — oba warianty dojścia do `confirmed` są dokumentowane (decyzja użytkownika 2026-07-15); szczegóły w [[a5-checkout]] / [[a6-platnosc-online]].
- Token samoobsługi w SMS/email → [[b3-odwolanie-tokenem]] (B3); parametry tokenu (TTL, single-use) — otwarta decyzja z S1.
- Założenie (minimalne): `.ics` jest załącznikiem emaila i do pobrania z ekranu sukcesu — mapa nie precyzuje kanału dystrybucji.
- Enqueue G1 (notification engine) wysyła email+SMS; dalej harmonogram przypomnień G2 (T−24 h).
