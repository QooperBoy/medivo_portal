# E9 — Eksport .ics (feed kalendarza)

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        EKRAN["Ekran eksportu kalendarza"]
        GENER["Generuj URL feedu"]
        URLBOX["Tokenizowany URL do skopiowania"]
        INSTR["Instrukcja: Google / Apple"]
        REGEN["Unieważnij / nowy token"]
        KAL["Kalendarz Google/Apple specjalisty"]
    end

    subgraph BE["BE — pod spodem"]
        TOKEN["Token feedu per specjalista"]
        FEED["Endpoint feedu (GET po tokenie)"]
        GENICS["Generator .ics"]
        BOOK["Rezerwacje z bookings API (E4)"]
    end

    EKRAN --> GENER --> TOKEN
    TOKEN --> URLBOX --> INSTR
    EKRAN --> REGEN --> TOKEN
    KAL -->|"cykliczne pobranie"| FEED
    FEED --> GENICS
    BOOK --> GENICS
    GENICS -->|"plik .ics"| KAL

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class EKRAN,GENER,URLBOX,INSTR,REGEN,KAL fe
    class TOKEN,FEED,GENICS,BOOK be
```

## Notatki
- Priorytet: P0. Prompt #3 (kalendarz i integracje).
- Jednokierunkowy feed read-only: kalendarz Google/Apple subskrybuje tokenizowany URL i cyklicznie pobiera .ics z wizytami specjalisty (bookings E4); sync dwukierunkowy to osobny silnik G10 (P1/P2).
- Token w URL = jedyna autoryzacja feedu (bez logowania kalendarza) — założenie minimalne: możliwość unieważnienia i wygenerowania nowego tokenu (wyciek URL-a); mapa tego nie rozstrzyga, zgłoszone w rozbieżnościach.
- Węzeł "Kalendarz Google/Apple" umieszczony w FE jako element widoczny dla specjalisty (zewnętrzna aplikacja).
- Zakres danych w .ics: minimalizacja (termin, usługa, inicjały pacjenta?) — nierozstrzygnięte, do speca #3.
- Powiązania: E2, E4, G10.
