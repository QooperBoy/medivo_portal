# G6 — Waitlist engine (FIFO, okno 2 h)

```mermaid
sequenceDiagram
    autonumber
    actor P as Pacjent
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    actor S as Specjalista
    participant MSG as SMS/Email

    Note over API,Q: wpisy na waitlistę: zapis z A8/B4
    API->>Q: event slot.released (B3/E5/E6)
    Q->>Q: kolejka FIFO per specjalista/usługa
    alt kolejka pusta
        Q->>API: slot wraca do puli (A3/A4)
    else jest oczekujący
        Q->>MSG: powiadomienie pierwszego z kolejki
        MSG-->>P: SMS/email z linkiem (B4)
        Q->>Q: start okna 2 h
        alt potwierdzenie w oknie 2 h
            P->>FE: klik "potwierdź termin" (B4)
            FE->>API: POST auto-book slotu
            API->>API: rezerwacja -> confirmed
            API->>Q: event booking.created + enqueue G1
            Q->>MSG: potwierdzenie pacjenta (A7)
            Q->>MSG: powiadomienie specjalisty
            MSG-->>S: nowa wizyta z waitlisty
        else brak reakcji w 2 h
            Q->>Q: timeout okna 2 h
            Q->>Q: kaskada: następny z kolejki (FIFO)
            Q->>MSG: powiadomienie następnego pacjenta
            Note over Q,MSG: pętla aż do wyczerpania FIFO
            Q->>API: kolejka wyczerpana - slot do puli
        end
    end
```

## Notatki
- Wejścia silnika: zapis na waitlistę z A8 ("powiadom mnie, gdy zwolni się termin") i B4; zwolnienie slotu: B3 (odwołanie pacjenta), E5/E6 (odwołanie specjalisty), odrzucenie/timeout `pending_approval` ([[a5-checkout-wariant-akceptacja]]), timeout płatności ([[a5-checkout-wariant-przedplata]]).
- FIFO per specjalista/usługa — założenie minimalne (jak w [[b4-waitlista]]); mapa mówi tylko "FIFO".
- Okno 2 h "potwierdź/auto-book": potwierdzenie tworzy rezerwację automatycznie, od razu `confirmed`, bez pełnego checkoutu A5 — założenie minimalne (jak w B4); pominięcie płatności i scoring gate przy auto-booku to otwarta kwestia (⚠️ Flaga 2 pośrednio).
- Brak reakcji w 2 h → kaskada do następnego z kolejki; kolejka wyczerpana → slot wraca do publicznej dostępności (A3/A4) — założenie minimalne.
- Rezygnacja pacjenta z wpisu nieopisana w mapie — założenie: natychmiastowa kaskada do następnego (jak w B4).
- `slot.released` — nazwa robocza eventu (CORE-EVENTY).
- Powiązania: [[b4-waitlista]] (B4), [[00-katalog-eventow]] (CORE-EVENTY), A8, B3, E5, E6, G1, A7, ścieżka e2e "Pacjent zmienia termin".
