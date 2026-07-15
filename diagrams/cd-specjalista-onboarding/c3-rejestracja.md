# C3 — Rejestracja specjalisty

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        WEJSCIE["wejście z C1/C2"] --> FORM["formularz: email, telefon, PWZ"]
        FORM --> SUBMIT["wysłanie formularza"]
        BLADPWZ["błąd: niepoprawny format PWZ"] --> FORM
        OTPEKRAN["ekran: wpisz kod OTP"] --> KOD["wpisanie kodu"]
        RETRY["'wyślij ponownie' — limit prób"]
        SUKCES["konto utworzone"] --> DALEJ["status weryfikacji — D1/D2"]
    end
    subgraph BE["BE — pod spodem"]
        WALID{"format PWZ poprawny?"}
        OTPSEND["wysyłka OTP SMS"]
        OTPCHECK{"kod OTP poprawny?"}
        KONTO["utworzenie konta specjalisty"]
        STARTD1["start procesu D1"]
    end
    SUBMIT --> WALID
    WALID -->|nie| BLADPWZ
    WALID -->|tak| OTPSEND
    OTPSEND --> OTPEKRAN
    KOD --> OTPCHECK
    OTPCHECK -->|nie lub wygasł| RETRY
    RETRY -.-> OTPSEND
    OTPCHECK -->|tak| KONTO
    KONTO --> STARTD1
    STARTD1 --> SUKCES
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class WEJSCIE,FORM,SUBMIT,BLADPWZ,OTPEKRAN,KOD,RETRY,SUKCES,DALEJ fe
    class WALID,OTPSEND,OTPCHECK,KONTO,STARTD1 be
```

## Notatki
- Wg mapy FE: email + telefon (OTP), nr PWZ; BE: utworzenie konta, walidacja **formatu** PWZ, start D1.
- Walidacja formatu PWZ ≠ weryfikacja w rejestrze — merytoryczną weryfikację robi dopiero [[d1-weryfikacja-pwz]] (automat KRL/KIF + fallback F1). Błąd formatu zatrzymuje się na formularzu, nie tworzy stanu w CORE-WERYFIKACJA.
- Kolejność kroków (najpierw walidacja formatu PWZ, potem OTP, potem utworzenie konta) — założenie minimalne; mapa nie rozstrzyga kolejności.
- OTP: limit prób / rate limiting — założenie przez analogię do B1 (mapa dla C3 tego nie precyzuje). Edge case „OTP nie dochodzi" pokryty pętlą retry.
- Po sukcesie konto ląduje w stanie `zarejestrowany` → `weryfikacja_auto` (CORE-WERYFIKACJA); specjalista trafia do panelu w stanie „w trakcie" ([[d2-stan-w-trakcie]]).
- Powiązania: C1, C2, [[d1-weryfikacja-pwz]], [[d2-stan-w-trakcie]], CORE-WERYFIKACJA, B1 (analogia OTP).
