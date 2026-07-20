/**
 * ONBOARDING-SPECJALISTY — Backend onboardingu specjalisty (grupy C/D).
 *
 * Pokrywa:
 *  - weryfikację PWZ (D1): odczyt stanu, ponowne zgłoszenie po odrzuceniu;
 *  - publikację profilu (D3): go-live (zweryfikowany → opublikowany);
 *  - plany subskrypcji (C2): model SUBSKRYPCYJNY dla specjalisty (stała opłata
 *    za okres), NIE prowizja od wizyt.
 *
 * Źródło prawdy cyklu weryfikacji: src/domain/verification.ts (VerificationState,
 * assertVerificationTransition). Warstwa czysto domenowa — BEZ importów
 * react/next/msw.
 */

import type { Verification } from './types';

/**
 * Plan subskrypcji specjalisty (C2). Model SUBSKRYPCYJNY, nie prowizyjny —
 * specjalista płaci stałą opłatę za okres rozliczeniowy niezależnie od liczby wizyt.
 *
 * Konwencja cen jak w `types.ts`: `pricePln` w pełnych złotych (nie w groszach).
 */
export interface SubscriptionPlan {
  id: string;
  /** Nazwa planu (np. „Solo", „Praktyka", „Placówka"). */
  name: string;
  /** Cena w PLN (pełne złote) za jeden okres rozliczeniowy (`period`). */
  pricePln: number;
  /** Okres rozliczeniowy planu (miesięczny/roczny). */
  period: 'month' | 'year';
  /** Lista cech/korzyści planu (opisy neutralne, bez języka rankingowego). */
  features: string[];
  /** Czy plan jest wyróżniony w cenniku (najczęściej wybierany) — opcjonalnie. */
  highlighted?: boolean;
}

/** Odpowiedź katalogu planów subskrypcji (C2). */
export interface SubscriptionPlansResponse {
  items: SubscriptionPlan[];
}

/**
 * Odpowiedź odczytu/mutacji weryfikacji (D1/D3) — pełny rekord `Verification`
 * (stan cyklu, PWZ, rejestr, SLA/powód odrzucenia).
 */
export type VerificationResponse = Verification;

/**
 * Rejestr endpointów onboardingu specjalisty (grupy C/D). Metadane path/method
 * w konwencji spójnej z `API_ENDPOINTS` z `api-contracts.ts` (parametry `:param`).
 *
 * Ścieżki rozłączne z istniejącymi kontraktami: `/api/specialists/:id/verification`
 * (+ `.../resubmit`) i `/api/specialists/:id/go-live` mają inny/dłuższy zestaw
 * segmentów niż `/api/specialists/:slug`; `/api/subscription/plans` to nowy
 * korzeń ścieżki.
 */
export const ONBOARDING_ENDPOINTS = {
  getVerification: { method: 'GET', path: '/api/specialists/:id/verification' },
  goLive: { method: 'POST', path: '/api/specialists/:id/go-live' },
  resubmitVerification: {
    method: 'POST',
    path: '/api/specialists/:id/verification/resubmit',
  },
  subscriptionPlans: { method: 'GET', path: '/api/subscription/plans' },
} as const;
