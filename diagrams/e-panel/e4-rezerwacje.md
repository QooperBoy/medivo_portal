# E4 — Rezerwacje (lista, szczegóły, akceptacja, wizyty offline)

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        WIDOK["Lista / kalendarz rezerwacji"]
        SZCZ["Szczegóły: dane minimalne"]
        WSK["Wskaźnik no-show pacjenta"]
        AKCJE["Akcje: odwołaj (E5), no-show (E7)"]
        PENDLIST["Prośby o akceptację"]
        DEC{"Akceptować rezerwację?"}
        AKC["Akceptuj"]
        ODRZ["Odrzuć"]
        RECZNE["Ręczne dopisanie wizyty offline"]
    end

    subgraph BE["BE — pod spodem"]
        BOOKAPI["Bookings API"]
        G7S["Scoring G7: historia no-show"]
        ST1["pending_approval -> confirmed"]
        ST2["pending_approval -> cancelled_by_specialist"]
        WAIT["Zwolniony slot -> waitlista (G6)"]
        OFF["Zapis wizyty offline: confirmed"]
        E2M["Zajmuje slot w modelu E2"]
        POW["Powiadomienie pacjenta (G1)"]
    end

    BOOKAPI --> WIDOK
    WIDOK --> SZCZ
    G7S --> WSK
    SZCZ --> WSK
    SZCZ --> AKCJE
    WIDOK --> PENDLIST
    PENDLIST --> DEC
    DEC -->|tak| AKC --> ST1 --> POW
    DEC -->|nie| ODRZ --> ST2 --> WAIT
    ST2 --> POW
    WIDOK --> RECZNE --> OFF
    OFF --> E2M
    OFF --> BOOKAPI

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class WIDOK,SZCZ,WSK,AKCJE,PENDLIST,DEC,AKC,ODRZ,RECZNE fe
    class BOOKAPI,G7S,ST1,ST2,WAIT,OFF,E2M,POW be
```

## Notatki
- Priorytet: P0. Spec: S2.
- Szczegóły wizyty = dane minimalne pacjenta (minimalizacja RODO) + wskaźnik no-show pacjenta ze scoringu G7.
- Ręczna akceptacja pojawia się tylko, gdy scoring gate (G7) wymusił wariant [[a5-checkout-wariant-akceptacja]]; akceptacja: pending_approval -> confirmed, odrzucenie: pending_approval -> cancelled_by_specialist (kanon nie ma stanu "rejected") + zwolniony slot -> waitlista (G6); brak reakcji -> timeout (założenie 24 h, patrz wariant A5).
- Ręczne dopisanie wizyty offline: założenie minimalne — od razu stan confirmed, zajmuje slot w modelu E2; dane pacjenta wpisuje specjalista.
- ⚠️ Flaga 4 (OTWARTA): czy wizyta dopisana ręcznie uprawnia do opinii (B5)? Ryzyko lewych opinii; propozycja z mapy: bez prawa do opinii publicznej albo słabszy badge — do rozstrzygnięcia w prompcie #1. Zgłoszone w rozbieżnościach.
- Akcje z poziomu szczegółów: odwołanie/przesunięcie -> [[e5-odwolanie-pojedyncze]] (E5), no-show -> [[e7-no-show]] (E7), approval po wizycie -> [[e8-approval-opinie]] (E8).
- Powiązania: A5 (wariant akceptacji), E2, E5, E7, E8, G1, G6, G7, B8 (odpowiedzi formularza przedwizytowego widoczne tutaj — P2), CORE-STANY, Flaga 4.
