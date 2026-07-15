# F6 — Billing admin

```mermaid
flowchart TD
    subgraph FE["FE — widzi admin"]
        LISTA["Lista subskrypcji"]
        SZCZEGOLY["Plan, status, licznik free"]
        FAKTURY["Faktury VAT"]
        WINDYKACJA["Kolejka windykacji: zaległości"]
        TIMER["TIMER: terminy płatności"]
        AKCJA{"Akcja"}
        MONIT["Wyślij monit"]
        ESKALACJA["Eskalacja windykacji (skutek otwarty)"]
    end

    subgraph BE["BE — pod spodem"]
        ENGINE["Billing engine (E12)"]
        INVOICE["Generator faktur VAT"]
        DUNNING["Dunning job: wykrywa zaległości"]
        MSGS["Monity email (G1)"]
        ALERT["Status subskrypcji → alert E1"]
        AUDYT["Zapis akcji + audyt (F10)"]
    end

    ENGINE --> LISTA
    LISTA --> SZCZEGOLY
    ENGINE --> INVOICE
    INVOICE --> FAKTURY
    DUNNING --> TIMER
    DUNNING --> WINDYKACJA
    WINDYKACJA --> AKCJA
    AKCJA -->|"monit"| MONIT
    AKCJA -->|"eskalacja"| ESKALACJA
    MONIT --> MSGS
    DUNNING --> ALERT
    MONIT --> AUDYT
    ESKALACJA --> AUDYT

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class LISTA,SZCZEGOLY,FAKTURY,WINDYKACJA,TIMER,AKCJA,MONIT,ESKALACJA fe
    class ENGINE,INVOICE,DUNNING,MSGS,ALERT,AUDYT be
```

## Notatki
- Priorytet: P1 (spójne z E12: billing P1, widoczność licznika free P0).
- Zakres z mapy: subskrypcje, faktury, windykacja — po stronie specjalisty odpowiada temu [[E12]] (plan, metoda płatności, faktury, licznik „free do DD.MM od dnia 1").
- Windykacja: dunning job wykrywa zaległości (timer terminów płatności), admin wysyła monity (G1); status subskrypcji podbija alert na dashboardzie specjalisty (E1).
- Rozbieżność/otwarte: mapa nie definiuje skutku nieskutecznej windykacji (zawieszenie konta? ukrycie profilu?) — węzeł „eskalacja (skutek otwarty)", decyzja do promptu #2 (model subskrypcji).
- Założenie minimalne: brak w mapie korekt/anulowania faktur przez admina — nie dodano.
- Akcje admina w audycie F10.
- Powiązania: E12, E1, C2, G1, F10, prompt #2.
