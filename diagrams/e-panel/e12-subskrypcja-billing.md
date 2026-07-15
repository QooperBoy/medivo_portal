# E12 — Subskrypcja / billing specjalisty

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        SUB["Ekran subskrypcji"]
        PLAN["Plan: free / płatne (C2)"]
        LICZNIK["Licznik: free do DD.MM"]
        METODA["Metoda płatności"]
        FAKTURY["Faktury do pobrania"]
        PROMPT["Po okresie free: wybór planu"]
    end

    subgraph BE["BE — pod spodem"]
        START["Start okresu free: dzień 1 (C3)"]
        BILLING["Billing engine"]
        VAT["Faktury VAT"]
        KONIEC{"Okres free minął?"}
    end

    SUB --> PLAN
    SUB --> LICZNIK
    SUB --> METODA
    SUB --> FAKTURY
    START --> LICZNIK
    START --> KONIEC
    KONIEC -->|tak| PROMPT
    KONIEC -->|nie| LICZNIK
    METODA --> BILLING
    PROMPT --> PLAN
    BILLING --> VAT --> FAKTURY
    BILLING --> PLAN

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class SUB,PLAN,LICZNIK,METODA,FAKTURY,PROMPT fe
    class START,BILLING,VAT,KONIEC be
```

## Notatki
- Priorytet: P1, ale widoczność licznika "free do DD.MM" = P0 (od dnia 1, start liczony od rejestracji C3). Prompt #2 (model subskrypcji).
- Na start 1 plan free + zapowiedź płatnych (C2); billing engine nalicza subskrypcję i wystawia faktury VAT.
- Co dokładnie po końcu okresu free (blokada panelu? ukrycie profilu? grace period?) — mapa NIE rozstrzyga; w diagramie tylko prompt wyboru planu (założenie minimalne); zgłoszone w rozbieżnościach.
- Dane do faktur z [[e11-ustawienia]] (E11); strona administracyjna billingu: F6 (subskrypcje, windykacja).
- Alert o statusie subskrypcji widoczny na dashboardzie [[e1-dashboard]] (E1).
- Płatność za subskrypcję B2B jest niezależna od Flagi 2 (płatności pacjentów w POC).
- Powiązania: C2, C3, E1, E11, F6.
