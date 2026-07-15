# F8 — Konfiguracja forka

```mermaid
flowchart TD
    subgraph FE["FE — widzi admin"]
        ETAP{"Etap wdrożenia"}
        P0["P0: plik konfiguracyjny"]
        P1["P1: UI konfiguracji"]
        SLOWNIK["Słownik usług wertykalu"]
        BRAND["Brand: nazwa, logo, domena"]
        ZRODLO["Źródło weryfikacji (rejestr)"]
        PARAMY["Parametry: progi scoringu, X h"]
        ZAPISZ["Zapisz zmiany"]
    end

    subgraph BE["BE — pod spodem"]
        WALIDACJA["Walidacja konfiguracji"]
        CONFIG["Config per fork (wersjonowany)"]
        PROP["Propagacja do modułów"]
        E3X["Słownik → usługi i ceny (E3)"]
        D1X["Rejestr → weryfikacja (D1/F1)"]
        G7X["Progi → scoring (G7)"]
        B3X["X h → polityka odwołań (B3)"]
        AUDYT["Zapis zmian + audyt (F10)"]
    end

    ETAP -->|"P0"| P0
    ETAP -->|"P1"| P1
    P0 --> CONFIG
    P1 --> SLOWNIK
    P1 --> BRAND
    P1 --> ZRODLO
    P1 --> PARAMY
    SLOWNIK --> ZAPISZ
    BRAND --> ZAPISZ
    ZRODLO --> ZAPISZ
    PARAMY --> ZAPISZ
    ZAPISZ --> WALIDACJA
    WALIDACJA --> CONFIG
    CONFIG --> PROP
    PROP --> E3X
    PROP --> D1X
    PROP --> G7X
    PROP --> B3X
    CONFIG --> AUDYT

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class ETAP,P0,P1,SLOWNIK,BRAND,ZRODLO,PARAMY,ZAPISZ fe
    class WALIDACJA,CONFIG,PROP,E3X,D1X,G7X,B3X,AUDYT be
```

## Notatki
- Priorytet: P0 plik konfiguracyjny → P1 UI (wprost z mapy); w P0 zmiana konfiguracji = edycja pliku w repo forka.
- Zakres konfiguracji z mapy: słownik usług (zasila CRUD w [[E3]]), brand, źródło weryfikacji (który rejestr sprawdza automat [[d1-weryfikacja-pwz]]/F1: KRL/KIF/wet.), parametry — progi scoringu (G7) i okno X h polityki odwołań (B3/E5).
- Założenie minimalne: config wersjonowany + walidowany przed propagacją (błędny prog scoringu nie może wywrócić gate'u w A5) — mapa tego nie precyzuje.
- Architektura z mapy: core repo-matka + forki per wertykal, Back Office wspólny — F8 to jedyne miejsce różnicujące forki parametrycznie.
- Zmiany konfiguracji w audycie F10 (parametry wpływają na sankcje wobec użytkowników).
- Powiązania: E3, D1, F1, G7, B3, E5, A5 (scoring gate), F10.
