# B5 — Wystawienie opinii

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        LINK["Link z tokenem wizyty — G3"]
        FORM["Formularz opinii: ocena, treść"]
        BLAD["Token nieważny lub zużyty"]
        STATUS["Status: w moderacji"]
        OPUBLIKOWANA["Opinia opublikowana — A4"]
        ODRZUCONA["Opinia odrzucona + powód"]
    end
    subgraph BE["BE — pod spodem"]
        TOKEN{"Token ważny i niezużyty?"}
        ZUZYCIE["Token single-use: oznacz zużyty"]
        FILTR{"Auto-filtr: flaga?"}
        KOLEJKA["Kolejka moderacji F2"]
        DECYZJA{"Decyzja moderatora — F2"}
    end
    LINK --> TOKEN
    TOKEN -->|tak| FORM
    TOKEN -->|nie| BLAD
    FORM -->|wyślij| ZUZYCIE --> FILTR
    FILTR -->|flaga: priorytet| KOLEJKA
    FILTR -->|bez flagi| KOLEJKA
    KOLEJKA --> STATUS
    KOLEJKA --> DECYZJA
    DECYZJA -->|akceptacja| OPUBLIKOWANA
    DECYZJA -->|odrzucenie| ODRZUCONA
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class LINK,FORM,BLAD,STATUS,OPUBLIKOWANA,ODRZUCONA fe
    class TOKEN,ZUZYCIE,FILTR,KOLEJKA,DECYZJA be
```

## Notatki
- Formularz dostępny wyłącznie z tokenu wizyty; token wysyłany przez G3 (review ask T+2 h po approvalu wizyty w E8 lub auto-approvalu G4).
- Token single-use: zużywany przy wysłaniu opinii; ponowne wejście = komunikat "token zużyty".
- Auto-filtr: mapa nie definiuje reguł — założenie minimalne: wulgaryzmy / dane osobowe / dane zdrowotne → flaga z priorytetem. Do F2 trafia całość (auto-flagi + reszta), zgodnie z wierszem F2.
- Status moderacji widoczny dla pacjenta po wysłaniu (i w B2 przy wizycie — założenie); po decyzji: publikacja na profilu (A4, badge wiarygodności) lub odrzucenie z powodem.
- Wizyty dopisane ręcznie przez specjalistę (E4): prawo do opinii nierozstrzygnięte — ⚠️ Flaga 4.
- Powiązania: G3, G4, E8, F2, A4, B2, pipeline opinii (#1).
