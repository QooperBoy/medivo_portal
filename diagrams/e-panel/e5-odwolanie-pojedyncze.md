# E5 — Odwołanie/przesunięcie pojedynczej wizyty

```mermaid
sequenceDiagram
    autonumber
    actor S as Specjalista
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    participant MSG as SMS/Email
    actor P as Pacjent

    S->>FE: wybiera wizytę (E4) + akcja
    FE->>API: GET szablony powodów
    API-->>FE: lista szablonów
    S->>FE: wybiera powód z szablonu
    FE-->>S: podgląd ludzkiego komunikatu do pacjenta
    alt odwołanie wizyty
        S->>FE: potwierdza odwołanie
        FE->>API: POST odwołanie wizyty
        API->>API: confirmed -> cancelled_by_specialist
        API->>API: licznik odwołań specjalisty +1
        API->>Q: event booking.cancelled
        Q->>Q: auto-propozycje: inne sloty / podobni specjaliści
        Q->>Q: zwolniony slot -> waitlista (G6)
        Q->>MSG: enqueue G1: komunikat + propozycje
        MSG-->>P: SMS/email z propozycjami
        API-->>FE: potwierdzenie odwołania
    else przesunięcie na inny slot
        S->>FE: wybiera nowy slot z grafiku (E2)
        FE->>API: POST zmiana terminu
        API->>API: aktualizacja terminu (stan confirmed)
        API->>Q: stary slot -> waitlista (G6)
        Q->>MSG: enqueue G1: komunikat o nowym terminie
        MSG-->>P: SMS/email + link zarządzania (B3)
        API-->>FE: potwierdzenie przesunięcia
    else specjalista rezygnuje
        S->>FE: anuluje akcję — wizyta bez zmian
    end
```

## Notatki
- Priorytet: P0. Prompt #6 (polityka odwołań).
- Wejście z panelu rezerwacji [[e4-rezerwacje]] (E4); podgląd "ludzkiego" komunikatu generowany z szablonu powodu przed wysłaniem.
- Auto-propozycje dla pacjenta: inne sloty tego specjalisty (z modelu E2) lub podobni specjaliści (wzorzec A8) — dokładny algorytm nierozstrzygnięty w mapie.
- Zwolniony slot trafia do waitlisty [[b4-waitlista]] (G6) — analogicznie do B3.
- Licznik odwołań specjalisty: mapa definiuje tylko inkrement; skutki progowe (np. flaga do F4, wpływ na ranking A2) — NIEROZSTRZYGNIĘTE, zgłoszone w rozbieżnościach.
- Przesunięcie: założenie minimalne — zmiana terminu bez akceptacji pacjenta, pacjent informowany i może odwołać tokenem (B3); licznik odwołań NIE rośnie przy przesunięciu (założenie).
- Powiadomienia przez G1 (notification engine); pacjent po odwołaniu może skorzystać z propozycji → nowy checkout (A5).
- Powiązania: E4, E2, B3, B4, G1, G6, A8, CORE-STANY.
