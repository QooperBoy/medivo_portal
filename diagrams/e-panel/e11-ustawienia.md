# E11 — Ustawienia specjalisty

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        UST["Ustawienia"]
        DANE["Dane specjalisty"]
        ADRESY["Adresy — multi"]
        ZDJ["Zdjęcia"]
        FAKT["Dane do faktur"]
    end

    subgraph BE["BE — pod spodem"]
        PROF["Profile API"]
        UPLOAD["Upload i przechowywanie zdjęć"]
        A4Z["Zasila profil publiczny (A4)"]
        E2Z["Adresy -> grafik per adres (E2)"]
        E12Z["Dane do faktur -> billing (E12)"]
    end

    UST --> DANE
    UST --> ADRESY
    UST --> ZDJ
    UST --> FAKT
    DANE --> PROF
    ADRESY --> PROF
    ZDJ --> UPLOAD --> PROF
    FAKT --> E12Z
    PROF --> A4Z
    PROF --> E2Z

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class UST,DANE,ADRESY,ZDJ,FAKT fe
    class PROF,UPLOAD,A4Z,E2Z,E12Z be
```

## Notatki
- Priorytet: P0.
- Kolumna BE w mapie pusta ("—") — przyjęto założenie minimalne: profile API (te same encje co draft profilu z D2) + upload zdjęć; zgłoszone w rozbieżnościach.
- Adresy multi (jak w D2): każda zmiana adresów wpływa na godziny pracy per adres w [[e2-grafik-dostepnosc]] (E2) i na profil publiczny A4 (mapa, dystans w A2/A3).
- Dane do faktur zasilają billing/faktury VAT w [[e12-subskrypcja-billing]] (E12).
- Czy zmiany danych publicznych (bio, zdjęcia) wymagają ponownej moderacji — mapa nie rozstrzyga; założenie: nie (weryfikacja D1/F1 dotyczy PWZ, nie treści).
- Powiązania: D2, A4, E2, E12.
