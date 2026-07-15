# D2 — Stan „w trakcie" (onboarding podczas weryfikacji)

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        WEJSCIE["panel po rejestracji — C3"] --> BANER["baner: weryfikacja w toku + SLA"]
        BANER --> MENU{"co robi specjalista?"}
        MENU --> USLUGI["edycja usług i cen"]
        MENU --> ADRESY["adresy — multi"]
        MENU --> ZDJECIA["zdjęcia profilu"]
        MENU --> GRAFIK["grafik dostępności"]
        MENU --> FAQ["FAQ onboardingu"]
        MENU --> DEMO["konto demo — podgląd"]
        GOTOWE["status: zweryfikowany — go-live D3"]
        BANER -.-> GOTOWE
    end
    subgraph BE["BE — pod spodem"]
        DRAFT["draft profilu — niepubliczny"]
        NIEPUBL["brak publikacji do A3/A4"]
        DRAFT --- NIEPUBL
        DATASET["demo dataset"]
        STATUSAPI["status weryfikacji z D1"]
    end
    USLUGI --> DRAFT
    ADRESY --> DRAFT
    ZDJECIA --> DRAFT
    GRAFIK --> DRAFT
    DEMO --> DATASET
    STATUSAPI --> BANER
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class WEJSCIE,BANER,MENU,USLUGI,ADRESY,ZDJECIA,GRAFIK,FAQ,DEMO,GOTOWE fe
    class DRAFT,NIEPUBL,DATASET,STATUSAPI be
```

## Notatki
- Wg mapy FE: pełna edycja profilu (usługi, ceny, **adresy — multi**, zdjęcia, grafik), FAQ, **konto demo**; BE: draft profile (niepubliczny), demo dataset.
- Pełna edycja dostępna **już w trakcie** weryfikacji D1 — nie dopiero po niej; wszystko zapisuje się do draftu, który nie trafia do wyników A3/A4 aż do go-live ([[d3-go-live]]).
- Konto demo: podgląd działania serwisu na demo datasecie — założenie minimalne: tylko do odczytu, dane demo nie mieszają się z draftem profilu (mapa nie rozstrzyga zakresu demo).
- Edycja usług/cen i grafiku w D2 to funkcjonalnie te same edytory co E3 (usługi i ceny) oraz E2 (grafik per adres, długość slotu per usługa) — pełne speki tam; grafik zasili A3/A4 dopiero po publikacji.
- Baner statusu + SLA „do 24 h roboczych" pochodzi z [[d1-weryfikacja-pwz]] (status na żywo); stany wg CORE-WERYFIKACJA.
- Powiązania: [[c3-rejestracja]], [[d1-weryfikacja-pwz]], [[d3-go-live]], E2, E3, A3/A4, CORE-WERYFIKACJA.
