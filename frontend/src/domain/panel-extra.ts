/**
 * PANEL-SPECJALISTY (rozszerzenie E) — kontrakty pozostałych sekcji panelu:
 *  - statystyki praktyki (E10),
 *  - subskrypcja specjalisty (E12) — model SUBSKRYPCYJNY (patrz onboarding C2),
 *  - ustawienia profilu (E11),
 *  - tryb urlop / niedostępność (E6).
 *
 * Warstwa czysto domenowa — BEZ importów react/next/msw. Konwencje cen/czasów
 * jak w `types.ts`: pola `*Pln` w pełnych złotych, znaczniki czasu jako ISO 8601.
 */

import type { Address } from './types';

/* ------------------------------------------------------------------ *
 * E10 — Statystyki praktyki specjalisty
 * ------------------------------------------------------------------ */

/**
 * Zagregowane statystyki panelu specjalisty (E10). Liczone na żywo z rezerwacji,
 * opinii i grafiku danego specjalisty.
 */
export interface SpecialistStats {
  /** Liczba nadchodzących wizyt (confirmed w przyszłości). */
  upcomingCount: number;
  /** Liczba wizyt odbytych (completed). */
  completedCount: number;
  /** Liczba nieobecności pacjentów (no_show). */
  noShowCount: number;
  /** Liczba wizyt anulowanych (przez pacjenta lub specjalistę). */
  cancelledCount: number;
  /** Liczba opinii (zatwierdzonych) składających się na średnią. */
  reviewsCount: number;
  /** Średnia ocen (skala 1–5, zaokrąglona do jednego miejsca). */
  ratingAvg: number;
  /** Obłożenie grafiku w procentach: booked / (booked + available), zakres 0–100. */
  occupancyPct: number;
  /** Szacowany przychód w PLN (suma cen wizyt completed, pełne złote). */
  revenueEstimatePln: number;
}

/* ------------------------------------------------------------------ *
 * E12 — Subskrypcja specjalisty (model subskrypcyjny, nie prowizyjny)
 * ------------------------------------------------------------------ */

/**
 * Status cyklu życia subskrypcji:
 *  - `trialing` = okres próbny (przed pierwszą płatnością);
 *  - `active`   = subskrypcja opłacona/aktywna;
 *  - `past_due` = zaległa płatność;
 *  - `canceled` = anulowana.
 */
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

/**
 * Bieżąca subskrypcja specjalisty (E12). Powiązana z planem z katalogu (C2,
 * `SubscriptionPlan`); `pricePln` utrwala cenę planu w momencie wyboru.
 */
export interface Subscription {
  specialistId: string;
  /** Id wybranego planu (z katalogu C2). */
  planId: string;
  /** Nazwa planu (denormalizacja dla widoku). */
  planName: string;
  /** Status cyklu życia subskrypcji. */
  status: SubscriptionStatus;
  /** Cena planu w PLN (pełne złote) za okres rozliczeniowy. */
  pricePln: number;
  /** Koniec okresu próbnego (ISO 8601) — ustawiony dla statusu `trialing`. */
  trialEndsAt?: string;
  /** Data najbliższego odnowienia (ISO 8601) — ustawiona dla statusu `active`. */
  renewsAt?: string;
}

/** Body zmiany planu subskrypcji (E12). `planId` MUSI wskazywać plan z katalogu (C2). */
export interface ChangeSubscriptionBody {
  planId: string;
}

/* ------------------------------------------------------------------ *
 * E11 — Ustawienia profilu specjalisty
 * ------------------------------------------------------------------ */

/**
 * Body edycji profilu specjalisty (E11). Wszystkie pola opcjonalne (edycja
 * częściowa) — aktualizowane są wyłącznie obecne, poprawne pola.
 */
export interface UpdateSpecialistBody {
  /** Nowy opis prezentacyjny. */
  bio?: string;
  /** Nowa lista języków obsługi. */
  languages?: string[];
  /** Czy prowadzi wizyty online. */
  online?: boolean;
  /** Nowa lista adresów gabinetów (multi). */
  addresses?: Address[];
}

/* ------------------------------------------------------------------ *
 * E6 — Tryb urlop / niedostępność
 * ------------------------------------------------------------------ */

/**
 * Blok urlopu/niedostępności specjalisty (E6). Utworzenie bloku blokuje wolne
 * terminy grafiku w zakresie [from, to]; usunięcie bloku je odblokowuje
 * (z wyjątkiem terminów już zajętych).
 */
export interface VacationBlock {
  id: string;
  specialistId: string;
  /** Początek zakresu niedostępności (ISO 8601). */
  from: string;
  /** Koniec zakresu niedostępności (ISO 8601). */
  to: string;
  /** Opcjonalny powód (np. „urlop", „konferencja"). */
  reason?: string;
}

/** Body utworzenia bloku urlopu (E6). Zakres [from, to] walidowany po stronie mocka. */
export interface CreateVacationBody {
  from: string;
  to: string;
  reason?: string;
}

/** Odpowiedź listy bloków urlopu specjalisty (E6). */
export interface VacationResponse {
  items: VacationBlock[];
}

/* ------------------------------------------------------------------ *
 * Rejestr endpointów rozszerzenia panelu (E6/E10/E11/E12)
 * ------------------------------------------------------------------ *
 * Ścieżki rozłączne z istniejącymi kontraktami: `:id/stats|subscription|vacation`
 * mają 2 segmenty (nie kolidują z 1-segmentowym `GET /api/specialists/:slug`),
 * `PATCH /api/specialists/:id` używa metody PATCH (innej niż GET :slug),
 * a `POST /api/specialists/:id/subscription` ma inny ostatni segment niż
 * `.../services` i `.../slots`.
 */
export const PANEL_EXTRA_ENDPOINTS = {
  stats: { method: 'GET', path: '/api/specialists/:id/stats' },
  getSubscription: { method: 'GET', path: '/api/specialists/:id/subscription' },
  changeSubscription: { method: 'POST', path: '/api/specialists/:id/subscription' },
  updateSpecialist: { method: 'PATCH', path: '/api/specialists/:id' },
  listVacation: { method: 'GET', path: '/api/specialists/:id/vacation' },
  createVacation: { method: 'POST', path: '/api/specialists/:id/vacation' },
  deleteVacation: {
    method: 'DELETE',
    path: '/api/specialists/:id/vacation/:vid',
  },
} as const;
