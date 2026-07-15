# A5 — Checkout: wariant przedpłaty (scoring gate) + pełne A6 płatność online

```mermaid
sequenceDiagram
    autonumber
    actor P as Pacjent
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    participant MSG as SMS/Email
    participant PAY as Procesor płatności

    Note over P,API: kroki jak w [[a5-checkout]]<br/>aż do scoring gate (G7)
    API->>API: scoring gate (G7): wymagana przedpłata
    API-->>FE: info "wymagana przedpłata"
    P->>FE: podsumowanie + klik "rezerwuję i płacę"
    FE->>API: POST utworzenie rezerwacji
    API->>API: locked -> pending_payment
    API->>Q: timer auto-anulacji (~30 min, benchmark ZL)
    API->>PAY: utworzenie payment intent (A6)
    PAY-->>API: intent + URL płatności
    API-->>FE: redirect / embed procesora (A6)
    P->>PAY: autoryzacja płatności
    alt płatność udana
        PAY-->>FE: powrót: ekran wyniku (A6)
        PAY->>API: webhook potwierdzenia (G9)
        API->>API: pending_payment -> confirmed
        API->>Q: anulowanie timera auto-anulacji
        API->>API: generacja tokenów samoobsługi (A7)
        API->>Q: enqueue G1 (powiadomienia)
        Q->>MSG: email + SMS (token zarządzania) + .ics
        FE-->>P: ekran sukcesu (A7)
    else błąd płatności
        PAY-->>FE: ekran błędu (A6)
        FE-->>P: CTA "ponów płatność" (w oknie ~30 min)
        P->>PAY: ponowna próba autoryzacji
    else timeout okna płatności (~30 min)
        Q->>API: auto-anulacja po timeout
        API->>API: pending_payment -> cancelled_by_patient
        API->>Q: zwolniony slot -> waitlista (G6)
        Q->>MSG: powiadomienie pacjenta o anulacji
    end
```

## Notatki
- Plik pokrywa W PEŁNI flow A6 (płatność online): payment intent, redirect/embed procesora (PAY), ekran wyniku, obsługa błędu płatności, webhook potwierdzenia (G9), okno na płatność ~30 min (benchmark ZL) + auto-anulacja po timeout.
- Ten sam flow płatności dotyczy dobrowolnego wyboru "płatność online" w wariancie normalnym ([[a5-checkout]]) — różnica: tam brak przymusu gate'u.
- Stany rezerwacji: kanoniczne z CORE-STANY; pending_payment trzyma slot po wygaśnięciu locka G5 (TTL 10 min) — założenie minimalne, mapa nie rozstrzyga relacji lock vs okno płatności.
- Stan po auto-anulacji timeoutu: przyjęto cancelled_by_patient (kanon nie ma stanu "cancelled_by_system") — założenie minimalne, zgłoszone w rozbieżnościach.
- Przy gate przedpłaty opcja "płatność na miejscu" niedostępna — założenie minimalne (sens sankcji scoringowej G7).
- Błąd płatności: retry możliwy tylko w oknie ~30 min; po timeout działa auto-anulacja jak w gałęzi timeout.
- G9 obejmuje też zwroty i reconciliation — poza zakresem tego diagramu.
- B7 (dla kogo wizyta) i OTP — kroki wcześniejsze, identyczne jak w [[a5-checkout]].
- ⚠️ Flaga 2 (płatności online w POC): OTWARTA — decyzją użytkownika z 2026-07-15 dokumentujemy oba warianty; jeśli POC ruszy bez płatności online, ten wariant nie działa i sankcją pozostaje [[a5-checkout-wariant-akceptacja]].
- Powiązania: CORE-STANY, G5, G7, B7, A7, A6, G1, G6, G9, [[a5-checkout]], [[a5-checkout-wariant-akceptacja]].
