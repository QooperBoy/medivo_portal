# B2 — Moje wizyty

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        WEJSCIE["Zalogowany pacjent — B1"]
        EKRAN["Ekran Moje wizyty"]
        TAB{"Nadchodzące czy historia?"}
        LISTAN["Lista nadchodzących ze statusami"]
        LISTAH["Historia wizyt ze statusami"]
        PUSTY["Pusty stan: brak wizyt"]
        SZCZEGOLY["Szczegóły wizyty"]
        AKCJE["Akcje: zarządzaj B3, opinia B5"]
    end
    subgraph BE["BE — pod spodem"]
        API["bookings API: lista rezerwacji"]
        PODZIAL{"Termin wizyty przyszły?"}
        STATN["confirmed / pending_payment / pending_approval"]
        STATH["completed / no_show / disputed / cancelled_by_patient / cancelled_by_specialist"]
    end
    WEJSCIE --> EKRAN --> TAB
    TAB -->|nadchodzące| API
    TAB -->|historia| API
    API --> PODZIAL
    PODZIAL -->|tak| STATN --> LISTAN
    PODZIAL -->|nie| STATH --> LISTAH
    LISTAN -->|brak wizyt| PUSTY
    LISTAH -->|brak wizyt| PUSTY
    LISTAN --> SZCZEGOLY
    LISTAH --> SZCZEGOLY
    SZCZEGOLY --> AKCJE
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class WEJSCIE,EKRAN,TAB,LISTAN,LISTAH,PUSTY,SZCZEGOLY,AKCJE fe
    class API,PODZIAL,STATN,STATH be
```

## Notatki
- Statusy wyłącznie kanoniczne z CORE-STANY; stany przejściowe draft/locked nie są pokazywane pacjentowi (założenie minimalne — mapa nie rozstrzyga).
- Nadchodzące: confirmed, pending_payment, pending_approval; historia: completed, no_show, disputed, cancelled_by_patient, cancelled_by_specialist.
- Akcje przy wizycie: zarządzanie (zmiana/odwołanie) prowadzi do B3; z historii wystawienie opinii tylko przez token wizyty (B5) — z poziomu konta jako skrót do tego samego formularza (założenie).
- Pusty stan: mapa go nie wymienia dla B2 (wymienia dla A3) — przyjęty jako minimalny standard listy.
- Powiązania: B1, B3, B5, B4 (wpisy waitlisty — otwarte, czy widoczne w Moich wizytach).
