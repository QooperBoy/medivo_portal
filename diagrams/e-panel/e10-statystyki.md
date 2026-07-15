# E10 — Statystyki specjalisty

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        STATY["Ekran statystyk"]
        WYSW["Wyświetlenia profilu"]
        KONW["Konwersja: profil -> rezerwacja"]
        NSR["No-show rate"]
    end

    subgraph BE["BE — pod spodem"]
        EVP["Eventy: odsłony profilu (A4)"]
        EVR["Eventy: rezerwacje (A5)"]
        EVN["Eventy: visit.no_show (E7/G7)"]
        PIPE["Analytics pipeline"]
        AGREG["Agregacje per specjalista"]
    end

    EVP --> PIPE
    EVR --> PIPE
    EVN --> PIPE
    PIPE --> AGREG
    AGREG --> STATY
    STATY --> WYSW
    STATY --> KONW
    STATY --> NSR

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class STATY,WYSW,KONW,NSR fe
    class EVP,EVR,EVN,PIPE,AGREG be
```

## Notatki
- Priorytet: P1.
- Trzy metryki z mapy: wyświetlenia profilu (odsłony A4 z analytics A1), konwersja profil -> rezerwacja (A4 -> A5), no-show rate pacjentów specjalisty (eventy visit.no_show z E7 / G7).
- Analytics pipeline: założenie minimalne — agregacje batch z eventów domenowych i odsłon; zakresy dat / porównania okresów mapa nie definiuje.
- No-show rate specjalisty widoczny też jako metryka lejka (S5: konwersja wyszukiwanie -> profil -> checkout — wspólne źródło danych).
- Powiązania: A1, A4, A5, E7, G7.
