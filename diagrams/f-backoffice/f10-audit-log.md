# F10 — Audit log

```mermaid
flowchart TD
    subgraph FE["FE — widzi admin"]
        ETAP{"Etap wdrożenia"}
        BRAKUI["P0: brak UI (tylko zapis)"]
        VIEWER["P1: viewer audytu"]
        FILTRY["Filtry: kto / co / kiedy"]
        WPIS["Szczegóły wpisu"]
        ZDROW["Oznaczenie: dane zdrowotne"]
    end

    subgraph BE["BE — pod spodem"]
        ZRODLA["Źródła: F1–F9, B9, podglądy"]
        ZAPIS["P0: zapis append-only"]
        META["Kto, co, kiedy, kontekst"]
        RETENCJA["Retencja RODO (G11)"]
        SELFAUDIT["Odczyt viewera też audytowany"]
    end

    ZRODLA --> ZAPIS
    ZAPIS --> META
    ZAPIS --> RETENCJA
    ETAP -->|"P0"| BRAKUI
    ETAP -->|"P1"| VIEWER
    ZAPIS --> VIEWER
    VIEWER --> FILTRY
    FILTRY --> WPIS
    WPIS --> ZDROW
    VIEWER --> SELFAUDIT

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class ETAP,BRAKUI,VIEWER,FILTRY,WPIS,ZDROW fe
    class ZRODLA,ZAPIS,META,RETENCJA,SELFAUDIT be
```

## Notatki
- Priorytet: P0 zapis → P1 viewer (wprost z mapy). W P0 nie ma UI — dostęp do logu np. bezpośrednio w bazie (S3: „co w P0 może być SQL-em").
- Zakres zapisu: kto co WIDZIAŁ i kto co ZMIENIŁ — dane zdrowotne pacjentów wymagają logowania samych odczytów (kluczowy konsument: podgląd konta w [[f5-uzytkownicy]] F5).
- Źródła wpisów: decyzje F1–F4, podglądy i akcje F5, billing F6, zmiany treści F7, konfiguracji F8, ról F9 oraz wnioski RODO z B9.
- Log append-only (bez edycji/usuwania wpisów przez adminów) — założenie minimalne, mapa nie precyzuje; retencja wpisów wg jobów RODO G11.
- Odczyt logu przez viewer sam też jest audytowany (założenie minimalne — spójność z zasadą „każdy dostęp do danych logowany").
- Powiązania: F1–F9 (źródła), B9, G11, S3 pkt 3.
