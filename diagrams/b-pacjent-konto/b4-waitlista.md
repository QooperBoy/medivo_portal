# B4 — Waitlista

```mermaid
sequenceDiagram
    autonumber
    actor P as Pacjent
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    actor S as Specjalista
    participant MSG as SMS/Email

    Note over P,API: Zapis na waitlistę (wejście z A8)
    P->>FE: klik "powiadom mnie o terminie"
    FE->>API: POST wpis na waitlistę
    API->>API: kolejka FIFO per specjalista/usługa (G6)
    API-->>FE: potwierdzenie zapisu

    Note over API,MSG: Zwolnienie slotu (np. B3, E5)
    API->>Q: event: slot zwolniony
    Q->>Q: FIFO engine (G6): pierwszy z kolejki
    Q->>MSG: powiadomienie "zwolnił się termin"
    MSG-->>P: SMS/email z linkiem
    Q->>Q: start okna 2 h

    alt pacjent potwierdza w oknie 2 h
        P->>FE: klik "potwierdź termin"
        FE->>API: POST auto-book slotu
        API->>API: rezerwacja -> confirmed
        API->>Q: enqueue G1 (potwierdzenia, A7)
        Q->>MSG: potwierdzenie do pacjenta
        Q->>MSG: powiadomienie do specjalisty
        MSG-->>S: nowa wizyta z waitlisty
        API-->>FE: ekran sukcesu
    else brak reakcji w 2 h
        Q->>Q: timeout okna 2 h
        Q->>Q: kaskada: następny z kolejki (FIFO)
        Q->>MSG: powiadomienie do następnego pacjenta
        Note over Q,MSG: pętla aż do wyczerpania kolejki
    end
```

## Notatki
- "Okno 2 h potwierdź/auto-book" zinterpretowane: pacjent ma 2 h na potwierdzenie, potwierdzenie tworzy rezerwację automatycznie (bez pełnego checkoutu A5) — mapa nie rozstrzyga, założenie minimalne.
- Auto-book → od razu confirmed (stany kanoniczne CORE-STANY); pominięcie płatności i scoring gate przy auto-booku to otwarta kwestia (⚠️ Flaga 2 pośrednio: co z wariantem przedpłaty przy slocie z waitlisty).
- Kolejka wyczerpana bez potwierdzenia → slot wraca do publicznej dostępności (A3/A4) — założenie minimalne.
- Rezygnacja pacjenta z wpisu ("nie chcę już terminu") nieopisana w mapie — założenie: natychmiastowa kaskada do następnego.
- Zapis na waitlistę: wejście z A8 ("powiadom mnie, gdy zwolni się termin"); zwolnienie slotu: B3 (odwołanie pacjenta), E5/E6 (odwołanie specjalisty).
- Powiązania: G6 (FIFO engine), A8, B3, E5, G1, A7, ścieżka e2e "Pacjent zmienia termin".
