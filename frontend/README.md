# ZnanyPsycholog — FE (mock)

Front-end marketplace'u rezerwacji wizyt u psychologów i psychoterapeutów.

**Iteracja 0 — Fundament**: scaffold, warstwa domenowa (stany/eventy kanoniczne),
zamockowany backend (MSW), design system i narzędzie **BE Inspector** do podglądu
ruchu do (udawanego) backendu.

**Iteracja 1 — Publiczna ścieżka pacjenta**: działające na mockach ekrany
wyszukiwania (A2/A3), profilu specjalisty (A4), checkoutu z lockiem slotu (A5)
i potwierdzenia (A7) — z demonstracją kanonicznego cyklu `draft → locked →
confirmed` w BE Inspectorze — oraz autorska warstwa graficzna (inline-SVG
ilustracje i doodle).

> Backend jest w 100% **zamockowany** (Mock Service Worker). Nie ma prawdziwego
> serwera — wszystkie dane pochodzą z `src/mocks/`, a każde żądanie jest widocznie
> logowane w panelu BE Inspector.

## Stack

- **Next.js 14** (App Router) + **React 18**
- **TypeScript** (strict)
- **Tailwind CSS 3.4** (tokeny w `tailwind.config.ts`)
- **MSW 2.x** (Mock Service Worker) — mock backendu w przeglądarce
- **ESLint** (`next/core-web-vitals`)

## Jak odpalić

```bash
npm install            # instalacja zależności
npm run dev            # tryb deweloperski → http://localhost:3000
npm run build          # produkcyjny build (type-check + lint + prerender)
npm run start          # serwer produkcyjny (po build)
npm run lint           # sam ESLint
```

Worker MSW (`public/mockServiceWorker.js`) jest już wygenerowany i wersjonowany.
Gdyby po aktualizacji MSW trzeba go odświeżyć: `npx msw init public/ --save`.

## Strona demo — dowód, że backend jest zamockowany

Na stronie głównej (`/`) jest przycisk **„Testuj mock"**. Po kliknięciu:

1. wywołuje `GET /api/specialists` przez `apiClient`,
2. `apiClient` **loguje żądanie do BE Inspectora** (zobacz uchwyt w rogu ekranu),
3. odpowiedź (przechwycona przez MSW) pokazuje liczbę zaseedowanych specjalistów,
   czas odpowiedzi i nagłówek `x-engine`,
4. `BeBadge` pod przyciskiem sygnalizuje, że dane pochodzą z mocka.

## BE Inspector — jak działa

BE Inspector to **wysuwany panel** (uchwyt w rogu ekranu) logujący **każde** żądanie,
które przechodzi przez `apiClient`. Dla każdego żądania widać:

- **metodę** i **URL**,
- **status** HTTP (kolor wg fazy: `pending` = amber, `success` = zielony, `error` = czerwony),
- **latencję** (ms),
- wyróżnione nagłówki sygnalizacyjne:
  - **`x-engine`** — który silnik domenowy „obsłużył" żądanie (np. `G5-slot-lock`,
    `G7-scoring`, `G-search`),
  - **`x-state-transition`** — przejście stanu rezerwacji przy mutacjach
    (np. `draft→locked`, `confirmed→completed`),
- rozwijane szczegóły: nagłówki żądania/odpowiedzi oraz body (payload) w formacie JSON.

Przycisk **„Wyczyść"** czyści historię logów.

### Architektura logowania

```
komponent → apiClient (src/lib/api-client.ts)
                │  beInspector.begin()  → wpis "pending"
                ▼
              fetch ──► MSW handler (src/mocks/handlers.ts)
                │           • withLatency() (opóźnienie)
                │           • maybeError()  (opcjonalny chaos, domyślnie OFF)
                │           • ustawia x-engine / x-state-transition
                ▼
           apiClient  → beInspector.complete() (status, latencja, nagłówki, body)
                ▼
   BeInspector (UI) subskrybuje store przez useBeInspector() i renderuje panel
```

`src/lib/be-inspector.ts` to frameworkowo-neutralny store (pub/sub) z hookiem
`useSyncExternalStore` — bezpieczny dla SSR.

## Warstwa domenowa (`src/domain`) — źródło prawdy

Stany i eventy są **kanoniczne** — zgodne z diagramami
`flows/diagrams/00-core/*`. Nie wymyślamy własnych nazw.

- **`booking-states.ts`** — `enum BookingState` (10 stanów kanonicznych:
  `draft, locked, pending_payment, pending_approval, confirmed, completed,
  cancelled_by_patient, cancelled_by_specialist, no_show, disputed`),
  mapa dozwolonych przejść `BOOKING_TRANSITIONS`, `canTransition()`,
  `assertTransition()` (rzuca `InvalidBookingTransitionError`).
- **`events.ts`** — `enum DomainEvent` (kanoniczne: `booking.created`,
  `booking.cancelled`, `booking.cancelled_late`, `visit.no_show`,
  `review.approved`; pozostałe oznaczone jako **robocze**),
  `eventsForTransition()` mapuje przejście → event(y).
- **`verification.ts`** — `enum VerificationState` (cykl weryfikacji specjalisty:
  `zarejestrowany → weryfikacja_auto → zweryfikowany | weryfikacja_reczna →
  odrzucony | zweryfikowany → opublikowany`), rejestry `KRL/KIF`, SLA 24 h.
- **`types.ts`** — modele: `Specialist, Address, Service, Slot, Booking,
  Review, Verification`.
- **`api-contracts.ts`** — typowane kontrakty endpointów mocka + nagłówki
  sygnalizacyjne (`x-state-transition`, `x-engine`).

## Zamockowany backend (`src/mocks`)

- **`db.ts`** — in-memory seed: **12 specjalistów** (psycholog / psychoterapeuta /
  psychotraumatolog), zdjęcia z `i.pravatar.cc`, usługi + ceny, adresy, grafik
  (~14 dni), opinie (dane **przykładowe/demo**). Funkcje zapytań (`listSpecialists`,
  `getSpecialistBySlug`, `getSlots`, `createBooking`, `transitionBooking`, …).
- **`handlers.ts`** — handlery MSW dla 7 endpointów (patrz `api-contracts.ts`),
  ustawiające `x-engine` / `x-state-transition`.
- **`latency.ts`** — `withLatency()` (opóźnienie 120–480 ms) + `chaos`/`maybeError()`
  (wstrzykiwanie błędów; domyślnie `errorRate: 0`, konfigurowalne przez `setChaos`).
- **`browser.ts` / `server.ts`** — `setupWorker` (przeglądarka) / `setupServer` (Node/testy).
- **`MswProvider.tsx`** — startuje worker po stronie klienta (wpięty w `layout.tsx`).

## Endpointy mocka

| Metoda | Ścieżka | `x-engine` | `x-state-transition` |
|---|---|---|---|
| GET | `/api/specialists` | `G-search` | — |
| GET | `/api/specialists/:slug` | — | — |
| GET | `/api/specialists/:id/slots` | `G5-slot-lock` | — |
| GET | `/api/specialists/:id/reviews` | `G7-scoring` | — |
| POST | `/api/bookings` | `G5-slot-lock` | `draft→locked` |
| GET | `/api/bookings/:id` | — | — |
| POST | `/api/bookings/:id/transition` | wg eventu | `<from>→<to>` |

## Design system (`src/components/ui`)

Tokeny: paleta **zielona** (`brand` 50–900, primary `brand-700`), powierzchnie
(`surface`), tekst (`ink`), statusy (`success` / `warning` / `danger`).
Komponenty: `Button, Card, Chip, Tabs, Avatar, RatingStars, SlotGrid`.
`AppShell` — górny pasek z wyszukiwarką (search-first) i nawigacją grup.

A11y: widoczny focus-ring, tap-targety ≥ 44px, `prefers-reduced-motion`,
dostępne Tabs (role + klawiatura).

## Struktura routingu

```
src/app/
  (public)/        →  /  (home),  /szukaj,  /profil/[slug],  /rezerwacja/[id]
  (patient)/       →  /moje-wizyty                              (stub)
  (specialist)/    →  /panel, /panel/rezerwacje,
                      /panel/grafik, /panel/uslugi
  (admin)/         →  /admin                                    (stub)
```

Grupy routingu (nawiasy) nie wpływają na URL — organizują kod per obszar
(pacjent public / pacjent zalogowany / specjalista / back office).
**Pełną, aktualną listę wszystkich tras (auth, konto pacjenta B, onboarding C/D,
panel E, back office F, strony statyczne A9) znajdziesz w sekcji „Pełna mapa tras"
na końcu tego pliku.**

## Panel specjalisty (E1 → E8) — działa na mockach

„Zalogowany" specjalista to demo-konto (`GET /api/me/specialist` → Anna Kowalska).
Wspólny layout `(specialist)/panel/layout.tsx` dostarcza nagłówek, nawigację
i kontekst (`useCurrentSpecialist`).

- **`/panel` (E1)** — pulpit: kafelki (dzisiaj / do akceptacji / nadchodzące /
  do potwierdzenia), lista dzisiejszych wizyt, podgląd próśb o akceptację.
- **`/panel/rezerwacje` (E4)** — zakładki wg `scope` (`GET /api/specialists/:id/bookings`):
  - **Do akceptacji** (pending_approval): Akceptuj → `pending_approval→confirmed`,
    Odrzuć → `pending_approval→cancelled_by_specialist`.
  - **Nadchodzące** (confirmed): Odwołaj → `confirmed→cancelled_by_specialist` (E5).
  - **Do potwierdzenia** (confirmed po terminie): Odbyła się → `confirmed→completed`
    (E8), Nie stawił się → `confirmed→no_show` (E7, z oknem potwierdzenia).
  - **Historia** (completed / no_show / cancelled) — podgląd.
  - Wskaźnik no-show pacjenta (scoring G7), dane pacjenta minimalne (RODO).
- **`/panel/grafik` (E2)** — model dostępności: blokowanie/odblokowanie
  pojedynczych terminów (`POST /api/slots/:id/block|unblock`, status `blocked`)
  i dodawanie terminów (`POST /api/specialists/:id/slots`).
- **`/panel/uslugi` (E3)** — CRUD usług ze **słownika wertykalu** (F8,
  `GET /api/service-catalog`): dodaj / edytuj cenę-czas-tryb / usuń
  (`POST`/`PATCH`/`DELETE /api/services…`).

Wszystkie przejścia stanów idą przez `POST /api/bookings/:id/transition`
(walidacja `assertTransition`) i są widoczne w BE Inspectorze jako
`x-state-transition`; odczyty/mutacje panelu niosą `x-engine`
(`E1-panel`, `E2-availability`, `E3-services`, `G7-scoring`).

## Ścieżka pacjenta (A2 → A7) — działa na mockach

1. **`/szukaj` (A2/A3)** — wyszukiwarka z filtrami (fraza, miasto, tryb,
   specjalizacja) synchronizowanymi z URL; wyniki z `GET /api/specialists`.
   Karta wyniku ma **3 sekcje** (wzorzec A3): lewa — specjalista + opis,
   środek — inline wolne terminy (batch availability z `previewSlots`,
   scroll „pokaż więcej"), prawa — stylizowana mapka lokalizacji. Klik w termin
   to skrót do rezerwacji: `/profil/[slug]?slot=<id>` auto-otwiera checkout.
2. **`/profil/[slug]` (A4)** — profil: usługi, opinie, grafik (`SlotGrid` z
   `GET /api/specialists/:id/slots`), trust-pill weryfikacji PWZ.
3. **Checkout (A5)** — klik wolnego terminu → dialog: `POST /api/bookings`
   zakłada lock slotu (`draft→locked`, TTL 10 min, silnik G5), następnie
   „Potwierdź rezerwację" → `POST /api/bookings/:id/transition {to:confirmed}`
   (`locked→confirmed`). Oba przejścia widać w BE Inspectorze (`x-state-transition`).
4. **`/rezerwacja/[id]` (A7)** — potwierdzenie z `GET /api/bookings/:id`.

> Uwaga: dane mocka żyją w pamięci i resetują się przy pełnym odświeżeniu
> strony (re-seed). Rezerwacje utrzymują się w obrębie jednej sesji nawigacji.

## Warstwa graficzna

Autorskie, samodzielne inline-SVG (bez zewnętrznych assetów, zgodne z CSP):

- `src/components/illustrations/` — sceny: `HeroCalm`, `SearchSpot`,
  `EmptyResults`, `EmptySlots`, `BookingSuccess`, `ShieldCheck`, `CalmScene`.
- `src/components/doodles/` — akcenty: `Squiggle`, `Sparkle`, `Dots`, `Leaf`,
  `Arrow`, `Blob`, `WavyDivider`.

Wszystkie są dekoracyjne (`aria-hidden`), skalowane klasą, w palecie brand.

## Ograniczenia (projektowe / prawne)

- Opinie to wyłącznie **placeholdery/dane przykładowe**.
- Zakaz języka rankingowego i superlatywów w treści UI
  („najlepszy", „ranking", „top", „lider", „nr 1").
- Brak eksponowania scoringu liczbowego jako rankingu (liczba opinii jest OK).

## Pełna mapa tras (cały FE — mock)

**Publiczne / pacjent-public (A):** `/` (home), `/szukaj` (A2/A3, karta 3-sekcyjna z inline slotami + mapą), `/profil/[slug]` (A4 + checkout A5 z gate scoringu A6 → pending_payment/pending_approval, + A8 waitlista/podobni), `/rezerwacja/[id]` (A7), token-strony: `/odwolaj/[token]` (B3), `/opinia/[token]` (B5), `/spor/[bookingId]` (B6). Statyczne (A9): `/o-nas`, `/pomoc`, `/regulamin`, `/prywatnosc`, `/kontakt`. Globalny `not-found`.

**Auth:** `/logowanie` (+ quick-login demo: pacjent/specjalista/admin), `/rejestracja` (pacjent), `/rejestracja-specjalisty` (C3, z PWZ).

**Konto pacjenta (B):** `/moje-wizyty` (B2), `/konto/powiadomienia` (B10), `/konto/dane` (B9 RODO eksport/usunięcie), `/konto/waitlista` (B4).

**Onboarding specjalisty (C/D):** `/dla-specjalistow` (C1 landing + C2 cennik).

**Panel specjalisty (E):** `/panel` (E1), `/panel/rezerwacje` (E4/E5/E7/E8), `/panel/grafik` (E2), `/panel/uslugi` (E3), `/panel/statystyki` (E10), `/panel/urlop` (E6), `/panel/subskrypcja` (E12), `/panel/ustawienia` (E11), `/panel/weryfikacja` (D1/D2/D3 + go-live).

**Back office / admin (F):** `/admin` (pulpit), `/admin/weryfikacje` (F1), `/admin/opinie` (F2), `/admin/spory` (F3), `/admin/uzytkownicy` (F5), `/admin/naduzycia` (F4), `/admin/audyt` (F10).

Konta demo (quick-login, hasło dowolne): `pacjent@demo.pl`, `anna.kowalska@demo.pl` (specjalista, spec_1), `admin@demo.pl`.

> Uwaga: to demonstracyjny FE na mocku (MSW). Nie kopiuje CSS/assetów/treści z istniejących platform — ZnanyLekarz służył jako referencja wzorców UX, odwzorowanych własnym design systemem. Mapa (`MiniMap`) jest schematyczną atrapą (bez zewnętrznych kafli).
