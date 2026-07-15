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

## Co opisuje ten diagram
Diagram pokazuje, jak admin rozstrzyga spory między stronami marketplace'u. Do kolejki trafiają trzy typy zgłoszeń: sprzeciw pacjenta wobec oznaczenia no-show („byłem/byłam na wizycie"), opinia kwestionowana przez specjalistę oraz odwołanie od blokady nałożonej przez anty-abuse. Admin ogląda stanowiska i dowody obu stron, po czym uwzględnia spór (cofa sankcję scoringu, zdejmuje opinię z profilu albo odblokowuje konto) lub odrzuca go z podanym powodem. Obie strony dostają powiadomienie, a otwarty spór no-show wstrzymuje automatyczne zatwierdzenie wizyty.

## Powiązane diagramy
| ID | Diagram | Jak się łączy |
|---|---|---|
| B6 | [b6-spor-no-show.md](../b-pacjent-konto/b6-spor-no-show.md) | sprzeciw pacjenta wobec no-show — źródło ticketów |
| E7 | [e7-no-show.md](../e-panel/e7-no-show.md) | oznaczenie no-show przez specjalistę poprzedza spór |
| E8 | [e8-approval-opinie.md](../e-panel/e8-approval-opinie.md) | specjalista kwestionuje tam opublikowaną opinię |
| F2 | [f2-moderacja-opinii.md](f2-moderacja-opinii.md) | zakwestionowana po publikacji opinia przechodzi z moderacji do sporu |
| F4 | [f4-anty-abuse.md](f4-anty-abuse.md) | odwołania od blokad nałożonych w anty-abuse |
| G4 | [g4-auto-approval.md](../g-silniki/g4-auto-approval.md) | otwarty spór blokuje auto-approval wizyty |
| G7 | [g7-scoring-engine.md](../g-silniki/g7-scoring-engine.md) | uwzględnienie sporu no-show cofa sankcję scoringu |
| G1 | [00-katalog-eventow.md](../00-core/00-katalog-eventow.md) | powiadomienia obu stron o rozstrzygnięciu |
| F10 | [f10-audit-log.md](f10-audit-log.md) | każde rozstrzygnięcie zapisywane w audycie |

## Słownik
| Pojęcie | Wyjaśnienie |
|---|---|
| Spór | Sprawa, w której jedna strona kwestionuje decyzję lub zdarzenie i prosi admina o rozstrzygnięcie. |
| Ticket | Pojedyncze zgłoszenie sporu czekające w kolejce na obsługę. |
| No-show | Sytuacja, gdy pacjent nie stawił się na umówioną wizytę. |
| disputed | Stan rezerwacji oznaczający, że no-show jest kwestionowany i sprawa czeka na rozstrzygnięcie. |
| Sankcja | Konsekwencja nałożona na pacjenta za no-show lub późne odwołanie (np. wymóg przedpłaty). |
| Scoring | Wewnętrzna ocena wiarygodności pacjenta, na którą wpływają no-show i późne odwołania. |
| Auto-approval | Automatyczne zatwierdzenie odbytej wizyty po 48 h, wstrzymywane na czas sporu. |
| Blokada | Odcięcie użytkownikowi dostępu do konta lub rezerwacji, od którego można się odwołać. |
| SLA | Obiecany maksymalny czas obsługi kolejki (wartość jeszcze nieustalona). |
| Audyt (audit log) | Trwały zapis decyzji: kto rozstrzygnął, kiedy i z jakim powodem. |
