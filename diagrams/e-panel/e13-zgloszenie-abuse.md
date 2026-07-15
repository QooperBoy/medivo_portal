# E13 — Zgłoszenie abuse (blokowanie kalendarza)

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        PODEJRZ["Podejrzane serie rezerwacji"]
        BTN["Zgłoś: podejrzewam blokowanie kalendarza"]
        FORM["Formularz: wskazanie rezerwacji"]
        STATUS["Status zgłoszenia"]
        WYNIK["Wynik: seria anulowana"]
    end

    subgraph BE["BE — pod spodem"]
        TICKET["Ticket -> kolejka F4"]
        G8F["Kontekst: flagi wzorców G8"]
        DEC{"Decyzja admina (F4)"}
        ANUL["Anulowanie serii rezerwacji"]
        BLOK["Blokada sprawcy (F4)"]
        ODRZ["Zgłoszenie odrzucone + powód"]
        SLOTY["Zwolnione sloty wracają do A3/A4"]
    end

    PODEJRZ --> BTN --> FORM --> TICKET
    G8F --> TICKET
    TICKET --> STATUS
    TICKET --> DEC
    DEC -->|zasadne| ANUL
    ANUL --> BLOK
    ANUL --> SLOTY
    ANUL --> WYNIK
    DEC -->|niezasadne| ODRZ --> STATUS

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class PODEJRZ,BTN,FORM,STATUS,WYNIK fe
    class TICKET,G8F,DEC,ANUL,BLOK,ODRZ,SLOTY be
```

## Notatki
- Priorytet: P1. Prompt #4 (scoring + anty-abuse). Ścieżka E2E "sabotaż slotów": seria rezerwacji -> G8 flaga -> F4 -> anulowanie serii -> E13 potwierdza.
- Ticket trafia do kolejki anty-abuse F4 (przegląd IP/device, flagi wzorców z G8 jako kontekst dla admina); decyzja i blokada po stronie F4.
- Stan rezerwacji przy anulowaniu serii przez admina: kanon nie ma anulacji administracyjnej (jest tylko cancelled_by_patient / cancelled_by_specialist) — NIEROZSTRZYGNIĘTE, zgłoszone w rozbieżnościach; w diagramie neutralne "anulowanie serii".
- Zwolnione sloty wracają do dostępności (A3/A4); czy przechodzą przez waitlistę G6 — mapa nie rozstrzyga.
- Powiązania: F4, G8, A3, A4, G6.
