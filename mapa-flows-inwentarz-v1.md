# Mapa flows — kompletny inwentarz (v1)

Dokument-matka. Każdy flow za długi na mapę → osobny czat → osobny plik .md → wiki-link tutaj (konwencja Obsidian). Prompty do tych czatów: sekcja 10.

## 0. Konwencja

- **FE** = customer-facing: ekrany, formularze, e-maile/SMS-y, które widzi użytkownik
- **BE** = co wpada pod spód: API, encje, joby, integracje
- **P0** = POC/launch (Kraków, logopedzi) · **P1** = po walidacji / pierwsi aktywni specjaliści · **P2** = później
- **🔗** = do rozpisania w osobnym oknie → link do promptu w sekcji 10 lub do istniejącego promptu #1–6 (plik `prompty-todo-dokumenty-v2.md`)

---

## 1. GRUPA A — Pacjent: część publiczna (do momentu rezerwacji)

| ID | Flow | FE (widzi user) | BE (pod spodem) | P | 🔗 |
|---|---|---|---|---|---|
| A1 | Wejście SEO/direct | landing wertykalu, `/{miasto}`, `/uslugi/{usluga}/{miasto}` | SSR/SSG, sitemap, schema.org, analytics | P0 | S5 |
| A2 | Wyszukiwanie | pole usługa/specjalista + miasto/dzielnica, toggle online/stacjonarnie, filtry (najbliższy termin, cena, płeć, język), sortowanie | search API + indeks, geokodowanie, ranking wg jawnych reguł (Omnibus → `/jak-dzialaja-wyniki`) | P0 | S5 |
| A3 | Lista wyników | karta: foto, badge PWZ, ocena, adres/dystans, **inline sloty** (3–5 najbliższych), paginacja, pusty stan | availability batch API (live z grafików E2) | P0 | S5 |
| A4 | Profil specjalisty | bio, badge "PWZ zweryfikowany", adresy+mapa, usługi+ceny, pełny kalendarz, opinie z badge'ami wiarygodności + odpowiedzi specjalisty | profile/reviews/availability API, schema.org | P0 | S5 |
| A5 | **Checkout rezerwacji** | usługa (cena) → slot → **dla kogo: ja/dziecko/inna osoba** → dane → OTP SMS → zgody RODO → płatność online/na miejscu → podsumowanie | lock slotu 10 min (G5), OTP, utworzenie lekkiego konta + encji pacjenta, **scoring gate** (przedpłata? akceptacja specjalisty?), rezerwacja | P0 | **S1** |
| A6 | Płatność online | redirect/embed procesora, ekran wyniku, obsługa błędu | payment intent, webhook (G9), okno na płatność + auto-anulacja (ZL: 30 min — benchmark) | ⚠️ Flaga 2 | S1 |
| A7 | Potwierdzenie | ekran sukcesu + email + SMS z linkiem zarządzania (token) + `.ics` dla pacjenta | generacja tokenów samoobsługi, enqueue G1 | P0 | — |
| A8 | Brak slotów | podobni specjaliści w okolicy + „powiadom mnie, gdy zwolni się termin" | similar API, wpis do waitlisty (G6) | P1 | — |
| A9 | Strony statyczne | `/cennik`, `/jak-dzialaja-wyniki`, `/regulamin`, `/prywatnosc`, `/pomoc` | CMS lub hardcode na start | P0 | — |

## 2. GRUPA B — Pacjent: konto i samoobsługa (po rezerwacji)

| ID | Flow | FE | BE | P | 🔗 |
|---|---|---|---|---|---|
| B1 | Logowanie | OTP na telefon (numer = tożsamość) / magic link email; bez haseł | OTP service, sesje, rate limiting | P0 | — |
| B2 | Moje wizyty | nadchodzące / historia, statusy | bookings API | P0 min. | — |
| B3 | Zmiana/odwołanie tokenem | link z SMS/email bez logowania, tylko zweryfikowany kanał; nowy slot lub odwołanie | walidacja tokenu (TTL, single-use?), polityka X h, event scoringu (G7), zwolniony slot → waitlista (G6), powiadomienia obu stron | P0 | #6 |
| B4 | Waitlista | zapis, powiadomienie o zwolnieniu, okno 2 h potwierdź/auto-book | FIFO engine (G6) | P1 | #6 |
| B5 | Wystawienie opinii | formularz tylko z tokenu wizyty, status moderacji | token single-use, auto-filtr, kolejka F2 | P0 | #1 |
| B6 | Spór no-show | przycisk „byłem/byłam" w komunikacie o sankcji | ticket → F3 | P1 | #4 |
| B7 | **Pacjent ≠ rezerwujący** | „dla kogo wizyta": ja / **dziecko** / inna osoba; mini-profil podopiecznego | osobna encja pacjenta powiązana z kontem rezerwującego; zgoda opiekuna; RODO: dane dziecka | **P0** | ⚠️ Flaga 1 |
| B8 | Formularz przedwizytowy | ankieta przed 1. wizytą (wywiad logopedyczny o dziecku) po potwierdzeniu | forms engine, odpowiedzi widoczne w E4 | P2 | — |
| B9 | RODO self-service | eksport danych, usunięcie konta, zarządzanie zgodami | erasure job (G11), audit (F10) | P0 min. | — |
| B10 | Preferencje powiadomień | kanały, zgody marketingowe | prefs | P1 | — |

## 3. GRUPA C — Specjalista: część publiczna B2B

| ID | Flow | FE | BE | P |
|---|---|---|---|---|
| C1 | Landing `/dla-specjalistow` | value prop, „0 zł przez 6 mies., potem od X zł/mies.", social proof, FAQ | — | P0 |
| C2 | Cennik B2B | na start 1 plan (free) + zapowiedź płatnych | — | P0 |
| C3 | Rejestracja | email + telefon (OTP), nr PWZ | konto, walidacja formatu PWZ, start D1 | P0 |

## 4. GRUPA D — Specjalista: onboarding

| ID | Flow | FE | BE | P | 🔗 |
|---|---|---|---|---|---|
| D1 | Weryfikacja PWZ | status na żywo + SLA „do 24 h roboczych" | automat (rejestr KRL/KIF/wet.) + fallback do kolejki F1 | P0 | #5 |
| D2 | Stan „w trakcie" | pełna edycja profilu (usługi, ceny, **adresy — multi**, zdjęcia, grafik), FAQ, **konto demo** | draft profile (niepubliczny), demo dataset | P0 | — |
| D3 | Go-live | 1 klik po weryfikacji → profil publiczny | publikacja, sitemap update, mail powitalny | P0 | — |

## 5. GRUPA E — Specjalista: panel

| ID | Flow | FE | BE | P | 🔗 |
|---|---|---|---|---|---|
| E1 | Dashboard | dzisiejsze wizyty, nowe rezerwacje, alerty (spory, opinie, status subskrypcji) | agregacje | P0 | S2 |
| E2 | Grafik/dostępność | godziny pracy **per adres**, blokady pojedynczych godzin, długość slotu per usługa, widok dzień/tydzień | model dostępności → zasila A3/A4 | P0 | S2 |
| E3 | Usługi i ceny | CRUD ze słownika wertykalu: cena, czas, online/stacjonarnie | services API + słownik forka | P0 | S2 |
| E4 | Rezerwacje | lista/kalendarz, szczegóły (dane minimalne + **wskaźnik no-show pacjenta**), **ręczne dopisanie wizyty offline**, ręczna akceptacja (gdy scoring wymaga) | bookings API | P0 | ⚠️ Flaga 4 |
| E5 | Odwołanie/przesunięcie pojedyncze | powód z szablonu → podgląd ludzkiego komunikatu do pacjenta | auto-propozycje (inne sloty / podobni), slot → waitlista, licznik odwołań specjalisty | P0 | #6 |
| E6 | Tryb urlop/choroba | zakres dat → podgląd dotkniętych wizyt → bulk | hurtowe powiadomienia, priorytet 24 h dla poszkodowanych | P1 | #6 |
| E7 | No-show | przycisk „nie stawił się" | event scoringu (G7), sankcje progresywne | P0 | #4 |
| E8 | Approval wizyt + opinie | lista wizyt do potwierdzenia („odbyła się"), lista opinii + odpowiedź (wzorce bez danych zdrowotnych) | pipeline opinii, timer auto-approval (G4) | P0 | #1 |
| E9 | Eksport .ics | tokenizowany URL feedu do Google/Apple | generator .ics | P0 | #3 |
| E10 | Statystyki | wyświetlenia profilu, konwersja, no-show rate | analytics pipeline | P1 | — |
| E11 | Ustawienia | dane, adresy, zdjęcia, dane do faktur | — | P0 | — |
| E12 | Subskrypcja/billing | plan, metoda płatności, faktury; **licznik „free do DD.MM" od dnia 1** | billing engine, faktury VAT | P1 (widoczność P0) | #2 |
| E13 | Zgłoszenie abuse | „podejrzewam blokowanie kalendarza" | ticket → F4, anulowanie serii | P1 | #4 |
| E14 | Widget rezerwacji | embed kalendarza na stronie/FB specjalisty | embed script, CORS | P2 (ZL ma; wspiera „nie porzucaj obecnych kanałów") | — |
| E15 | Placówka/zespół | konto placówki, wielu specjalistów, „specjalista zastępczy" | RBAC, multi-kalendarz | P2 | — |

## 6. GRUPA F — Back Office (jeden fizycznie, multi-wertykal)

| ID | Flow | Zakres | P |
|---|---|---|---|
| F1 | Kolejka weryfikacji PWZ | zgłoszenia, dane+dowody, approve/reject z powodem, SLA timer | P0 |
| F2 | Moderacja opinii | kolejka (auto-flagi + całość), decyzja + powód, historia | P0 |
| F3 | Spory | no-show „byłem", kwestionowane opinie, odwołania od blokad | P1 |
| F4 | Anty-abuse | flagi wzorców (G8), przegląd IP/device, blokady, anulowanie serii | P0 min. (ręczna blokada) → P1 |
| F5 | Użytkownicy | wyszukiwarka, podgląd **z audytem dostępu**, blokada, obsługa wniosków RODO | P0 |
| F6 | Billing admin | subskrypcje, faktury, windykacja | P1 |
| F7 | CMS/SEO | treści landing/miasto/usługa per fork | P0 hardcode → P1 UI |
| F8 | Konfiguracja forka | słownik usług, brand, źródło weryfikacji, **parametry** (progi scoringu, X h odwołań) | P0 plik konfig. → P1 UI |
| F9 | RBAC + filtr wertykali | role adminów, widok per serwis | P0 (trywialne przy 1 serwisie) |
| F10 | Audit log | kto co widział/zmienił (dane zdrowotne!) | P0 zapis → P1 viewer |

## 7. GRUPA G — System: silniki i joby (czysty backend, zero FE)

| ID | Silnik | Zakres | P | 🔗 |
|---|---|---|---|---|
| G1 | Notification engine | kolejka email/SMS, szablony PL, retry, dedup, opt-out | P0 | S4 |
| G2 | Reminder T−24 h | scheduler przypomnień | P0 | S4 |
| G3 | Review ask T+2 h | po approvalu wizyty | P0 | #1 |
| G4 | Auto-approval T+48 h | **zablokowany przy no-show/sporze** | P0 | ⚠️ Flaga 3 |
| G5 | Slot lock | TTL 10 min od wejścia w checkout | P0 | S1 |
| G6 | Waitlist engine | FIFO, okno 2 h, kaskada do następnego | P1 | #6 |
| G7 | Scoring engine | event-driven; progi → skutki (gate w A5, E4) | P0 min. (licznik no-show) → P1 pełny | #4 |
| G8 | Fraud detection | wzorce multikont, limity per numer/IP/device | P1 | #4 |
| G9 | Payment webhooks | potwierdzenia, zwroty, reconciliation | wg Flagi 2 | S1 |
| G10 | Calendar sync 2-way | Google API po progu aktywnych | P1/P2 | #3 |
| G11 | RODO joby | retencja logów IP/UA, erasure, rejestr zgód | P0 | — |
| G12 | SEO joby | sitemap, schema.org refresh | P0 | S5 |
| G13 | Ops | backupy, monitoring, alerting | P0 | — |

---

## 8. Ścieżki end-to-end (kompozycje flowów)

| Ścieżka | Sekwencja |
|---|---|
| Pacjent nowy (happy path) | A1 → A2 → A3 → A4 → A5 (z B7 dziecko) → [A6] → A7 → G2 → wizyta → E8 approval → G3 → B5 → F2 → publikacja opinii |
| Pacjent zmienia termin | A7 (link) → B3 → G6 → B4 (inny pacjent z waitlisty dostaje slot) |
| Specjalista: od landing do 1. rezerwacji | C1 → C3 → D1 (F1) → D2 → D3 → E2 → E3 → widoczny w A3/A4 → E4 |
| No-show + sankcja + spór | wizyta → E7 → G7 → (2. raz: gate przedpłaty w A5) → B6 → F3 |
| Sabotaż slotów | seria rezerwacji → G8 flaga → F4 → anulowanie serii → E13 potwierdza |
| Dzień admina | F1 → F2 → F3 → F4 |

## 9. Mapowanie: flow → istniejący TODO-dokument (`prompty-todo-dokumenty-v2.md`)

| Prompt | Pokrywa flowy |
|---|---|
| #1 Pipeline opinii | B5, E8, F2, G3, G4 |
| #2 Model subskrypcji | C2, E12, F6 |
| #3 Kalendarz i integracje | E9, G10 (+ wsad do E2) |
| #4 Scoring + anty-abuse | B6, E7, E13, F3, F4, G7, G8 |
| #5 Research weryfikacji | D1, F1 |
| #6 Polityka odwołań | B3, B4, E5, E6, G6 |

Nowe prompty poniżej (T1–T2, S1–S5) pokrywają resztę: checkout, wyszukiwarkę/SEO, panel, Back Office, silniki.

---

## 10. PROMPTY DO OSOBNYCH OKIEN

### 🧭 T1 — Tour po ZnanyLekarz (okno z Claude in Chrome)

```
ZADANIE: Zrób systematyczny audyt UX/funkcjonalny serwisu ZnanyLekarz.pl (strona pacjenta + oferta B2B). Używasz przeglądarki (Claude in Chrome). Buduję konkurencyjny marketplace rezerwacji (nisza: logopedzi, model subskrypcyjny), więc dokumentujesz każdy ekran pod kątem: co skopiować, co zrobić lepiej, czego unikać.

ZASADY BEZPIECZEŃSTWA (bezwzględne):
- NIE finalizujesz żadnej rezerwacji u prawdziwego lekarza. Przechodzisz booking flow TYLKO do ekranu poprzedzającego wiążący submit — dokumentujesz pola i cofasz się.
- NIE podajesz prawdziwych danych osobowych, NIE zakładasz kont, NIE wysyłasz formularzy kontaktowych/B2B, NIE klikasz „umów/rezerwuj/zapłać/wyślij".
- Cookie banner: odrzuć zbędne zgody.
- Jeśli jakiś krok wymaga submitu, żeby zobaczyć następny ekran — zanotuj „ściana: wymaga submitu" i idź dalej.

ETAPY (po każdym: notatki wg formatu na dole):
1. STRONA GŁÓWNA + STRUKTURA: nawigacja, wyszukiwarka na home, sekcje, footer (mapa linków), wzorce URL (miasta, specjalizacje, usługi, profile).
2. WYSZUKIWANIE: wyszukaj „logopeda Kraków". Udokumentuj: wszystkie filtry (termin, online/stacjonarnie, cena, płeć, język, NFZ/prywatnie, dzielnica...), sortowanie, jak zbudowana karta wyniku (czy sloty inline, ile, jaki CTA), paginację, pusty stan (wyszukaj coś rzadkiego), komunikat o zasadach kolejności wyników (Omnibus).
3. PROFIL SPECJALISTY: otwórz 2–3 profile (różne plany = różny wygląd?). Elementy: badge weryfikacji, adresy/mapa, usługi+ceny, kalendarz (widok, zakres dat), opinie (struktura, oznaczenia „wizyta zweryfikowana"?, odpowiedzi lekarza), sekcja pytań od pacjentów, artykuły, certyfikaty, wideo.
4. BOOKING FLOW (do ściany, bez submitu): kliknij slot → spisz KAŻDY krok: wybór usługi, dla kogo wizyta (czy jest opcja „dla dziecka/innej osoby"?), pola formularza + walidacje, wymóg konta vs guest, weryfikacja telefonu (kiedy, jak), zgody (treść checkboxów!), opcje płatności (przedpłata obowiązkowa u niektórych? okno czasowe na płatność — podobno 30 min), komunikaty o polityce odwołań.
5. KONTO PACJENTA: ekran logowania/rejestracji (metody: email/telefon/social?), co obiecuje konto (moje wizyty, dokumenty?), flow „przypomnij hasło" — dokumentuj bez zakładania konta.
6. ZARZĄDZANIE WIZYTĄ: poszukaj w pomocy/FAQ jak wygląda odwołanie/zmiana (link z maila? z konta?), polityka odwołań pacjenta, lista oczekujących (jak pacjent się zapisuje, jak dostaje slot).
7. OFERTA B2B (pro.znanylekarz.pl): plany Starter/Plus/VIP — spisz aktualne ceny (punkt odniesienia: 399–799 zł/mies. netto + opłata 26–32 zł za wizytę nowego pacjenta — zweryfikuj!), różnice funkcji per plan, prowizję od Płatności (1,99–2,99%?), proces rejestracji lekarza (kroki do ściany), demo, Program Poleceń, ZnanyLekarz Phone, widget/przycisk Google.
8. CONTENT/SEO: blog, „zapytaj lekarza" (Q&A), strony usług — jak zbudowane pod long-tail.
9. PRAWNE/TRUST: regulamin (wyciąg: odwołania, no-show, opinie), polityka prywatności, strona o zasadach publikacji opinii, pomoc/FAQ pacjenta.

FORMAT NOTATEK per ekran:
| URL | Cel ekranu | Elementy FE (lista) | Pola formularzy + walidacje | Co triggeruje (mail/SMS — jeśli wiadomo) | Ocena UX (1–5) | Do skopiowania | Do zrobienia lepiej / anty-wzorzec |

NA KONIEC: (a) pełna mapa struktury URL, (b) top 10 rzeczy do skopiowania, (c) top 10 słabości ZL = nasze przewagi, (d) lista rzeczy, których nie dało się zobaczyć bez konta/submitu — do decyzji Marcina, czy zakładamy konto testowe. Zapisz całość jako raport .md.
```

### 🧭 T2 — Tour po konkurencji zagranicznej (osobne okno, web research bez logowania)

```
ZADANIE: Research porównawczy flow rezerwacji i oferty B2B: Doctolib (FR/DE), Zocdoc (US), Booksy (usługi zdrowotne/beauty, PL). Buduję polski marketplace rezerwacji dla logopedów (subskrypcja, konkurencja: ZnanyLekarz). Użyj wyszukiwania + wejdź na strony publiczne; NIE zakładaj kont, NIE wysyłaj formularzy.

Dla każdej platformy:
1. Booking flow pacjenta: kroki, wymóg konta vs guest, weryfikacja (SMS?), opcja „wizyta dla dziecka/bliskiego", przedpłaty, polityka odwołań/no-show (progi, sankcje)
2. Waitlista / powiadomienia o zwolnionych slotach — jak rozwiązane
3. Opinie: skąd wiadomo, że wizyta się odbyła (weryfikacja), moderacja, odpowiedzi
4. Model biznesowy B2B: subskrypcja vs prowizja, ceny, co w planach, okres próbny
5. Kalendarz specjalisty: integracje (Google?), sync dwukierunkowy, widget na własną stronę
6. 3 rozwiązania UX, których nie ma ZnanyLekarz — kandydaci na naszą przewagę

FORMAT: tabela porównawcza (wiersze = wymiary wyżej, kolumny = platformy) + sekcja „wnioski dla nas" (10 punktów). Minimum prozy.
```

### 📄 S1 — Spec: Checkout pacjenta (A5 + A6 + B1 + B7)

```
KONTEKST: Marketplace rezerwacji wizyt (start: logopedzi, Kraków). ZAŁĄCZ do czatu pliki: mapa-flows-inwentarz-v1.md + architektura v2. Kluczowe decyzje: guest checkout odrzucony; lekkie konto + obowiązkowa weryfikacja SMS przy 1. rezerwacji (numer = tożsamość); płatność online lub na miejscu; lock slotu 10 min; scoring może wymusić przedpłatę lub akceptację specjalisty; WAŻNE: u logopedów pacjentem jest zwykle dziecko, rezerwuje rodzic (encja pacjent ≠ rezerwujący, zgoda opiekuna, RODO dane dziecka).

ZADANIE: Pełny spec checkoutu, ekran po ekranie:
1. Diagram stanów rezerwacji (draft → locked → pending_payment/pending_approval → confirmed → ...) + TTL-e
2. Każdy ekran: pola, walidacje (frontend+backend), komunikaty błędów PL, stany brzegowe (lock wygasł w trakcie, OTP nie dochodzi, slot zajęty w międzyczasie, płatność timeout)
3. Krok „dla kogo wizyta": UX wyboru ja/dziecko/inna osoba, minimalny zakres danych podopiecznego, zapis do przyszłych rezerwacji
4. Zgody RODO: które checkboxy, które obowiązkowe, treści robocze
5. Warianty wg scoring gate: normalny / wymagana przedpłata / wymagana akceptacja specjalisty — różnice w flow
6. Metryki lejka do zbierania od dnia 1 (drop-off per krok)
7. Lista endpointów API + encji (dla Andrzeja) — nazwy, pola, kto woła

FORMAT: diagram tekstowy + tabele per ekran, minimum prozy. Na końcu: otwarte decyzje + rekomendacje.
```

### 📄 S2 — Spec: Panel specjalisty + model dostępności (E1–E5, E7–E11)

```
KONTEKST: jw. ZAŁĄCZ: mapa-flows-inwentarz-v1.md + architektura v2. Panel = codzienne narzędzie specjalisty; konkurencyjny benchmark: kalendarz ZnanyLekarz (widoki dzień/tydzień/lista, blokady godzin, notatki przy wizycie, wizyty odwołane w widoku).

ZADANIE:
1. Model dostępności (serce systemu): godziny pracy per adres, wyjątki/blokady, długość slotu per usługa, bufory między wizytami, wizyty cykliczne (logopedia = terapie co tydzień!) — model danych + algorytm generowania slotów dla A3/A4
2. Spec ekranów panelu: dashboard, grafik (widoki), rezerwacje (lista+szczegóły+ręczne dopisanie wizyty offline), odwołanie z szablonem, no-show, approval wizyt, opinie+odpowiedź, .ics, ustawienia — per ekran: elementy, akcje, stany
3. Wizyty cykliczne: rezerwacja serii przez specjalistę (pacjent stały co wtorek 16:00) — flow + wpływ na dostępność publiczną
4. Mobile-first: specjalista obsługuje panel z telefonu między wizytami — co musi działać jedną ręką
5. API + encje dla Andrzeja

FORMAT: tabele per ekran + model danych, minimum prozy. Otwarte decyzje + rekomendacje na końcu.
```

### 📄 S3 — Spec: Back Office (F1–F10)

```
KONTEKST: jw. ZAŁĄCZ: mapa-flows-inwentarz-v1.md + architektura v2. Back Office jeden fizycznie dla wszystkich wertykali (filtr per serwis), obsługa: 3-osobowy zespół założycielski (Marcin: operacje). Kolejki: weryfikacja PWZ (SLA 24 h robocze), moderacja opinii, spory, anty-abuse.

ZADANIE:
1. Spec każdego modułu F1–F10: widoki, akcje, uprawnienia, SLA
2. Przepływ pracy 1 osoby: ile minut dziennie przy 10/50/200 specjalistach — gdzie automatyzować najpierw
3. Audyt dostępu do danych wrażliwych (RODO): co logujemy, jak prezentujemy dane pacjenta adminowi (minimalizacja)
4. Model uprawnień (RBAC) na 3 osoby + przyszłych moderatorów
5. Priorytet budowy: co w P0 może być SQL-em/arkuszem, a co musi mieć UI od razu

FORMAT: tabele, minimum prozy. Otwarte decyzje + rekomendacje.
```

### 📄 S4 — Spec techniczny: silniki systemowe (G1–G13) — dla Andrzeja

```
KONTEKST: jw. ZAŁĄCZ: mapa-flows-inwentarz-v1.md + architektura v2. Istniejący codebase: backend+frontend klona platformy rezerwacyjnej. Architektura: core repo-matka + forki per wertykal; Back Office wspólny.

ZADANIE: Spec techniczny silników:
1. Architektura eventowa: katalog zdarzeń domenowych (booking.created, booking.cancelled, visit.no_show, review.approved...), kto publikuje/konsumuje
2. Per silnik G1–G13: trigger, wejście/wyjście, idempotencja, retry, co przy awarii (np. SMS gateway down w momencie T−24 h)
3. Notification engine: szablony, priorytety kanałów, dedup, quiet hours, opt-out, wybór dostawcy SMS PL (porównaj 2–3: ceny, API)
4. Timery (T−24 h, T+2 h, T+48 h, lock 10 min, okno 2 h waitlisty): implementacja (cron vs delayed jobs vs scheduler) — rekomendacja pod istniejący stack [WPISZ STACK]
5. Kolizje: lock slotu vs równoległy checkout, waitlista vs ręczne dopisanie wizyty, sync kalendarza vs rezerwacja
6. Obserwowalność: metryki per silnik, alerty P0

FORMAT: tabele + pseudokod tam, gdzie trzeba. Otwarte decyzje techniczne na końcu.
```

### 📄 S5 — Spec: Wyszukiwarka + programmatic SEO (A1–A4, G12)

```
KONTEKST: jw. ZAŁĄCZ: mapa-flows-inwentarz-v1.md + architektura v2. Struktura URL ustalona (landing, /{miasto}, /uslugi/{usluga}/{miasto}, /{imie-nazwisko}/{miasto}). GTM: long-tail SEO to główny kanał pozyskania pacjentów. Ranking wyników MUSI być transparentny (Omnibus, `/jak-dzialaja-wyniki`) i bez języka rankingującego w medycynie.

ZADANIE:
1. Algorytm rankingu wyników: sygnały dozwolone prawnie (dostępność terminów, dystans, kompletność profilu, opinie zweryfikowane), wagi, treść strony /jak-dzialaja-wyniki
2. Filtry P0 vs P1 — których naprawdę potrzebuje niszа logopedyczna (np. „terapia dwujęzyczna", wiek dziecka, online)
3. Programmatic SEO: matryca stron usługa×miasto×dzielnica dla logopedii (lista fraz long-tail z wolumenami — wyszukaj), szablon treści strony (unikalność!), internal linking, schema.org
4. Wyszukiwarka technicznie: indeks (Postgres full-text vs Meilisearch/Typesense — rekomendacja pod mały zespół), synonimy PL, literówki
5. Pusty stan / mało wyników w mieście (cold start Kraków): co pokazujemy, żeby nie wyglądać martwo
6. Metryki: pozycje, CTR, konwersja wyszukiwanie→profil→checkout

FORMAT: tabele + lista fraz, minimum prozy. Otwarte decyzje + rekomendacje.
```

---

## 11. FLAGI (do decyzji, zanim polecą osobne czaty)

1. **B7 — dziecko jako pacjent**: architektura v2 tego nie ma, a u logopedów to przypadek domyślny (rezerwuje rodzic). Wniosek: abstrakcja „podopieczny" (booker ≠ patient) od razu w core — weterynarz dostaje wtedy encję zwierzęcia tym samym mechanizmem, zero forka logiki. RODO: dane dziecka + zgoda opiekuna.
2. **Płatności online w POC — konflikt decyzji**: wcześniejsza decyzja = POC bez płatności online (mniejsza ekspozycja prawna, KNF); architektura v2 (F1/F7) zakłada online + sankcje przedpłatą. Jeśli POC bez online → poziom sankcji „wymóg przedpłaty" nie działa → fallback: „rezerwacja tylko za akceptacją specjalisty". Rozstrzygnąć przed S1.
3. **G4 auto-approval T+48 h**: musi być zablokowany, gdy wizyta ma oznaczony no-show lub otwarty spór — inaczej system „potwierdza" wizytę, która się nie odbyła (fałszywy badge + zepsuty scoring).
4. **E4 ręczne dopisywanie wizyt offline**: czy taka wizyta uprawnia do opinii? Ryzyko: kanał do lewych opinii (specjalista dopisuje znajomych). ZL nie pobiera opłat za wizyty wpisane ręcznie, ale u nas problem dotyczy wiarygodności opinii. Propozycja: wizyty ręczne bez prawa do opinii publicznej (albo osobny, słabszy badge) — do rozstrzygnięcia w czacie promptu #1.
