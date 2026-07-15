# E3 — Usługi i ceny

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        LISTA["Lista usług specjalisty"]
        DODAJ["Dodaj usługę ze słownika"]
        EDYTUJ["Edytuj usługę"]
        ATRYB["Atrybuty: cena, czas"]
        TRYB["Tryb: online / stacjonarnie"]
        USUN["Usuń usługę"]
    end

    subgraph BE["BE — pod spodem"]
        SLOWNIK["Słownik usług wertykalu (F8)"]
        SRVAPI["Services API"]
        A45["Zasila profil A4 i checkout A5"]
        E2Z["Czas usługi -> długość slotu (E2)"]
    end

    SLOWNIK --> DODAJ
    LISTA --> DODAJ
    LISTA --> EDYTUJ
    LISTA --> USUN
    DODAJ --> ATRYB
    EDYTUJ --> ATRYB
    ATRYB --> TRYB
    TRYB --> SRVAPI
    USUN --> SRVAPI
    SRVAPI --> A45
    SRVAPI --> E2Z
    SRVAPI --> LISTA

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class LISTA,DODAJ,EDYTUJ,ATRYB,TRYB,USUN fe
    class SLOWNIK,SRVAPI,A45,E2Z be
```

## Notatki
- Priorytet: P0. Spec: S2.
- CRUD wyłącznie ze słownika usług wertykalu (konfiguracja forka F8) — specjalista nie tworzy dowolnych nazw usług; ustawia cenę, czas trwania i tryb (online/stacjonarnie).
- Czas trwania usługi determinuje długość slotu w grafiku [[e2-grafik-dostepnosc]] (E2); usługi + ceny widoczne na profilu A4 i w kroku wyboru usługi w checkoucie A5.
- Usunięcie usługi z przyszłymi rezerwacjami — mapa NIE rozstrzyga zachowania (blokada? odwołania E5?); zgłoszone w rozbieżnościach.
- Powiązania: A4, A5, E2, F8.
