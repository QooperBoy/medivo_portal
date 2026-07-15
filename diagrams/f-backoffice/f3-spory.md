# F3 — Spory

```mermaid
flowchart TD
    subgraph FE["FE — widzi admin"]
        KOLEJKA["Kolejka sporów"]
        TIMER["TIMER SLA kolejki (wartość otwarta)"]
        TYP{"Typ sporu"}
        TNOSHOW["No-show: sprzeciw pacjenta (B6)"]
        TOPINIA["Kwestionowana opinia"]
        TBLOKADA["Odwołanie od blokady (F4)"]
        DOWODY["Stanowiska i dowody obu stron"]
        DECYZJA{"Rozstrzygnięcie"}
        UWZGLEDNIJ["Uwzględnij"]
        ODRZUC["Odrzuć + powód"]
    end

    subgraph BE["BE — pod spodem"]
        TICKETB6["Ticket z B6"]
        TICKETOP["Zgłoszenie opinii (E8/F2)"]
        TICKETBL["Wniosek po blokadzie (F4)"]
        DISPUTED["Rezerwacja: no_show → disputed"]
        BLOKG4["Spór otwarty: stop auto-approval (G4)"]
        COFNIJ["Cofnięcie sankcji scoringu (G7)"]
        ZDEJMIJ["Zdjęcie opinii z profilu"]
        ODBLOKUJ["Odblokowanie konta"]
        UTRZYMAJ["Sankcja/decyzja utrzymana"]
        MSGS["Powiadomienia stron (G1)"]
        AUDYT["Zapis decyzji + audyt (F10)"]
    end

    TICKETB6 --> DISPUTED
    DISPUTED --> BLOKG4
    TICKETB6 --> KOLEJKA
    TICKETOP --> KOLEJKA
    TICKETBL --> KOLEJKA
    KOLEJKA --> TIMER
    KOLEJKA --> TYP
    TYP -->|"no-show"| TNOSHOW
    TYP -->|"opinia"| TOPINIA
    TYP -->|"blokada"| TBLOKADA
    TNOSHOW --> DOWODY
    TOPINIA --> DOWODY
    TBLOKADA --> DOWODY
    DOWODY --> DECYZJA
    DECYZJA -->|"uwzględnij"| UWZGLEDNIJ
    DECYZJA -->|"odrzuć"| ODRZUC
    UWZGLEDNIJ -->|"no-show"| COFNIJ
    UWZGLEDNIJ -->|"opinia"| ZDEJMIJ
    UWZGLEDNIJ -->|"blokada"| ODBLOKUJ
    ODRZUC --> UTRZYMAJ
    COFNIJ --> MSGS
    ZDEJMIJ --> MSGS
    ODBLOKUJ --> MSGS
    UTRZYMAJ --> MSGS
    MSGS --> AUDYT

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class KOLEJKA,TIMER,TYP,TNOSHOW,TOPINIA,TBLOKADA,DOWODY,DECYZJA,UWZGLEDNIJ,ODRZUC fe
    class TICKETB6,TICKETOP,TICKETBL,DISPUTED,BLOKG4,COFNIJ,ZDEJMIJ,ODBLOKUJ,UTRZYMAJ,MSGS,AUDYT be
```

## Notatki
- Priorytet: P1.
- Trzy typy sporów z mapy: (1) no-show „byłem/byłam" z [[b6-spor-no-show]] (B6), (2) kwestionowane opinie (specjalista kwestionuje opublikowaną opinię — z E8/F2), (3) odwołania od blokad nałożonych w [[f4-anty-abuse]] (F4).
- Stany rezerwacji: przy sporze no-show wizyta przechodzi `no_show → disputed` (stany kanoniczne). Otwarty spór blokuje auto-approval G4 (Flaga 3 z mapy).
- SLA kolejki: mapa nie podaje wartości — timer zaznaczony, wartość otwarta (do S3).
- Uwzględnienie sporu no-show = cofnięcie sankcji scoringu (G7); mapa nie definiuje kanonicznego stanu rezerwacji PO rozstrzygnięciu sporu (disputed → ?) — założenie minimalne: decyzja żyje w tickecie, stan rezerwacji bez zmian; zgłoszone jako rozbieżność.
- Odrzucenie zawsze z powodem; obie strony dostają powiadomienie (G1); decyzja w audycie F10.
- Powiązania: B6, E7, E8, F2, F4, G4, G7, G1, F10, prompt #4.
