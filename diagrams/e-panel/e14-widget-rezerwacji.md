# E14 — Widget rezerwacji (embed)

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        KONF["Konfigurator widgetu w panelu"]
        KOD["Kod embed do wklejenia"]
        STRONA["Strona / FB specjalisty"]
        WKAL["Widget: kalendarz slotów"]
        CHECK["Klik slotu -> checkout A5"]
    end

    subgraph BE["BE — pod spodem"]
        EMBED["Embed script (JS)"]
        CORS["CORS: dozwolone domeny"]
        AVAIL["Availability API (E2)"]
    end

    KONF --> KOD --> STRONA
    EMBED --> WKAL
    STRONA --> WKAL
    CORS --> EMBED
    AVAIL --> WKAL
    WKAL --> CHECK

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class KONF,KOD,STRONA,WKAL,CHECK fe
    class EMBED,CORS,AVAIL be
```

## Notatki
- Priorytet: P2 (ZL to ma; wspiera komunikat "nie porzucaj obecnych kanałów" — specjalista osadza nasz kalendarz na własnej stronie/FB).
- Widget czyta live sloty z availability API ([[e2-grafik-dostepnosc]], E2); CORS ogranicza osadzanie do domen zadeklarowanych przez specjalistę (założenie minimalne — mapa mówi tylko "embed script, CORS").
- Klik slotu w widgecie -> pełny checkout [[a5-checkout]] (A5) na naszej domenie (lock G5, OTP, zgody) — założenie minimalne: checkout NIE odbywa się w iframe strony trzeciej (RODO/OTP), zgłoszone w rozbieżnościach.
- Konfigurator w panelu: generuje kod embed; personalizacja wyglądu — nierozstrzygnięta, poza mapą.
- Powiązania: A5, E2, G5.
