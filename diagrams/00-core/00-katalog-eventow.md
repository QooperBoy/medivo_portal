# CORE-EVENTY — Katalog eventów domenowych (silniki G1–G13)

```mermaid
flowchart LR
    subgraph REZ["Domena: rezerwacje"]
        PUB_A5["A5 checkout ukończony"]
        PUB_B3["B3 odwołanie pacjenta"]
        PUB_E56["E5/E6 odwołanie specjalisty"]
        PUB_E7["E7 oznaczenie no-show"]
        EV_CREATED(["booking.created"])
        EV_CANC(["booking.cancelled"])
        EV_LATE(["booking.cancelled_late"])
        EV_NOSHOW(["visit.no_show"])
        EV_SLOT(["slot.released — robocza"])
        ENG_G1["G1 notification engine"]
        ENG_G2["G2 reminder T-24 h"]
        ENG_G6["G6 waitlist engine"]
        ENG_G7["G7 scoring engine"]
        ENG_G8["G8 fraud detection"]
        ENG_G10["G10 calendar sync"]
        EFF_MSG["SMS/email do stron"]
        EFF_GATE["gate w checkout (A5)"]
        EFF_E4["wskaźnik no-show (E4)"]
        EFF_F4["flagi do przeglądu (F4)"]
    end

    subgraph OPI["Domena: wizyty i opinie"]
        PUB_E8["E8 approval ręczny"]
        PUB_B6["B6 spór no-show"]
        PUB_F2["F2 moderacja opinii"]
        ENG_G4["G4 auto-approval T+48 h"]
        EV_APPR(["visit.approved — robocza"])
        EV_DISP(["dispute.opened — robocza"])
        EV_REVOK(["review.approved"])
        ENG_G3["G3 review ask T+2 h"]
        EFF_OPUB["publikacja opinii (A4)"]
        EFF_F3["ticket sporu (F3)"]
    end

    subgraph PAYD["Domena: płatności (Flaga 2)"]
        PUB_PAY["Procesor płatności"]
        PUB_A6T["A6 timeout płatności (job)"]
        EV_PAYOK(["payment.succeeded — robocza"])
        EV_PAYRF(["payment.refunded — robocza"])
        ENG_G9["G9 payment webhooks"]
        EFF_RECON["reconciliation"]
    end

    subgraph ROPS["Domena: RODO / SEO"]
        PUB_B9["B9 usunięcie konta/eksport"]
        PUB_F5["F5 wnioski RODO"]
        PUB_A5Z["A5 zgody RODO"]
        PUB_D3["D3 go-live profilu"]
        EV_ERAS(["rodo.erasure_requested — robocza"])
        EV_CONS(["consent.recorded — robocza"])
        EV_PROF(["profile.published — robocza"])
        ENG_G11["G11 RODO joby"]
        ENG_G12["G12 SEO joby"]
        EFF_SMAP["sitemap + schema.org refresh"]
        EFF_AUD["audit log (F10)"]
    end

    PUB_A5 --> EV_CREATED
    ENG_G6 -->|"auto-book (B4)"| EV_CREATED
    ENG_G9 -->|"pending_payment -> confirmed"| EV_CREATED
    EV_CREATED --> ENG_G1
    EV_CREATED -->|"scheduler T-24 h"| ENG_G2
    EV_CREATED -->|"timer po wizycie"| ENG_G4
    EV_CREATED -->|"wzorce, limity"| ENG_G8
    EV_CREATED --> ENG_G10

    PUB_B3 -->|"w terminie"| EV_CANC
    PUB_B3 -->|"po terminie"| EV_LATE
    PUB_E56 --> EV_CANC
    PUB_A6T --> EV_CANC
    EV_CANC --> ENG_G1
    EV_CANC --> ENG_G10
    EV_CANC --> EV_SLOT
    EV_LATE --> ENG_G7
    EV_LATE --> ENG_G1
    EV_LATE --> EV_SLOT
    EV_SLOT --> ENG_G6
    ENG_G6 -->|"powiadomienie, okno 2 h"| ENG_G1

    PUB_E7 --> EV_NOSHOW
    EV_NOSHOW --> ENG_G7
    EV_NOSHOW -->|"blokada (Flaga 3)"| ENG_G4
    EV_NOSHOW -->|"komunikat o sankcji"| ENG_G1

    ENG_G1 --> EFF_MSG
    ENG_G2 -->|"T-24 h"| ENG_G1
    ENG_G7 --> EFF_GATE
    ENG_G7 --> EFF_E4
    ENG_G8 --> EFF_F4

    PUB_E8 --> EV_APPR
    ENG_G4 -->|"T+48 h bez blokady"| EV_APPR
    EV_APPR --> ENG_G3
    ENG_G3 -->|"prośba o opinię (B5)"| ENG_G1
    PUB_B6 --> EV_DISP
    EV_DISP -->|"blokada (Flaga 3)"| ENG_G4
    EV_DISP --> EFF_F3
    PUB_F2 --> EV_REVOK
    EV_REVOK --> EFF_OPUB
    EV_REVOK -->|"powiadomienie specjalisty"| ENG_G1

    PUB_PAY --> EV_PAYOK
    PUB_PAY --> EV_PAYRF
    EV_PAYOK --> ENG_G9
    EV_PAYRF --> ENG_G9
    ENG_G9 --> EFF_RECON
    ENG_G9 -->|"powiadomienia"| ENG_G1

    PUB_B9 --> EV_ERAS
    PUB_F5 --> EV_ERAS
    EV_ERAS --> ENG_G11
    PUB_A5Z --> EV_CONS
    EV_CONS -->|"rejestr zgód"| ENG_G11
    ENG_G11 --> EFF_AUD
    PUB_D3 --> EV_PROF
    EV_PROF --> ENG_G12
    ENG_G12 --> EFF_SMAP

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class PUB_A5,PUB_B3,PUB_E56,PUB_E7,PUB_E8,PUB_B6,PUB_F2,PUB_B9,PUB_F5,PUB_A5Z,PUB_D3 fe
    class EV_CREATED,EV_CANC,EV_LATE,EV_NOSHOW,EV_SLOT,EV_APPR,EV_DISP,EV_REVOK,EV_PAYOK,EV_PAYRF,EV_ERAS,EV_CONS,EV_PROF be
    class ENG_G1,ENG_G2,ENG_G3,ENG_G4,ENG_G6,ENG_G7,ENG_G8,ENG_G9,ENG_G10,ENG_G11,ENG_G12 be
    class EFF_MSG,EFF_GATE,EFF_E4,EFF_F4,EFF_OPUB,EFF_F3,EFF_RECON,EFF_SMAP,EFF_AUD,PUB_PAY,PUB_A6T be
```

## Notatki

**Konwencja diagramu (wyjątek od CLAUDE.md):** grupa G nie ma FE, więc WYJĄTKOWO brak subgraphów FE/BE — subgraphy grupują per domena (rezerwacje / wizyty i opinie / płatności / RODO-SEO). ClassDef `fe` (niebieski) oznacza flowy publikujące z udziałem człowieka (pacjent/specjalista/admin), `be` (pomarańczowy) — eventy, silniki i skutki backendowe. Eventy = kształt stadionu.

**Nazwy eventów:** kanoniczne z mapy/CLAUDE.md: `booking.created`, `booking.cancelled`, `booking.cancelled_late`, `visit.no_show`, `review.approved`. Pozostałe (`slot.released`, `visit.approved`, `dispute.opened`, `payment.succeeded`, `payment.refunded`, `rodo.erasure_requested`, `consent.recorded`, `profile.published`) — **nazwy robocze**, mapa nie definiuje pełnego katalogu; zgłoszone w rozbieżnościach.

**Charakterystyki silników bez własnego mini-diagramu:**
- **G1 Notification engine (P0):** kolejka email/SMS, szablony PL, retry, dedup, opt-out (preferencje B10); quiet hours — z promptu S4, poza mapą (założenie). Zasilany przez: A7/booking.created, odwołania, G2, G3, G6, G7 (komunikaty o sankcji), G9.
- **G2 Reminder T−24 h (P0):** scheduler przypomnień planowany na booking.created, wysyłka przez G1; działa tylko dla `confirmed` — odwołanie/zmiana terminu anuluje/przeplanowuje przypomnienie (założenie minimalne).
- **G3 Review ask T+2 h (P0):** timer po approvalu wizyty (`visit.approved` z E8/G4) → przez G1 SMS/email z single-use tokenem opinii (B5).
- **G8 Fraud detection (P1):** wzorce multikont, limity per numer/IP/device; konsumuje booking.created (serie rezerwacji); flagi → kolejka F4; P0 min. = ręczna blokada w F4.
- **G9 Payment webhooks (wg Flagi 2):** potwierdzenia (`pending_payment → confirmed`), zwroty, reconciliation; pełny flow płatności: [[a5-checkout-wariant-przedplata]].
- **G10 Calendar sync 2-way (P1/P2):** Google API po progu aktywnych specjalistów; konsumuje booking.created/cancelled.
- **G11 RODO joby (P0):** retencja logów IP/UA (job cykliczny, bez eventu), erasure job (B9, F5), rejestr zgód (A5, B9); dostęp do danych logowany w audit F10.
- **G12 SEO joby (P0):** sitemap + schema.org refresh; trigger: D3 go-live; refresh także cykliczny/przy zmianach profilu — założenie minimalne.
- **G13 Ops (P0):** backupy, monitoring, alerting — infrastrukturalny, nie event-driven; poza diagramem (metryki/alerty per silnik — prompt S4).
- **G5 Slot lock (P0):** timerowy (TTL 10 min), nie publikuje eventów domenowych (założenie) — szczegóły [[g5-slot-lock]].

**Flaga 2 (OTWARTA, decyzja z 2026-07-15 — dokumentujemy oba warianty):** domena płatności (G9, A6, `pending_payment`) aktywna tylko w wariancie z płatnościami online; bez nich sankcją scoringu G7 pozostaje wyłącznie akceptacja specjalisty ([[a5-checkout-wariant-akceptacja]]).

**Flaga 3:** `visit.no_show` i `dispute.opened` blokują G4 (auto-approval) — szczegóły [[g4-auto-approval]].

**Powiązania:** [[00-stany-rezerwacji]] (CORE-STANY — eventy przy przejściach stanów), [[g4-auto-approval]], [[g5-slot-lock]], [[g6-waitlist-engine]], [[g7-scoring-engine]], A5, A6, A7, B3, B4, B5, B6, B9, D3, E5, E6, E7, E8, F2, F3, F4, F5, F10.
