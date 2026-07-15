# E1 — Dashboard specjalisty

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        DASH["Dashboard specjalisty"]
        DZIS["Dzisiejsze wizyty"]
        NOWE["Nowe rezerwacje"]
        ALERTY["Alerty"]
        ASPOR["Alert: spory (F3)"]
        AOPIN["Alert: nowe opinie (E8)"]
        ASUB["Alert: status subskrypcji (E12)"]
        E4LINK["Szczegóły -> Rezerwacje (E4)"]
        PEND["Prośby o akceptację (E4)"]
    end

    subgraph BE["BE — pod spodem"]
        AGR["Agregacje dashboardu"]
        BOOK["Bookings API (E4)"]
        REV["Pipeline opinii (E8/F2)"]
        SPORY["Spory (B6/F3)"]
        BILL["Billing engine (E12)"]
    end

    BOOK --> AGR
    REV --> AGR
    SPORY --> AGR
    BILL --> AGR
    AGR --> DASH
    DASH --> DZIS
    DASH --> NOWE
    DASH --> ALERTY
    ALERTY --> ASPOR
    ALERTY --> AOPIN
    ALERTY --> ASUB
    DZIS --> E4LINK
    NOWE --> E4LINK
    NOWE --> PEND

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class DASH,DZIS,NOWE,ALERTY,ASPOR,AOPIN,ASUB,E4LINK,PEND fe
    class AGR,BOOK,REV,SPORY,BILL be
```

## Notatki
- Priorytet: P0. Spec: S2 (panel specjalisty).
- Ekran startowy panelu: dzisiejsze wizyty i nowe rezerwacje prowadzą do [[e4-rezerwacje]] (E4); wśród nowych rezerwacji wyróżnione prośby o akceptację (pending_approval — wariant A5).
- Alerty agregują: spory (B6/F3), nowe opinie do odpowiedzi ([[e8-approval-opinie]], E8), status subskrypcji / licznik free ([[e12-subskrypcja-billing]], E12).
- BE = agregacje z istniejących źródeł (bookings, opinie, spory, billing) — bez własnych encji; założenie minimalne.
- Powiązania: E4, E8, E12, B6, F2, F3.
