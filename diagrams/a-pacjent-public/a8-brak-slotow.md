# A8 — Brak slotów

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        WEJSCIE["Brak slotów (z A3/A4)"]
        PODOBNI["Podobni specjaliści w okolicy"]
        A4LINK["Profil podobnego (A4)"]
        POWIADOM["CTA: powiadom o wolnym terminie"]
        KONTAKT["Potwierdzenie kanału kontaktu"]
        OK["Komunikat: zapisano na listę"]
    end

    subgraph BE["BE — pod spodem"]
        SIMILAR["Similar API"]
        WPIS["Wpis do waitlisty"]
        G6LINK["Waitlist engine (G6)"]
    end

    WEJSCIE --> PODOBNI
    SIMILAR --> PODOBNI
    PODOBNI -->|"klik w kartę"| A4LINK
    WEJSCIE --> POWIADOM
    POWIADOM --> KONTAKT
    KONTAKT --> WPIS
    WPIS --> G6LINK
    WPIS --> OK

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class WEJSCIE,PODOBNI,A4LINK,POWIADOM,KONTAKT,OK fe
    class SIMILAR,WPIS,G6LINK be
```

## Notatki
- Priorytet: P1 (cała ścieżka waitlisty; "podobni" mogą wejść wcześniej jako łatwiejsza połowa flow).
- Wejścia: pusty stan lub karta/kalendarz bez wolnych terminów → [[a3-lista-wynikow]] (A3), [[a4-profil-specjalisty]] (A4).
- Wpis do waitlisty konsumuje G6 (FIFO, okno 2 h, kaskada) — dalszy ciąg po stronie pacjenta: [[b4-waitlista]] (B4).
- Założenie (minimalne): "powiadom mnie" wymaga zweryfikowanego kanału kontaktu (numer telefonu = tożsamość, jak w A5/B1); mapa nie precyzuje, czy zapis na waitlistę możliwy bez wcześniejszej rezerwacji/konta — do rozstrzygnięcia przy #6 (polityka odwołań/waitlista).
- Kryteria "podobieństwa" specjalistów (usługa? dystans? cena?) — mapa nie rozstrzyga; założenie: ta sama usługa + najbliższa okolica.
