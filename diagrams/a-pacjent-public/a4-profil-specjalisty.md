# A4 — Profil specjalisty

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        PROFIL["Profil specjalisty"]
        BIO["Bio"]
        BADGE["Badge: PWZ zweryfikowany"]
        ADRESY["Adresy + mapa"]
        USLUGI["Usługi + ceny"]
        KALENDARZ["Pełny kalendarz"]
        OPINIE["Opinie + badge wiarygodności"]
        ODPOW["Odpowiedzi specjalisty"]
        SLOT{"Wolny slot?"}
        A5LINK["Checkout (A5)"]
        A8LINK["Brak slotów (A8)"]
    end

    subgraph BE["BE — pod spodem"]
        PROFAPI["Profile API"]
        REVAPI["Reviews API"]
        AVAILAPI["Availability API (E2)"]
        SCHEMA["Schema.org profilu"]
    end

    PROFAPI --> PROFIL
    SCHEMA -.->|"SEO profilu"| PROFIL
    PROFIL --> BIO
    PROFIL --> BADGE
    PROFIL --> ADRESY
    PROFIL --> USLUGI
    PROFIL --> KALENDARZ
    PROFIL --> OPINIE
    REVAPI --> OPINIE
    OPINIE --> ODPOW
    AVAILAPI --> KALENDARZ
    KALENDARZ --> SLOT
    SLOT -->|"tak: wybór slotu"| A5LINK
    SLOT -->|"nie"| A8LINK

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class PROFIL,BIO,BADGE,ADRESY,USLUGI,KALENDARZ,OPINIE,ODPOW,SLOT,A5LINK,A8LINK fe
    class PROFAPI,REVAPI,AVAILAPI,SCHEMA be
```

## Notatki
- Priorytet: P0.
- Wejścia na profil: z listy [[a3-lista-wynikow]] (A3) lub bezpośrednio z SEO (A1, URL `/{imie-nazwisko}/{miasto}` wg S5).
- Badge "PWZ zweryfikowany" = wynik weryfikacji D1/F1; adresy multi (D2/E11); usługi+ceny z E3; kalendarz live z modelu dostępności E2.
- Opinie z badge'ami wiarygodności + odpowiedzi specjalisty — pipeline opinii: B5 → F2 → E8; publikowane przez reviews API.
- Wybór slotu → [[a5-checkout]] (A5); brak wolnych terminów → [[a8-brak-slotow]] (A8).
- Schema.org profilu odświeżane przez G12.
