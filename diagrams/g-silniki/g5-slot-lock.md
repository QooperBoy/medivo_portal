# G5 — Slot lock (TTL 10 min)

```mermaid
sequenceDiagram
    autonumber
    actor P as Pacjent
    actor P2 as Drugi pacjent
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka

    P->>FE: wejście w checkout (A5)
    FE->>API: POST lock slotu
    alt slot wolny
        API->>API: lock wyłączny, TTL 10 min
        API->>API: draft -> locked
        API->>Q: timer wygaśnięcia locka
        API-->>FE: checkout otwarty (odliczanie)
    else slot zajęty lub zlockowany
        API-->>FE: błąd "slot niedostępny"
        FE-->>P: powrót do wyboru (A4/A8)
    end

    Note over P2,API: kolizja: równoległy checkout o ten sam slot
    P2->>FE: wybór tego samego slotu (A4)
    FE->>API: POST lock slotu
    API-->>FE: odmowa - lock aktywny (pierwszy wygrywa)
    FE-->>P2: "slot niedostępny" + inne sloty

    alt rezerwacja domknięta w TTL
        FE->>API: POST utworzenie rezerwacji (A5)
        API->>API: locked -> pending_payment / pending_approval / confirmed
        API->>Q: anulowanie timera locka
    else porzucenie checkoutu
        P->>FE: opuszczenie strony checkoutu
        Note over FE,API: brak sygnału z FE - lock czeka do TTL (założenie)
        Q->>API: TTL 10 min upłynął
        API->>API: zwolnienie locka - slot do puli (A3/A4)
    else TTL upływa w trakcie wypełniania
        Q->>API: TTL 10 min upłynął
        API->>API: zwolnienie locka - slot do puli
        API-->>FE: komunikat "czas na rezerwację minął"
        FE-->>P: powrót do wyboru slotu (A5)
    end
```

## Notatki
- Lock TTL 10 min od wejścia w checkout (A5); stany kanoniczne: `draft → locked`, dalej `pending_payment | pending_approval | confirmed` wg scoring gate G7 (CORE-STANY).
- **Kolizja równoległych checkoutów:** lock jest wyłączny — pierwszy pacjent wygrywa, drugi dostaje "slot niedostępny" i powrót do A4/A8; UX odmowy mapa nie rozstrzyga (założenie minimalne: komunikat + propozycja innych slotów).
- **Porzucenie checkoutu:** brak jawnego sygnału "release" z FE — lock zwalnia się dopiero po TTL (założenie minimalne; mapa mówi "zwolnienie po TTL/porzuceniu" bez rozstrzygnięcia mechanizmu).
- Wygaśnięcie locka NIE emituje `slot.released` — waitlista G6 dotyczy slotów z odwołanych rezerwacji, a lock nigdy nie zdjął slotu z puli publicznej na stałe (założenie).
- TTL w trakcie wypełniania formularza → komunikat "czas minął" + powrót do wyboru slotu, bez utraty wpisanych danych — jak w [[a5-checkout]].
- Aktor "Drugi pacjent" (P2) — spoza stałej listy aktorów CLAUDE.md; niezbędny, by pokazać kolizję (odnotowane).
- Powiązania: [[a5-checkout]] (A5), [[00-stany-rezerwacji]] (CORE-STANY), [[00-katalog-eventow]] (CORE-EVENTY), A3, A4, A8, G6, G7.
