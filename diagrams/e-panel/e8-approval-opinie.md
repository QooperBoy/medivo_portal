# E8 — Approval wizyt + opinie

```mermaid
sequenceDiagram
    autonumber
    actor S as Specjalista
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    participant MSG as SMS/Email
    actor P as Pacjent

    Note over S,Q: część 1 — approval wizyt ("odbyła się")
    S->>FE: otwiera listę wizyt do potwierdzenia
    FE->>API: GET wizyty po terminie (confirmed)
    API-->>FE: lista do potwierdzenia
    alt specjalista potwierdza "odbyła się"
        S->>FE: klik "odbyła się"
        FE->>API: POST approval wizyty
        API->>API: confirmed -> completed
        API->>Q: start G3: review ask T+2 h
        Q->>MSG: T+2 h: prośba o opinię + token (B5)
        MSG-->>P: SMS/email z linkiem opinii
    else specjalista oznacza no-show
        S->>FE: klik "nie stawił się"
        Note over FE,API: dalszy przebieg: [[e7-no-show]] (E7)
    else brak reakcji specjalisty
        Q->>Q: timer auto-approval T+48 h (G4)
        alt wizyta bez no-show i bez sporu
            Q->>API: auto-approval
            API->>API: confirmed -> completed
            API->>Q: start G3: review ask
        else stan no_show lub disputed
            Q->>Q: auto-approval ZABLOKOWANY (Flaga 3)
        end
    end

    Note over S,Q: część 2 — opinie + odpowiedź
    S->>FE: otwiera listę opinii
    FE->>API: GET opinie (pipeline B5/F2)
    API-->>FE: opinie + status moderacji
    S->>FE: wybiera wzorzec odpowiedzi
    FE-->>S: podgląd — bez danych zdrowotnych
    S->>FE: wysyła odpowiedź
    FE->>API: POST odpowiedź na opinię
    API->>API: walidacja: brak danych zdrowotnych
    alt walidacja OK
        API-->>FE: odpowiedź opublikowana (A4)
    else wykryto dane wrażliwe
        API-->>FE: błąd — popraw odpowiedź
    end
```

## Notatki
- Priorytet: P0. Prompt #1 (pipeline opinii).
- Approval "odbyła się" domyka wizytę (completed) i startuje G3 (review ask T+2 h) → [[b5-wystawienie-opinii]] (B5) → moderacja F2 → publikacja na A4.
- Timer auto-approval T+48 h (G4) — ⚠️ Flaga 3: zablokowany, gdy wizyta ma stan no_show lub disputed (inaczej system "potwierdza" wizytę, która się nie odbyła: fałszywy badge + zepsuty scoring).
- Oznaczenie no-show z tej samej listy → [[e7-no-show]] (E7), stan confirmed -> no_show.
- Wzorce odpowiedzi bez danych zdrowotnych: gotowe szablony; walidacja odpowiedzi po stronie BE — założenie minimalne: automatyczny filtr (jak auto-filtr B5); czy odpowiedź specjalisty przechodzi też przez moderację F2 — mapa NIE rozstrzyga, zgłoszone w rozbieżnościach.
- Powiązania: E7, G3, G4, B5, F2, A4, CORE-STANY, Flaga 3.
