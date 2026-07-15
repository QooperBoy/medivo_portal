# F9 — RBAC + filtr wertykali

```mermaid
flowchart TD
    subgraph FE["FE — widzi admin"]
        LOGIN["Logowanie admina"]
        FILTR["Filtr wertykali (per serwis)"]
        MODULY["Moduły F1–F10 wg roli"]
        UKRYTE["Moduł ukryty: brak uprawnień"]
        ROLE["Zarządzanie rolami adminów"]
    end

    subgraph BE["BE — pod spodem"]
        RBAC["RBAC: role + uprawnienia"]
        CHECK{"Uprawnienie do modułu?"}
        SCOPE["Scoping danych per wertykal"]
        AUDYT["Zmiany ról → audyt (F10)"]
    end

    LOGIN --> RBAC
    RBAC --> CHECK
    CHECK -->|"tak"| MODULY
    CHECK -->|"nie"| UKRYTE
    FILTR --> SCOPE
    SCOPE --> MODULY
    ROLE --> RBAC
    ROLE --> AUDYT

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class LOGIN,FILTR,MODULY,UKRYTE,ROLE fe
    class RBAC,CHECK,SCOPE,AUDYT be
```

## Notatki
- Priorytet: P0, ale wg mapy „trywialne przy 1 serwisie" — na start (Kraków, logopedzi) filtr wertykali ma jedną wartość; struktura gotowa pod kolejne forki.
- Back Office jest jeden fizycznie dla wszystkich wertykali — filtr per serwis scopuje dane we WSZYSTKICH modułach F1–F10 (kolejki, użytkownicy, billing, CMS, konfiguracja).
- Model uprawnień: 3-osobowy zespół założycielski + przyszli moderatorzy (S3 pkt 4) — mapa nie definiuje listy ról; założenie minimalne: role przypisują dostęp per moduł F1–F10.
- Zmiany ról w audycie F10 (kto komu nadał dostęp do danych zdrowotnych).
- Założenie minimalne: logowanie admina bez szczegółów w mapie (metoda auth otwarta — do S3).
- Powiązania: wszystkie moduły F1–F10, F10 (audyt), S3.
