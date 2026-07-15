# A5 — Checkout rezerwacji (wariant normalny)

```mermaid
sequenceDiagram
    autonumber
    actor P as Pacjent
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    participant MSG as SMS/Email

    P->>FE: wybór usługi (cena)
    P->>FE: wybór slotu (z A4)
    FE->>API: POST lock slotu (G5)
    alt slot wolny
        API->>API: lock TTL 10 min, draft -> locked
        API-->>FE: checkout otwarty
    else slot zajęty w międzyczasie
        API-->>FE: błąd "slot niedostępny"
        FE-->>P: powrót do wyboru slotu (A4/A8)
    end
    P->>FE: dla kogo: ja / dziecko / inna osoba
    opt dziecko lub inna osoba (B7)
        P->>FE: mini-profil podopiecznego
        P->>FE: zgoda opiekuna (RODO dane dziecka)
    end
    P->>FE: dane rezerwującego (numer = tożsamość)
    FE->>API: POST wysyłka OTP
    API->>MSG: SMS z kodem OTP
    alt kod dochodzi
        P->>FE: wpisanie kodu OTP
        FE->>API: POST weryfikacja OTP
        API->>API: lekkie konto + osobna encja pacjenta
    else OTP nie dochodzi
        P->>FE: klik "wyślij ponownie"
        FE->>API: retry OTP (limit prób, B1)
        API->>MSG: ponowny SMS z kodem
    end
    P->>FE: zgody RODO (checkboxy)
    FE->>API: POST zapis zgód
    API->>API: scoring gate (G7)
    alt scoring OK — wariant normalny
        P->>FE: wybór: płatność online / na miejscu
        P->>FE: podsumowanie + klik "rezerwuję"
        FE->>API: POST utworzenie rezerwacji
        alt płatność na miejscu
            API->>API: locked -> confirmed
            API->>API: generacja tokenów samoobsługi (A7)
            API->>Q: enqueue G1 (powiadomienia)
            Q->>MSG: email + SMS (token zarządzania) + .ics
            API-->>FE: ekran sukcesu (A7)
        else płatność online (skrót A6)
            API->>API: locked -> pending_payment
            Note over FE,API: pełny flow płatności: [[a5-checkout-wariant-przedplata]]<br/>po webhooku G9: confirmed + A7
        end
    else gate: wymagana przedpłata
        Note over FE,API: dalszy flow: [[a5-checkout-wariant-przedplata]]
    else gate: wymagana akceptacja specjalisty
        Note over FE,API: dalszy flow: [[a5-checkout-wariant-akceptacja]]
    end
    opt lock wygasł w trakcie (TTL 10 min)
        API-->>FE: komunikat "czas na rezerwację minął"
        FE-->>P: powrót do wyboru slotu
    end
```

## Notatki
- Stany rezerwacji: tylko kanoniczne z CORE-STANY (draft -> locked TTL 10 min -> pending_payment | pending_approval -> confirmed).
- G5: lock slotu 10 min od wejścia w checkout; wygaśnięcie locka może wystąpić na dowolnym kroku — diagram pokazuje to jako opt na końcu; założenie minimalne: powrót do wyboru slotu bez utraty wpisanych danych (mapa nie rozstrzyga).
- B7 (pacjent ≠ rezerwujący): "dla kogo: ja / dziecko / inna osoba", mini-profil podopiecznego jako osobna encja pacjenta powiązana z kontem rezerwującego; zgoda opiekuna + RODO dane dziecka (Flaga 1).
- OTP SMS: numer telefonu = tożsamość; przy 1. rezerwacji tworzone lekkie konto + osobna encja pacjenta; rate limiting i limit prób — jak w B1.
- Scoring gate (G7): punkt decyzyjny; progi -> skutki. Warianty: [[a5-checkout-wariant-przedplata]] (przedpłata), [[a5-checkout-wariant-akceptacja]] (akceptacja specjalisty).
- A7 (potwierdzenie): ekran sukcesu, generacja tokenów samoobsługi (TTL/single-use — otwarta decyzja, S1), email + SMS z linkiem zarządzania, .ics, enqueue G1.
- Ścieżka płatności online potraktowana skrótowo — pełne A6 w [[a5-checkout-wariant-przedplata]].
- Edge case'y z mapy: slot zajęty w międzyczasie (przy locku), OTP nie dochodzi (retry), lock wygasł w trakcie.
- ⚠️ Flaga 2 (płatności online w POC): OTWARTA — decyzją użytkownika z 2026-07-15 dokumentujemy oba warianty (pełny checkout z płatnością online oraz rezerwację za akceptacją specjalisty).
- Powiązania: CORE-STANY, G5, G7, B7, A7, A6, A4, A8, B1, G1, [[a5-checkout-wariant-przedplata]], [[a5-checkout-wariant-akceptacja]].
