# A5 — Checkout: wariant akceptacji specjalisty (scoring gate)

```mermaid
sequenceDiagram
    autonumber
    actor P as Pacjent
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    actor S as Specjalista
    participant MSG as SMS/Email

    Note over P,API: kroki jak w [[a5-checkout]]<br/>aż do scoring gate (G7)
    API->>API: scoring gate (G7): wymagana akceptacja
    API-->>FE: info "rezerwacja wymaga akceptacji"
    P->>FE: podsumowanie + klik "wyślij prośbę"
    FE->>API: POST utworzenie rezerwacji
    API->>API: locked -> pending_approval
    API->>Q: enqueue G1 (powiadomienie specjalisty)
    Q->>MSG: SMS/email do specjalisty
    API-->>FE: ekran "czekamy na akceptację"
    alt specjalista akceptuje
        S->>API: akceptacja w panelu (E4)
        API->>API: pending_approval -> confirmed
        API->>API: generacja tokenów samoobsługi (A7)
        API->>Q: enqueue G1 (powiadomienia)
        Q->>MSG: pacjent: potwierdzenie + token + .ics
    else specjalista odrzuca
        S->>API: odrzucenie w panelu (E4)
        API->>API: pending_approval -> cancelled_by_specialist
        API->>Q: zwolniony slot -> waitlista (G6)
        Q->>MSG: pacjent: powiadomienie o odrzuceniu
    else brak reakcji — timeout (założenie: 24 h)
        Q->>API: timeout akceptacji
        API->>API: pending_approval -> cancelled_by_specialist
        API->>Q: zwolniony slot -> waitlista (G6)
        Q->>MSG: pacjent: anulacja z braku reakcji
    end
```

## Notatki
- Wariant scoring gate (G7): rezerwacja tylko za ręczną akceptacją specjalisty w panelu E4 ("ręczna akceptacja, gdy scoring wymaga").
- Timeout braku reakcji specjalisty: MAPA NIE ROZSTRZYGA — założenie minimalne: 24 h od utworzenia, potem auto-anulacja; zgłoszone w rozbieżnościach.
- Odrzucenie i timeout mapowane na cancelled_by_specialist (kanon CORE-STANY nie ma stanu "rejected") — założenie minimalne.
- Zwolniony slot po odrzuceniu/timeout trafia do waitlisty (G6) — analogicznie do B3/E5.
- Propozycje alternatyw dla pacjenta po odrzuceniu (wzorzec E5/A8: podobni specjaliści, inne sloty) — mapa nie rozstrzyga dla tego wariantu, pominięto.
- Kroki wcześniejsze (usługa, slot, lock G5, B7 "dla kogo", OTP, zgody RODO) — identyczne jak w [[a5-checkout]].
- Po akceptacji: pełne A7 (tokeny samoobsługi, email + SMS z linkiem zarządzania, .ics, enqueue G1).
- ⚠️ Flaga 2 (płatności online w POC): OTWARTA — decyzją użytkownika z 2026-07-15 dokumentujemy oba warianty; ten wariant jest zarazem fallbackiem sankcji, gdyby POC ruszył bez płatności online (zamiast [[a5-checkout-wariant-przedplata]]).
- Powiązania: CORE-STANY, G5, G7, B7, A7, E4, G1, G6, [[a5-checkout]], [[a5-checkout-wariant-przedplata]].

## Co opisuje ten diagram
Wariant rezerwacji, w którym system — na podstawie scoringu pacjenta — wymaga, aby specjalista ręcznie zaakceptował prośbę o wizytę. Uczestniczą pacjent, specjalista (działający w swoim panelu) oraz system wysyłający powiadomienia. Flow zaczyna się od decyzji bramki scoringowej „wymagana akceptacja", a kończy potwierdzeniem wizyty po akceptacji albo anulacją i zwolnieniem terminu, gdy specjalista odrzuci prośbę lub nie zareaguje w ciągu 24 godzin.

## Powiązane diagramy
| ID | Diagram | Jak się łączy |
|---|---|---|
| CORE-STANY | [../00-core/00-stany-rezerwacji.md](../00-core/00-stany-rezerwacji.md) | stany kanoniczne: pending_approval → confirmed / cancelled_by_specialist |
| A5 | [a5-checkout.md](a5-checkout.md) | wspólne kroki początkowe (lock, B7, OTP, zgody) aż do scoring gate |
| A5 (przedpłata) | [a5-checkout-wariant-przedplata.md](a5-checkout-wariant-przedplata.md) | alternatywna sankcja gate'u (przedpłata), którą ten wariant zastępuje bez płatności online |
| A7 | [a7-potwierdzenie.md](a7-potwierdzenie.md) | po akceptacji pełne potwierdzenie: tokeny, email + SMS, .ics |
| A8 | [a8-brak-slotow.md](a8-brak-slotow.md) | wzorzec „podobni specjaliści" po odrzuceniu (tu świadomie pominięty) |
| B3 | [../b-pacjent-konto/b3-odwolanie-tokenem.md](../b-pacjent-konto/b3-odwolanie-tokenem.md) | analogiczny mechanizm zwalniania slotu na waitlistę |
| B7 | [../b-pacjent-konto/b7-pacjent-podopieczny.md](../b-pacjent-konto/b7-pacjent-podopieczny.md) | krok „dla kogo wizyta" we wcześniejszej, wspólnej części flow |
| E4 | [../e-panel/e4-rezerwacje.md](../e-panel/e4-rezerwacje.md) | specjalista akceptuje lub odrzuca prośbę w panelu rezerwacji |
| E5 | [../e-panel/e5-odwolanie-pojedyncze.md](../e-panel/e5-odwolanie-pojedyncze.md) | analogia: zwalnianie slotu i propozycje alternatyw dla pacjenta |
| G1 | [../00-core/00-katalog-eventow.md](../00-core/00-katalog-eventow.md) | powiadomienia do specjalisty (prośba) i pacjenta (wynik) |
| G5 | [../g-silniki/g5-slot-lock.md](../g-silniki/g5-slot-lock.md) | lock slotu we wcześniejszych, wspólnych krokach checkoutu |
| G6 | [../g-silniki/g6-waitlist-engine.md](../g-silniki/g6-waitlist-engine.md) | slot zwolniony po odrzuceniu/timeoucie trafia na waitlistę |
| G7 | [../g-silniki/g7-scoring-engine.md](../g-silniki/g7-scoring-engine.md) | źródło decyzji o wymaganej ręcznej akceptacji |

## Słownik
| Pojęcie | Wyjaśnienie |
|---|---|
| Scoring gate | Automatyczna bramka oceniająca wiarygodność pacjenta; tu skutkuje wymogiem ręcznej akceptacji. |
| pending_approval | Stan rezerwacji czekającej na decyzję specjalisty. |
| Akceptacja / odrzucenie | Decyzja specjalisty w panelu, czy przyjmuje prośbę o wizytę. |
| Timeout | Limit czasu na reakcję specjalisty (założone 24 h); po jego upływie rezerwacja anuluje się sama. |
| cancelled_by_specialist | Stan rezerwacji anulowanej po stronie specjalisty (odrzucenie lub brak reakcji). |
| Waitlista | Lista oczekujących powiadamianych o zwolnionym terminie. |
| Token samoobsługi | Link dla pacjenta do zarządzania wizytą bez logowania, generowany po akceptacji. |
| .ics | Plik z terminem wizyty do dodania do kalendarza pacjenta. |
| Fallback | Rozwiązanie zapasowe — ten wariant zastępuje przedpłatę, gdyby serwis ruszył bez płatności online. |
