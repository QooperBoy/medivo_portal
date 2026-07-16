# A5 — Checkout rezerwacji (wariant normalny)

```mermaid
sequenceDiagram
    autonumber
    actor P as Pacjent
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    participant MSG as SMS/Email

    P->>FE: wybiera usługę i widzi jej cenę
    P->>FE: wybiera konkretny termin wizyty (slot z profilu A4)
    FE->>API: prośba o zablokowanie wybranego terminu (lock slotu, G5)
    alt termin nadal wolny — blokada się udaje
        API->>API: blokuje termin na 10 minut (lock z TTL), stan: draft -> locked
        API-->>FE: potwierdza blokadę — formularz rezerwacji (checkout) otwarty
    else termin zajęty — ktoś inny właśnie go zarezerwował
        API-->>FE: zwraca błąd "ten termin jest już niedostępny"
        FE-->>P: pokazuje komunikat i cofa do wyboru innego terminu (A4/A8)
    end
    P->>FE: wskazuje, dla kogo jest wizyta: dla siebie / dziecka / innej osoby
    opt wizyta dla dziecka lub innej osoby (B7)
        P->>FE: wypełnia mini-profil podopiecznego (dane osoby, która przyjdzie na wizytę)
        P->>FE: zaznacza zgodę opiekuna na przetwarzanie danych dziecka (RODO)
    end
    P->>FE: podaje swoje dane kontaktowe — numer telefonu pełni rolę tożsamości
    FE->>API: prośba o wysłanie jednorazowego kodu weryfikacyjnego (OTP)
    API->>MSG: wysyła SMS z jednorazowym kodem (OTP) na podany numer
    alt kod SMS dotarł do pacjenta
        P->>FE: przepisuje kod z SMS-a do formularza
        FE->>API: przekazuje wpisany kod do sprawdzenia
        API->>API: kod poprawny — tworzy lekkie konto + osobną kartotekę pacjenta
    else kod SMS nie dotarł
        P->>FE: klika "wyślij kod ponownie"
        FE->>API: prośba o ponowną wysyłkę kodu (z limitem prób, zasady jak w B1)
        API->>MSG: wysyła ponowny SMS z kodem
    end
    P->>FE: zaznacza wymagane zgody RODO (checkboxy)
    FE->>API: zapisuje udzielone zgody
    API->>API: sprawdza wiarygodność pacjenta (scoring gate, G7)
    alt scoring w porządku — wariant normalny, bez dodatkowych warunków
        P->>FE: wybiera sposób zapłaty: online albo na miejscu w gabinecie
        P->>FE: sprawdza podsumowanie rezerwacji i klika "rezerwuję"
        FE->>API: zlecenie utworzenia rezerwacji
        alt wybrano płatność na miejscu (w gabinecie)
            API->>API: potwierdza wizytę od razu, stan: locked -> confirmed
            API->>API: generuje tokeny samoobsługi — linki do zarządzania wizytą (A7)
            API->>Q: zleca w tle wysyłkę powiadomień (G1)
            Q->>MSG: wysyła e-mail + SMS z linkiem zarządzania + plik .ics do kalendarza
            API-->>FE: pokazuje ekran sukcesu "wizyta umówiona" (A7)
        else wybrano płatność online (tu skrótowo — pełny przebieg to A6)
            API->>API: rezerwacja czeka na wpłatę, stan: locked -> pending_payment
            Note over FE,API: pełny przebieg płatności: [[a5-checkout-wariant-przedplata]]<br/>po potwierdzeniu wpłaty (webhook G9): confirmed + ekran A7
        end
    else bramka scoringowa: wymagana przedpłata z góry
        Note over FE,API: dalszy przebieg: [[a5-checkout-wariant-przedplata]]
    else bramka scoringowa: wymagana akceptacja specjalisty
        Note over FE,API: dalszy przebieg: [[a5-checkout-wariant-akceptacja]]
    end
    opt blokada terminu wygasła w trakcie (minęło 10 minut — TTL)
        API-->>FE: komunikat "czas na dokończenie rezerwacji minął"
        FE-->>P: pokazuje komunikat i cofa do wyboru terminu
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

## Co opisuje ten diagram
Główna ścieżka rezerwacji wizyty (checkout). Pacjent wybiera usługę i termin, system blokuje termin na 10 minut, pacjent podaje, dla kogo jest wizyta, potwierdza swój numer telefonu kodem SMS i akceptuje zgody. Następnie system automatycznie ocenia wiarygodność pacjenta (scoring) i — w wariancie normalnym — pozwala dokończyć rezerwację z płatnością na miejscu albo online. Flow kończy się ekranem potwierdzenia (A7) albo przejściem do jednego z wariantów sankcyjnych: przedpłaty lub akceptacji specjalisty.

## Aktorzy w tym flow

| Rola | Kto to jest | Co robi w tym flow |
|---|---|---|
| **Pacjent** | użytkownik strony; u logopedów najczęściej rodzic rezerwujący wizytę dla dziecka (B7) | wybiera usługę i termin, wskazuje dla kogo jest wizyta, potwierdza numer telefonu kodem SMS, akceptuje zgody i finalizuje rezerwację |
| **FE** (interfejs) | strona serwisu w przeglądarce pacjenta — to, co pacjent widzi na ekranie | prowadzi przez kolejne kroki formularza, pokazuje komunikaty o błędach oraz ekran sukcesu |
| **Backend** (system) | serwer platformy — część działająca po stronie serwisu, niewidoczna dla pacjenta | blokuje termin, wysyła i weryfikuje kod SMS, zakłada konto, sprawdza scoring, tworzy rezerwację i zmienia jej stany |
| **Joby/Kolejka** | zadania wykonywane w tle, poza główną „rozmową" pacjenta z systemem | przyjmuje zlecenia wysyłki powiadomień, żeby pacjent nie czekał na ich wysłanie |
| **SMS/Email** | bramka powiadomień — usługa wysyłająca SMS-y i e-maile | dostarcza kod OTP, potwierdzenie wizyty, link do zarządzania rezerwacją i plik .ics |

## Objaśnienie kroków

| Kroki (nr) | Co to znaczy w praktyce | Kto tu działa |
|---|---|---|
| 1–2 | Pacjent na profilu specjalisty (A4) wybiera konkretną usługę (widzi jej cenę) i wolny termin wizyty (slot). | Pacjent |
| 3–5 | Interfejs prosi system o zablokowanie wybranego terminu. Jeśli termin jest nadal wolny, system blokuje go na 10 minut wyłącznie dla tego pacjenta (tzw. lock; TTL to czas życia blokady) i otwiera formularz rezerwacji. Rezerwacja przechodzi ze szkicu (draft) w stan zablokowany (locked). Blokada chroni przed tym, żeby dwie osoby nie zarezerwowały tego samego terminu. | Pacjent, FE, Backend |
| 6–7 | Jeśli w międzyczasie ktoś inny zdążył zająć ten termin, pacjent widzi komunikat o niedostępności i wraca do wyboru innego terminu (A4) albo do widoku „brak terminów" (A8). | Backend, FE |
| 8 | Pacjent wskazuje, dla kogo jest wizyta: dla niego samego, dla dziecka albo dla innej osoby. | Pacjent |
| 9–10 | Jeśli wizyta jest dla dziecka lub innej osoby (B7): pacjent wypełnia mini-profil podopiecznego (dane osoby, która faktycznie przyjdzie na wizytę) i zaznacza zgodę opiekuna na przetwarzanie danych dziecka — wymóg RODO, czyli przepisów o ochronie danych osobowych. | Pacjent |
| 11–13 | Pacjent podaje swoje dane kontaktowe. Numer telefonu pełni rolę tożsamości — w serwisie nie ma loginu ani hasła. System wysyła na podany numer SMS z jednorazowym kodem (OTP), żeby sprawdzić, że numer naprawdę należy do rezerwującego. | Pacjent, FE, Backend, SMS/Email |
| 14–16 | Pacjent przepisuje kod z SMS-a, a system go sprawdza. Przy pierwszej rezerwacji powstaje „lekkie konto" (bez hasła) oraz osobna kartoteka pacjenta — podopiecznego można odróżnić od właściciela konta. | Pacjent, FE, Backend |
| 17–19 | Jeśli SMS nie dotarł: pacjent klika „wyślij kod ponownie" i dostaje nowy kod. Liczba prób jest ograniczona (ochrona przed nadużyciami — te same zasady co przy logowaniu B1). | Pacjent, FE, Backend, SMS/Email |
| 20–21 | Pacjent zaznacza wymagane zgody RODO (checkboxy), a system je zapisuje. | Pacjent, FE, Backend |
| 22 | Bramka scoringowa (scoring gate, G7): system automatycznie sprawdza historię pacjenta (np. wcześniejsze nieobecności na wizytach). Wynik decyduje, czy rezerwacja pójdzie normalnie, czy z dodatkowym warunkiem: przedpłatą z góry albo akceptacją specjalisty. | Backend |
| 23–25 | Wariant normalny (scoring w porządku): pacjent wybiera sposób zapłaty — online albo na miejscu w gabinecie — sprawdza podsumowanie i klika „rezerwuję". Interfejs zleca systemowi utworzenie rezerwacji. | Pacjent, FE, Backend |
| 26–30 | Płatność na miejscu: wizyta jest potwierdzana od razu (stan confirmed). System generuje tokeny samoobsługi (specjalne linki, którymi pacjent później zmieni lub odwoła wizytę bez logowania), zleca w tle wysyłkę powiadomień, a pacjent dostaje e-mail + SMS z linkiem zarządzania i plikiem .ics (termin do wgrania do kalendarza). Na koniec ekran sukcesu (A7). | Backend, Joby/Kolejka, SMS/Email, FE |
| 31 | Płatność online: rezerwacja przechodzi w stan oczekiwania na wpłatę (pending_payment). Pełny przebieg płatności opisuje osobny diagram [[a5-checkout-wariant-przedplata]] — po potwierdzeniu wpłaty (webhook G9) rezerwacja stanie się confirmed. | Backend |
| 32–33 | Scenariusz brzegowy: jeśli 10-minutowa blokada terminu (TTL) wygaśnie w trakcie wypełniania formularza, pacjent widzi komunikat „czas minął" i wraca do wyboru terminu. | Backend, FE |

## Powiązane diagramy
| ID | Diagram | Jak się łączy |
|---|---|---|
| CORE-STANY | [../00-core/00-stany-rezerwacji.md](../00-core/00-stany-rezerwacji.md) | używa kanonicznych stanów rezerwacji (draft → locked → … → confirmed) |
| A4 | [a4-profil-specjalisty.md](a4-profil-specjalisty.md) | źródło wybranego slotu; powrót przy zajętym slocie lub wygasłym locku |
| A5 (przedpłata) | [a5-checkout-wariant-przedplata.md](a5-checkout-wariant-przedplata.md) | dalszy flow, gdy scoring gate wymaga przedpłaty; zawiera pełne A6 |
| A5 (akceptacja) | [a5-checkout-wariant-akceptacja.md](a5-checkout-wariant-akceptacja.md) | dalszy flow, gdy scoring gate wymaga akceptacji specjalisty |
| A6 | [a5-checkout-wariant-przedplata.md](a5-checkout-wariant-przedplata.md) | pełny przebieg płatności online (tu potraktowany skrótowo) |
| A7 | [a7-potwierdzenie.md](a7-potwierdzenie.md) | ekran sukcesu i tokeny samoobsługi po przejściu do confirmed |
| A8 | [a8-brak-slotow.md](a8-brak-slotow.md) | powrót, gdy slot został zajęty w międzyczasie |
| B1 | [../b-pacjent-konto/b1-logowanie.md](../b-pacjent-konto/b1-logowanie.md) | te same zasady OTP: limit prób i rate limiting |
| B7 | [../b-pacjent-konto/b7-pacjent-podopieczny.md](../b-pacjent-konto/b7-pacjent-podopieczny.md) | rezerwacja dla dziecka/innej osoby — mini-profil podopiecznego |
| G1 | [../00-core/00-katalog-eventow.md](../00-core/00-katalog-eventow.md) | wysyłka powiadomień (email + SMS) po potwierdzeniu |
| G5 | [../g-silniki/g5-slot-lock.md](../g-silniki/g5-slot-lock.md) | mechanizm locka slotu z TTL 10 min |
| G7 | [../g-silniki/g7-scoring-engine.md](../g-silniki/g7-scoring-engine.md) | scoring gate decyduje o wariancie checkoutu |

## Słownik
| Pojęcie | Wyjaśnienie |
|---|---|
| Checkout | Proces finalizowania rezerwacji — od wyboru terminu do potwierdzenia wizyty. |
| Slot | Konkretny wolny termin wizyty w kalendarzu specjalisty. |
| Lock | Czasowa blokada wybranego terminu, żeby nikt inny nie zajął go w trakcie rezerwacji. |
| TTL | Czas życia blokady — tu 10 minut, po których lock wygasa. |
| OTP | Jednorazowy kod SMS potwierdzający, że numer telefonu należy do rezerwującego. |
| Scoring gate | Automatyczna bramka oceniająca wiarygodność pacjenta i decydująca, czy wymagać przedpłaty albo akceptacji. |
| Lekkie konto | Konto tworzone automatycznie przy pierwszej rezerwacji, bez hasła — tożsamością jest numer telefonu. |
| Token samoobsługi | Specjalny link, którym pacjent później zmieni lub odwoła wizytę bez logowania. |
| RODO | Przepisy o ochronie danych osobowych; wymagają zgód, szczególnie na dane dziecka. |
| .ics | Plik z terminem wizyty do dodania do kalendarza (Google, Outlook itp.). |
| Enqueue | Wstawienie zadania (np. wysyłki powiadomień) do kolejki wykonywanej w tle. |
| pending_payment / pending_approval | Stany rezerwacji oczekującej odpowiednio na płatność online albo na akceptację specjalisty. |
| draft / locked / confirmed | Kanoniczne stany rezerwacji: szkic (nic jeszcze nie zablokowane) → termin zablokowany na czas checkoutu → wizyta umówiona. Pełna lista stanów w CORE-STANY. |
| Scoring | Wewnętrzna punktacja wiarygodności pacjenta (historia nieobecności i późnych odwołań), na której opiera się scoring gate. |
| Kartoteka pacjenta (encja) | Osobny wpis w systemie o osobie, która przyjdzie na wizytę — może to być podopieczny inny niż właściciel konta. |
| Webhook (G9) | Automatyczne powiadomienie od procesora płatności o zaksięgowanej wpłacie — przy płatności online to ono potwierdza rezerwację. |
| Scenariusz brzegowy (edge case) | Rzadszy, ale przewidziany przebieg zdarzeń: termin zajęty w międzyczasie, kod SMS nie dochodzi, blokada wygasa w trakcie. |
