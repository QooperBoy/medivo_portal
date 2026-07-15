# B8 — Formularz przedwizytowy

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        LINKA["Link do ankiety — email/konto"]
        ANKIETA["Ankieta: wywiad logopedyczny dziecka"]
        WYSLIJ["Wysłanie odpowiedzi"]
        DZIEKI["Potwierdzenie wypełnienia"]
        BRAK["Niewypełniona — wizyta bez ankiety"]
    end
    subgraph BE["BE — pod spodem"]
        TRIGGER["Rezerwacja confirmed — A7"]
        PIERWSZA{"Pierwsza wizyta u specjalisty?"}
        ENGINE["Forms engine: szablon ankiety"]
        SKIP["Bez ankiety — kolejna wizyta"]
        ZAPIS["Zapis odpowiedzi"]
        E4W["Odpowiedzi widoczne w E4"]
    end
    TRIGGER --> PIERWSZA
    PIERWSZA -->|tak| ENGINE --> LINKA --> ANKIETA
    PIERWSZA -->|nie| SKIP
    ANKIETA -->|wypełnia| WYSLIJ --> ZAPIS --> E4W
    ZAPIS --> DZIEKI
    ANKIETA -->|brak reakcji| BRAK
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class LINKA,ANKIETA,WYSLIJ,DZIEKI,BRAK fe
    class TRIGGER,PIERWSZA,ENGINE,SKIP,ZAPIS,E4W be
```

## Notatki
- Priorytet P2 — po walidacji; ankieta wysyłana po potwierdzeniu rezerwacji (confirmed, A7), tylko przed 1. wizytą u danego specjalisty.
- Wywiad logopedyczny o dziecku → dane podopiecznego z B7; treść/pola ankiety definiuje forms engine (szablon per wertykal — założenie, mapa nie rozstrzyga).
- Kanał doręczenia linku — założenie minimalne: przez G1 (email) + dostępna z konta (B2).
- Brak wypełnienia nie blokuje wizyty (założenie minimalne); przypomnienia o ankiecie — mapa nie przewiduje.
- Odpowiedzi (dane zdrowotne dziecka!) widoczne dla specjalisty w E4 — dostęp powinien podlegać audytowi F10 (założenie, mapa nie łączy wprost).
- Powiązania: A7, B7, E4, G1, F10.
