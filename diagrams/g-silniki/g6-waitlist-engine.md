# G6 — Waitlist engine (FIFO, okno 2 h)

```mermaid
sequenceDiagram
    autonumber
    actor P as Pacjent
    participant FE as FE
    participant API as Backend
    participant Q as Joby/Kolejka
    actor S as Specjalista
    participant MSG as SMS/Email

    Note over API,Q: pacjenci zapisali się wcześniej na listę oczekujących (waitlistę) w A8/B4
    API->>Q: serwer publikuje event slot.released - zwolnił się termin (odwołanie B3/E5/E6)
    Q->>Q: silnik sprawdza kolejkę oczekujących FIFO (kto pierwszy się zapisał) dla tego specjalisty i usługi
    alt kolejka pusta - nikt nie czeka na ten termin
        Q->>API: termin od razu wraca do publicznej puli wolnych terminów (A3/A4)
    else w kolejce ktoś czeka
        Q->>MSG: silnik zleca powiadomienie pierwszej osoby z kolejki
        MSG-->>P: pacjent dostaje SMS/e-mail z linkiem do potwierdzenia terminu (B4)
        Q->>Q: silnik uruchamia okno 2 godzin na odpowiedź pacjenta
        alt pacjent potwierdza termin w ciągu 2 godzin
            P->>FE: pacjent klika "potwierdź termin" w otrzymanej wiadomości (B4)
            FE->>API: strona prosi serwer o automatyczną rezerwację terminu (POST auto-book)
            API->>API: serwer tworzy rezerwację od razu w stanie confirmed (wizyta umówiona)
            API->>Q: serwer publikuje event booking.created i kolejkuje powiadomienia (G1)
            Q->>MSG: silnik zleca wysyłkę potwierdzenia rezerwacji dla pacjenta (A7)
            Q->>MSG: silnik zleca powiadomienie specjalisty o nowej wizycie
            MSG-->>S: specjalista dostaje wiadomość o nowej wizycie z waitlisty
        else pacjent nie reaguje przez 2 godziny
            Q->>Q: okno 2 godzin upływa bez odpowiedzi (timeout)
            Q->>Q: kaskada - propozycja terminu przechodzi do następnej osoby z kolejki (FIFO)
            Q->>MSG: silnik zleca powiadomienie kolejnego pacjenta z listy
            Note over Q,MSG: pętla powtarza się, aż kolejka oczekujących się wyczerpie
            Q->>API: kolejka wyczerpana - termin wraca do publicznej puli
        end
    end
```

## Notatki
- Wejścia silnika: zapis na waitlistę z A8 ("powiadom mnie, gdy zwolni się termin") i B4; zwolnienie slotu: B3 (odwołanie pacjenta), E5/E6 (odwołanie specjalisty), odrzucenie/timeout `pending_approval` ([[a5-checkout-wariant-akceptacja]]), timeout płatności ([[a5-checkout-wariant-przedplata]]).
- FIFO per specjalista/usługa — założenie minimalne (jak w [[b4-waitlista]]); mapa mówi tylko "FIFO".
- Okno 2 h "potwierdź/auto-book": potwierdzenie tworzy rezerwację automatycznie, od razu `confirmed`, bez pełnego checkoutu A5 — założenie minimalne (jak w B4); pominięcie płatności i scoring gate przy auto-booku to otwarta kwestia (⚠️ Flaga 2 pośrednio).
- Brak reakcji w 2 h → kaskada do następnego z kolejki; kolejka wyczerpana → slot wraca do publicznej dostępności (A3/A4) — założenie minimalne.
- Rezygnacja pacjenta z wpisu nieopisana w mapie — założenie: natychmiastowa kaskada do następnego (jak w B4).
- `slot.released` — nazwa robocza eventu (CORE-EVENTY).
- Powiązania: [[b4-waitlista]] (B4), [[00-katalog-eventow]] (CORE-EVENTY), A8, B3, E5, E6, G1, A7, ścieżka e2e "Pacjent zmienia termin".

## Co opisuje ten diagram

Diagram opisuje silnik listy oczekujących: co robi system, gdy zwolni się termin, na który ktoś czekał. Pacjenci zapisują się na waitlistę, gdy brakuje wolnych slotów; kiedy jakiś slot się zwalnia (np. przez odwołanie wizyty), system powiadamia SMS-em lub e-mailem pierwszą osobę z kolejki i daje jej 2 godziny na potwierdzenie. Uczestniczą pacjent, specjalista (dostaje informację o nowej wizycie) oraz system działający w tle. Flow kończy się automatyczną rezerwacją dla pacjenta z kolejki albo — gdy nikt nie zareaguje — powrotem terminu do publicznej puli.

## Aktorzy w tym flow

| Rola | Kto to jest | Co robi w tym flow |
|---|---|---|
| **Joby/Kolejka** | zadania działające w tle serwera — główny "aktor" tego silnika: całą kaskadę prowadzi automat, człowiek tylko wyzwala zdarzenia (odwołanie wizyty, kliknięcie linku) | prowadzi kolejkę oczekujących FIFO, pilnuje okna 2 godzin, przechodzi kaskadą do kolejnych osób, zleca powiadomienia i zwraca termin do puli |
| **System** (Backend) | serwer platformy | publikuje event `slot.released` po zwolnieniu terminu, tworzy automatyczną rezerwację (auto-book) i publikuje event `booking.created` |
| **Pacjent** | użytkownik strony (zwykle rodzic rezerwujący wizytę dla dziecka), zapisany wcześniej na waitlistę | dostaje propozycję zwolnionego terminu i potwierdza ją linkiem z wiadomości — albo nie reaguje i propozycja przechodzi dalej |
| **Specjalista** | logopeda/lekarz — właściciel kalendarza, z którego zwolnił się termin | uczestniczy biernie: dostaje powiadomienie, że z waitlisty powstała u niego nowa wizyta |
| **SMS/Email** | bramka powiadomień — system wysyłający wiadomości w imieniu platformy | dostarcza pacjentowi link do potwierdzenia terminu, a specjaliście informację o nowej wizycie |
| **FE** | frontend — strona internetowa w przeglądarce pacjenta | przyjmuje kliknięcie "potwierdź termin" i przekazuje serwerowi prośbę o automatyczną rezerwację |

## Objaśnienie kroków

| Krok | Co to znaczy w praktyce | Kto tu działa |
|---|---|---|
| 1 | Gdzieś w systemie zwolnił się termin — odwołał go pacjent (B3) albo specjalista (E5/E6). Serwer publikuje event `slot.released` ("zwolnił się termin") — sygnał, na który czeka ten silnik. Serwer jest tu **publisherem** (nadawcą) eventu, a silnik waitlisty jego **konsumentem** (odbiorcą). | System |
| 2 | Silnik zagląda do kolejki oczekujących prowadzonej w porządku **FIFO** (first in, first out — kto pierwszy się zapisał, ten pierwszy dostaje propozycję), osobnej dla każdego specjalisty i usługi. | Joby/Kolejka |
| 3 | Jeśli nikt nie czeka — nie ma komu proponować, więc termin natychmiast wraca do publicznej puli wolnych terminów (widocznej w wyszukiwarce A3 i na profilu specjalisty A4). | Joby/Kolejka, System |
| 4–5 | W kolejce ktoś czeka: silnik zleca bramce wysyłkę SMS-a/e-maila do pierwszej osoby. W wiadomości jest link, którym pacjent może potwierdzić termin (B4). | Joby/Kolejka, SMS/Email, Pacjent |
| 6 | Rusza **okno 2 h** — od tej chwili pacjent ma dokładnie 2 godziny na potwierdzenie; po tym czasie propozycja przepada na rzecz następnej osoby z kolejki. | Joby/Kolejka |
| 7–8 | Pacjent klika "potwierdź termin", a strona prosi serwer o **auto-book** — rezerwację tworzoną automatycznie, bez przechodzenia pełnego formularza checkoutu (A5). | Pacjent, FE |
| 9–10 | Serwer tworzy rezerwację od razu w stanie `confirmed` (wizyta umówiona) i publikuje event `booking.created` ("powstała nowa rezerwacja"), który uruchamia silnik powiadomień G1. | System |
| 11–13 | Silnik zleca dwie wiadomości: potwierdzenie rezerwacji dla pacjenta (takie samo jak po zwykłej rezerwacji, A7) i informację dla specjalisty, że z waitlisty powstała u niego nowa wizyta. | Joby/Kolejka, SMS/Email, Specjalista |
| 14–15 | Pacjent nie zareagował w ciągu 2 godzin (**timeout**). Rusza **kaskada**: propozycja terminu automatycznie przechodzi do następnej osoby z kolejki, zgodnie z porządkiem FIFO. | Joby/Kolejka |
| 16 | Silnik zleca powiadomienie kolejnego pacjenta — i cykl (wiadomość → okno 2 h → ewentualny timeout) powtarza się dla każdej następnej osoby z listy. | Joby/Kolejka, SMS/Email |
| 17 | Gdy kolejka się wyczerpie i nikt nie potwierdził, termin wraca do publicznej puli — od tej pory może go zarezerwować każdy przez zwykły checkout. | Joby/Kolejka, System |

## Powiązane diagramy

| ID | Diagram | Jak się łączy |
|---|---|---|
| B4 | [b4-waitlista.md](../b-pacjent-konto/b4-waitlista.md) | widok pacjenta: zapis na waitlistę i potwierdzanie terminu z linku |
| A8 | [a8-brak-slotow.md](../a-pacjent-public/a8-brak-slotow.md) | drugie wejście silnika — zapis na waitlistę przy braku wolnych terminów |
| B3 | [b3-odwolanie-tokenem.md](../b-pacjent-konto/b3-odwolanie-tokenem.md) | odwołanie wizyty przez pacjenta zwalnia slot (event `slot.released`) |
| E5 | [e5-odwolanie-pojedyncze.md](../e-panel/e5-odwolanie-pojedyncze.md) | odwołanie pojedynczej wizyty przez specjalistę zwalnia slot |
| E6 | [e6-tryb-urlop.md](../e-panel/e6-tryb-urlop.md) | tryb urlop/choroba specjalisty zwalnia sloty hurtowo |
| A5 | [a5-checkout.md](../a-pacjent-public/a5-checkout.md) | auto-book z waitlisty pomija pełny checkout — rezerwacja od razu `confirmed` |
| A5 | [a5-checkout-wariant-akceptacja.md](../a-pacjent-public/a5-checkout-wariant-akceptacja.md) | odrzucenie lub timeout akceptacji specjalisty także zwalnia slot |
| A5 | [a5-checkout-wariant-przedplata.md](../a-pacjent-public/a5-checkout-wariant-przedplata.md) | timeout płatności w wariancie przedpłaty także zwalnia slot |
| A7 | [a7-potwierdzenie.md](../a-pacjent-public/a7-potwierdzenie.md) | pacjent z waitlisty dostaje takie samo potwierdzenie rezerwacji |
| A3 | [a3-lista-wynikow.md](../a-pacjent-public/a3-lista-wynikow.md) | po wyczerpaniu kolejki slot wraca na publiczną listę wyników |
| A4 | [a4-profil-specjalisty.md](../a-pacjent-public/a4-profil-specjalisty.md) | zwolniony slot staje się znów widoczny na profilu specjalisty |
| G1 | [00-katalog-eventow.md](../00-core/00-katalog-eventow.md) | powiadomienia SMS/e-mail wysyła notification engine |
| CORE-EVENTY | [00-katalog-eventow.md](../00-core/00-katalog-eventow.md) | eventy `slot.released` i `booking.created` figurują w katalogu eventów |
| E2E-2 | [e2e-2-zmiana-terminu.md](../e2e/e2e-2-zmiana-terminu.md) | waitlista jest ogniwem ścieżki e2e "Pacjent zmienia termin" |

## Słownik

| Pojęcie | Wyjaśnienie |
|---|---|
| Waitlista | Lista oczekujących pacjentów, którzy chcą dostać powiadomienie, gdy zwolni się termin. |
| FIFO | Kolejność obsługi "kto pierwszy się zapisał, ten pierwszy dostaje propozycję" (first in, first out). |
| Okno 2 h | Czas, jaki powiadomiony pacjent ma na potwierdzenie terminu, zanim propozycja przejdzie dalej. |
| Kaskada | Automatyczne przechodzenie propozycji do kolejnej osoby z kolejki, gdy poprzednia nie zareaguje. |
| Auto-book | Rezerwacja tworzona automatycznie po kliknięciu "potwierdź termin", bez przechodzenia pełnego checkoutu. |
| Slot | Pojedynczy wolny termin wizyty w kalendarzu specjalisty. |
| Event `slot.released` | Komunikat systemowy "zwolnił się termin", który uruchamia ten silnik. |
| Event `booking.created` | Komunikat systemowy "powstała nowa rezerwacja", uruchamiający m.in. powiadomienia. |
| Timeout | Upłynięcie limitu czasu (tu: okna 2 h) bez reakcji pacjenta. |
| Pula publiczna | Wolne terminy widoczne dla wszystkich w wyszukiwarce i na profilu specjalisty. |
| Flaga 2 | Otwarta decyzja projektowa o wariancie checkoutu (przedpłata vs akceptacja), pośrednio dotycząca auto-booku. |
| Publisher / konsument eventu | Publisher to część systemu, która ogłasza zdarzenie (np. "zwolnił się termin"); konsument to silnik, który na to zdarzenie reaguje. |
| G1 (notification engine) | Silnik powiadomień — wspólna "skrzynka nadawcza" platformy, przez którą wychodzą wszystkie SMS-y i e-maile (CORE-EVENTY). |
| Backend / FE | Backend to serwer platformy (niewidoczny dla użytkownika); FE to strona internetowa w przeglądarce pacjenta. |
| Joby/Kolejka | Zadania działające w tle serwera (timery, kolejki) — automat prowadzący ten silnik bez udziału człowieka. |
| POST | Techniczna nazwa żądania, którym strona prosi serwer o wykonanie operacji (tu: automatyczną rezerwację terminu). |
| `confirmed` | Stan kanoniczny "wizyta umówiona" — pełny cykl stanów rezerwacji opisuje CORE-STANY. |
