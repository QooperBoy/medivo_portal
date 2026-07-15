# B3 — Zmiana/odwołanie wizyty tokenem (bez logowania)

```mermaid
sequenceDiagram
    autonumber
    actor P as Pacjent
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    actor S as Specjalista
    participant MSG as SMS/Email

    P->>FE: klik "zarządzaj wizytą" (token z SMS)
    FE->>API: GET /bookings/manage?token
    API->>API: walidacja tokenu (TTL, kanał zweryfikowany)
    alt token OK
        API-->>FE: szczegóły wizyty + dozwolone akcje
        P->>FE: wybiera "odwołaj" + powód
        FE->>API: POST /bookings/id/cancel
        API->>API: polityka: >X h przed wizytą?
        alt w terminie
            API->>Q: event booking.cancelled
            Q->>MSG: powiadomienie do specjalisty
            Q->>Q: zwolniony slot -> waitlista (G6)
            API-->>FE: potwierdzenie odwołania
        else po terminie
            API->>Q: event booking.cancelled_late -> scoring (G7)
            API-->>FE: potwierdzenie + info o wpływie na konto
        end
    else token nieważny/przedawniony
        API-->>FE: błąd -> CTA logowanie OTP (B1)
    end
```

## Notatki
- Token: single-use? TTL? → otwarta decyzja z mapy (S1)
- Kanał niezweryfikowany = brak samoobsługi tym kanałem (arch. v2, F3)
- Powiązania: B4 (waitlista), G6, G7, #6 polityka odwołań
