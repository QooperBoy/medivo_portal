# G7 — Scoring engine (event-driven)

```mermaid
flowchart TD
    subgraph BE["BE — pod spodem"]
        EV1(["booking.cancelled_late (B3)"])
        EV2(["visit.no_show (E7)"])
        EV3(["spór uznany (F3)"])
        COR["korekta licznika w dół"]
        CNT["licznik zdarzeń pacjenta"]
        P0N["P0 min.: licznik no-show"]
        TH{"próg przekroczony? (F8)"}
        LV{"które przekroczenie?"}
        SAN0["bez sankcji - tylko licznik"]
        SAN1["poziom 1: ostrzeżenie"]
        SAN2["poziom 2: gate w A5"]
        SAN3["poziom 3: blokada konta"]
    end
    subgraph FE["FE — widzi user"]
        FE1["komunikat o sankcji"]
        FE2["A5: wymagana przedpłata"]
        FE3["A5: wymagana akceptacja"]
        FE4["E4: wskaźnik no-show"]
        FE5["B6: przycisk 'byłem'"]
    end

    EV1 --> CNT
    EV2 --> CNT
    EV3 --> COR
    COR --> CNT
    CNT -.- P0N
    CNT --> TH
    CNT --> FE4
    TH -->|nie| SAN0
    TH -->|tak| LV
    LV -->|"1. raz"| SAN1
    LV -->|"2. raz"| SAN2
    LV -->|"kolejne (założenie)"| SAN3
    SAN1 --> FE1
    SAN3 -->|"odwołanie przez F3"| FE1
    SAN2 -->|"Flaga 2: wariant przedpłaty"| FE2
    SAN2 -->|"Flaga 2: wariant akceptacji"| FE3
    FE1 --> FE5
    FE5 -->|"ticket F3"| EV3

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class FE1,FE2,FE3,FE4,FE5 fe
    class EV1,EV2,EV3,COR,CNT,P0N,TH,LV,SAN0,SAN1,SAN2,SAN3 be
```

## Notatki
- Event-driven: wejścia `booking.cancelled_late` (B3) i `visit.no_show` (E7) — nazwy kanoniczne z CLAUDE.md.
- **P0 min. = licznik no-show** (mapa G7: "P0 min. → P1 pełny"); pełne progi i sankcje progresywne — P1.
- Progi scoringu konfigurowane per fork — parametry w F8.
- **Sankcje progresywne:** mapa rozstrzyga wprost tylko "2. raz: gate przedpłaty w A5" (ścieżka e2e "No-show + sankcja + spór"); poziom 1 (ostrzeżenie) i poziom 3 (blokada konta, odwołanie przez F3 "odwołania od blokad") — założenia minimalne, zgłoszone w rozbieżnościach.
- **⚠️ Flaga 2 (OTWARTA, decyzja z 2026-07-15 — oba warianty):** gate w checkout A5 = wymagana przedpłata ([[a5-checkout-wariant-przedplata]]) LUB wymagana akceptacja specjalisty ([[a5-checkout-wariant-akceptacja]]); bez płatności online w POC działa wyłącznie wariant akceptacji.
- Spór uznany (F3, stan `disputed → completed`) → korekta licznika w dół / cofnięcie sankcji — założenie minimalne (mapa nie rozstrzyga wprost).
- Wskaźnik no-show pacjenta w E4 (szczegóły rezerwacji u specjalisty) zasilany bezpośrednio licznikiem — widoczny niezależnie od progów.
- Komunikat o sankcji zawiera przycisk "byłem/byłam" (B6) → ticket F3 — pętla korekty na diagramie.
- Powiązania: [[00-katalog-eventow]] (CORE-EVENTY), [[b3-odwolanie-tokenem]] (B3), B6, E4, E7, F3, F8, G8, [[a5-checkout]] (A5), [[g4-auto-approval]].
