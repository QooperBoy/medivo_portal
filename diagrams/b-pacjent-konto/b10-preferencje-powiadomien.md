# B10 — Preferencje powiadomień

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        EKRAN["Ekran preferencji powiadomień"]
        KANALY["Kanały: SMS / email"]
        MARKETING["Zgody marketingowe: włącz/wyłącz"]
        ZAPISZ["Zapis preferencji"]
        POTW["Potwierdzenie zapisu"]
        INFO["Info: transakcyjne zawsze aktywne"]
    end
    subgraph BE["BE — pod spodem"]
        WALID{"Min. 1 kanał transakcyjny?"}
        PREFS["prefs: zapis preferencji"]
        REJESTR["Rejestr zgód — G11"]
        G1READ["G1 czyta prefs przy wysyłce"]
    end
    EKRAN --> KANALY --> ZAPISZ
    EKRAN --> MARKETING --> ZAPISZ
    ZAPISZ --> WALID
    WALID -->|tak| PREFS --> POTW
    WALID -->|nie| INFO --> KANALY
    PREFS --> REJESTR
    PREFS --> G1READ
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class EKRAN,KANALY,MARKETING,ZAPISZ,POTW,INFO fe
    class WALID,PREFS,REJESTR,G1READ be
```

## Notatki
- P1; pacjent zarządza kanałami (SMS/email) i zgodami marketingowymi; opt-out z G1 dotyczy marketingu.
- Założenie minimalne: powiadomień transakcyjnych (potwierdzenia, przypomnienia T−24 h, tokeny samoobsługi) nie można wyłączyć całkowicie — wymagany min. 1 aktywny kanał; mapa nie rozstrzyga.
- Zmiana zgód marketingowych zapisywana w rejestrze zgód (G11) — spójnie z B9 (tam pełne zarządzanie zgodami RODO, tu podzbiór marketingowy).
- Granularność per typ powiadomienia (przypomnienia vs opinie vs waitlista) — mapa nie definiuje; założenie: tylko kanały + marketing.
- Powiązania: G1, G2, G11, B9.
