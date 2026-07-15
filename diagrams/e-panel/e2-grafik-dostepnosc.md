# E2 — Grafik / dostępność

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        GRAFIK["Grafik: widok dzień/tydzień"]
        GODZ["Godziny pracy per adres"]
        BLOK["Blokady pojedynczych godzin"]
        DLUG["Długość slotu per usługa (E3)"]
        ZAPIS["Zapis zmian grafiku"]
    end

    subgraph BE["BE — pod spodem"]
        MODEL["Model dostępności"]
        REZ["Rezerwacje zajmują sloty (E4)"]
        URLOP["Blokady z trybu urlop (E6)"]
        GEN["Generowanie wolnych slotów"]
        AVAIL["Availability API"]
        A34["Zasila A3 / A4"]
    end

    GRAFIK --> GODZ
    GRAFIK --> BLOK
    GRAFIK --> DLUG
    GODZ --> ZAPIS
    BLOK --> ZAPIS
    DLUG --> ZAPIS
    ZAPIS --> MODEL
    URLOP --> MODEL
    MODEL --> GEN
    REZ --> GEN
    GEN --> AVAIL
    AVAIL --> A34
    AVAIL -.->|"podgląd live"| GRAFIK

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class GRAFIK,GODZ,BLOK,DLUG,ZAPIS fe
    class MODEL,REZ,URLOP,GEN,AVAIL,A34 be
```

## Notatki
- Priorytet: P0. Spec: S2 (model dostępności = serce systemu).
- Godziny pracy definiowane per adres (adresy multi z D2/[[e11-ustawienia]]); długość slotu per usługa pochodzi z [[e3-uslugi-ceny]] (E3).
- Model dostępności = godziny pracy − blokady (pojedyncze godziny + zakresy z [[e6-tryb-urlop]], E6) − zajęte rezerwacje (E4, w tym wizyty offline); wynik zasila inline sloty w A3 i pełny kalendarz w A4 (availability batch API, live).
- Bufory między wizytami i wizyty cykliczne — w zakresie speca S2, poza mapą E2; nie modelowano.
- Widget E14 i feed .ics E9 czytają ten sam model.
- Powiązania: A3, A4, E3, E4, E6, E9, E14, G10 (przyszły sync 2-way).
