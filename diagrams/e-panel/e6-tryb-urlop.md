# E6 — Tryb urlop/choroba (operacja bulk)

```mermaid
sequenceDiagram
    autonumber
    actor S as Specjalista
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    participant MSG as SMS/Email
    actor P as Pacjent

    S->>FE: włącza tryb urlop/choroba
    S->>FE: podaje zakres dat
    FE->>API: GET wizyty w zakresie
    API-->>FE: podgląd dotkniętych wizyt
    alt brak dotkniętych wizyt
        S->>FE: potwierdza blokadę zakresu
        FE->>API: POST blokada dostępności
        API->>API: grafik E2: zakres niedostępny
        API-->>FE: potwierdzenie blokady
    else są dotknięte wizyty
        S->>FE: potwierdza operację bulk
        FE->>API: POST bulk: blokada + odwołania
        API->>API: grafik E2: zakres niedostępny
        API->>API: każda wizyta: confirmed -> cancelled_by_specialist
        API->>Q: eventy booking.cancelled (bulk)
        Q->>API: oznacz pacjentów: priorytet 24 h
        Q->>MSG: hurtowe powiadomienia (G1, dedup)
        MSG-->>P: odwołanie + priorytet 24 h na nowy termin
        API-->>FE: podsumowanie operacji bulk
    else specjalista rezygnuje
        S->>FE: anuluje — grafik bez zmian
    end
```

## Notatki
- Priorytet: P1. Prompt #6 (polityka odwołań).
- Zakres dat blokuje dostępność w modelu [[e2-grafik-dostepnosc]] (E2) — zwolnione sloty NIE idą do waitlisty (G6), bo są zablokowane urlopem.
- Hurtowe powiadomienia przez G1 (kolejka, dedup, szablony PL).
- Priorytet 24 h dla poszkodowanych pacjentów: założenie minimalne — pierwszeństwo rezerwacji nowego terminu przez 24 h od powiadomienia; dokładna mechanika (early access do slotów? pozycja w waitliście G6?) NIEROZSTRZYGNIĘTA, zgłoszone w rozbieżnościach.
- Czy odwołania bulk z urlopu wliczają się do licznika odwołań specjalisty (E5)? Mapa nie rozstrzyga — zgłoszone w rozbieżnościach.
- Powiązania: E2, E5, G1, G6, CORE-STANY.
