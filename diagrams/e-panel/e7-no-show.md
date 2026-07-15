# E7 — No-show (oznaczenie "nie stawił się")

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        SZCZ["Wizyta po terminie (E4/E8)"]
        BTN["Przycisk: nie stawił się"]
        POTW["Potwierdzenie oznaczenia"]
        INFO["Status wizyty: no_show"]
    end

    subgraph BE["BE — pod spodem"]
        STAN["confirmed -> no_show"]
        EVENT["Event visit.no_show"]
        G7L["Scoring G7: licznik no-show"]
        PROG{"Próg sankcji osiągnięty?"}
        SANKCJE["Sankcje progresywne: gate w A5"]
        BRAK["Bez sankcji — tylko licznik"]
        BLOKG4["Blokada auto-approval G4 (Flaga 3)"]
        POWIAD["Powiadomienie pacjenta (G1)"]
        SPOR["Spór: przycisk byłem -> B6/F3"]
    end

    SZCZ --> BTN --> POTW
    POTW --> STAN
    STAN --> INFO
    STAN --> EVENT
    EVENT --> G7L
    EVENT --> BLOKG4
    G7L --> PROG
    PROG -->|tak| SANKCJE
    PROG -->|nie| BRAK
    EVENT --> POWIAD
    POWIAD --> SPOR

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class SZCZ,BTN,POTW,INFO fe
    class STAN,EVENT,G7L,PROG,SANKCJE,BRAK,BLOKG4,POWIAD,SPOR be
```

## Notatki
- Priorytet: P0. Prompt #4 (scoring + anty-abuse).
- Przycisk dostępny przy wizycie po terminie — z listy [[e4-rezerwacje]] (E4) lub listy do potwierdzenia [[e8-approval-opinie]] (E8).
- Event visit.no_show -> scoring G7; sankcje progresywne wg ścieżki E2E: 1. no-show = licznik, 2. no-show = gate przedpłaty (lub akceptacji — Flaga 2) w checkoucie A5. Progi konfigurowane per fork (F8).
- Stan no_show blokuje auto-approval T+48 h (G4) — ⚠️ Flaga 3.
- Pacjent w komunikacie o sankcji dostaje przycisk "byłem/byłam" -> spór [[b6-spor-no-show]] (B6) -> kolejka F3; na czas sporu stan disputed (również blokuje G4).
- Wizyta no_show bez review ask (G3) — opinia nie przysługuje (wizyta się nie odbyła).
- Powiązania: E4, E8, B6, F3, F8, G1, G4, G7, A5, CORE-STANY, Flaga 2, Flaga 3.
