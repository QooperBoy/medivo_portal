# F1 — Kolejka weryfikacji PWZ

```mermaid
flowchart TD
    subgraph FE["FE — widzi admin"]
        KOLEJKA["Kolejka zgłoszeń PWZ"]
        TIMER["TIMER SLA: 24 h robocze"]
        ALERT["Alert: SLA przekroczone"]
        SZCZEGOLY["Zgłoszenie: dane + dowody"]
        REJESTR["Podgląd rejestru (KRL/KIF)"]
        DECYZJA{"Decyzja"}
        APPROVE["Approve"]
        REJECT["Reject + powód"]
    end

    subgraph BE["BE — pod spodem"]
        AUTOMAT["Automat rejestru (D1)"]
        FALLBACK["Fallback: wpis do kolejki"]
        SLAJOB["Job: odlicza SLA"]
        STATUSOK["Specjalista: zweryfikowany"]
        STATUSNO["Specjalista: odrzucony + powód"]
        AUDYT["Zapis decyzji + audyt (F10)"]
        MSGS["Powiadomienie specjalisty (G1)"]
        STATUSLIVE["Status na żywo w D1"]
        GOLIVE["Odblokowany go-live (D3)"]
    end

    AUTOMAT -->|"rozstrzygnął"| STATUSOK
    AUTOMAT -->|"nie rozstrzygnął"| FALLBACK
    FALLBACK --> KOLEJKA
    FALLBACK --> SLAJOB
    SLAJOB --> TIMER
    TIMER -->|"przekroczone 24 h"| ALERT
    KOLEJKA --> SZCZEGOLY
    SZCZEGOLY --> REJESTR
    REJESTR --> DECYZJA
    DECYZJA -->|"approve"| APPROVE
    DECYZJA -->|"reject"| REJECT
    APPROVE --> STATUSOK
    REJECT --> STATUSNO
    STATUSOK --> AUDYT
    STATUSNO --> AUDYT
    AUDYT --> MSGS
    MSGS --> STATUSLIVE
    STATUSOK --> GOLIVE

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class KOLEJKA,TIMER,ALERT,SZCZEGOLY,REJESTR,DECYZJA,APPROVE,REJECT fe
    class AUTOMAT,FALLBACK,SLAJOB,STATUSOK,STATUSNO,AUDYT,MSGS,STATUSLIVE,GOLIVE be
```

## Notatki
- Priorytet: P0. SLA: 24 h robocze — obietnica z [[d1-weryfikacja-pwz]] (D1: „status na żywo + SLA do 24 h roboczych"); timer SLA startuje przy wpisie do kolejki, przekroczenie = alert dla admina.
- Kolejka zasilana wyłącznie fallbackiem automatu D1 (rejestr KRL/KIF/wet.) — gdy automat rozstrzyga sam, F1 jest pomijane.
- Reject zawsze z powodem — powód trafia do specjalisty (G1) i do widoku statusu w D1.
- Approve odblokowuje go-live 1 klikiem → [[d3-go-live]] (D3).
- Każda decyzja zapisywana w audycie F10 (kto, kiedy, jaki powód).
- Założenie minimalne: mapa nie przewiduje ścieżki „poproś o uzupełnienie dowodów" — nie dodano (byłby to krok spoza mapy); jeśli potrzebna, to decyzja do S3/#5.
- Powiązania: D1, D3, F10, G1, prompt #5 (research weryfikacji).
