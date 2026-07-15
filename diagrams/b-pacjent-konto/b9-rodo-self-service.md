# B9 — RODO self-service

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        USTAW["Ustawienia konta: sekcja RODO"]
        AKCJA{"Eksport / usunięcie / zgody?"}
        EKSPORT["Żądanie eksportu danych"]
        LINKP["Link do pobrania paczki"]
        USUN["Żądanie usunięcia konta"]
        REAUTH["Potwierdzenie OTP — B1"]
        ODMOWA["Komunikat: aktywne rezerwacje"]
        USUNIETE["Potwierdzenie: konto usunięte"]
        ZGODY["Lista zgód: przegląd, zmiana"]
        ZAPISANO["Potwierdzenie zapisu zgód"]
    end
    subgraph BE["BE — pod spodem"]
        EXPORTJOB["Job: paczka danych"]
        AKTYWNE{"Aktywne rezerwacje?"}
        ERASURE["Erasure job — G11"]
        REJESTR["Rejestr zgód — G11"]
        AUDIT["Audit log — F10"]
    end
    USTAW --> AKCJA
    AKCJA -->|eksport| EKSPORT --> EXPORTJOB --> LINKP
    AKCJA -->|usunięcie| USUN --> REAUTH --> AKTYWNE
    AKTYWNE -->|tak| ODMOWA
    AKTYWNE -->|nie| ERASURE --> USUNIETE
    AKCJA -->|zgody| ZGODY --> REJESTR --> ZAPISANO
    EXPORTJOB --> AUDIT
    ERASURE --> AUDIT
    REJESTR --> AUDIT
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class USTAW,AKCJA,EKSPORT,LINKP,USUN,REAUTH,ODMOWA,USUNIETE,ZGODY,ZAPISANO fe
    class EXPORTJOB,AKTYWNE,ERASURE,REJESTR,AUDIT be
```

## Notatki
- P0 min.: trzy akcje samoobsługowe — eksport danych, usunięcie konta, zarządzanie zgodami; wszystkie operacje logowane w audit logu (F10).
- Re-auth OTP przed usunięciem konta — założenie minimalne (mapa nie rozstrzyga; operacja nieodwracalna, numer = tożsamość, B1).
- Usunięcie przy aktywnych (nadchodzących) rezerwacjach — założenie minimalne: odmowa/odroczenie do zakończenia wizyt; mapa nie rozstrzyga.
- Erasure job (G11): zakres usunięcia vs retencja wymagana prawem (rozliczenia, audit) — otwarta kwestia; usunięcie konta rezerwującego obejmuje też encje podopiecznych (B7) — założenie.
- Format i zakres paczki eksportu — mapa nie definiuje; założenie minimalne: dane konta + podopieczni + rezerwacje.
- Zarządzanie zgodami: zgody RODO z checkoutu (A5) + marketingowe (overlap z B10 — tam kanały i zgody marketingowe; tu pełny rejestr).
- Powiązania: G11, F10, F5 (obsługa wniosków RODO po stronie admina), B1, B7, B10.
