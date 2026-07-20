/**
 * CORE-WERYFIKACJA — Cykl weryfikacji specjalisty (C3 → D1 → D3).
 *
 * Źródło prawdy: flows/diagrams/00-core/00-weryfikacja-specjalisty.md
 * Warstwa czysto domenowa — BEZ importów react/next/msw.
 *
 * Wartości enuma = kanoniczne stringi (PL, snake_case) używane w diagramach.
 */

/**
 * Stany kanoniczne weryfikacji specjalisty.
 *
 * Uwaga: `[*]` (END) po `odrzucony` (brak ponownego zgłoszenia) i po
 * `opublikowany` to zakończenia cyklu, a nie osobne stany.
 */
export enum VerificationState {
  /** Konto założone, nr PWZ z poprawnym formatem (rejestracja C3). */
  Zarejestrowany = 'zarejestrowany',
  /** Automatyczne sprawdzenie PWZ w rejestrze KRL/KIF, status na żywo (D1). */
  WeryfikacjaAuto = 'weryfikacja_auto',
  /** Kolejka ręczna admina — fallback automatu (F1), SLA do 24 h roboczych. */
  WeryfikacjaReczna = 'weryfikacja_reczna',
  /** PWZ potwierdzony — profil draft z pełną edycją (D2). */
  Zweryfikowany = 'zweryfikowany',
  /** Zgłoszenie odrzucone z powodem widocznym dla specjalisty (F1). */
  Odrzucony = 'odrzucony',
  /** Profil publiczny — widoczny w wyszukiwarce (A3/A4) po go-live (D3). */
  Opublikowany = 'opublikowany',
}

/**
 * Mapa dozwolonych przejść weryfikacji. Zgodna 1:1 z diagramem CORE-WERYFIKACJA.
 *
 * `odrzucony → weryfikacja_auto` = ponowne zgłoszenie po poprawie danych
 * (wraca do automatu D1, nie wprost do kolejki F1 — założenie minimalne mapy).
 * `odrzucony → END` (brak ponownego zgłoszenia) oraz `opublikowany → END` to
 * zakończenia cyklu, nie osobne stany.
 */
export const VERIFICATION_TRANSITIONS: Record<
  VerificationState,
  readonly VerificationState[]
> = {
  [VerificationState.Zarejestrowany]: [VerificationState.WeryfikacjaAuto],
  [VerificationState.WeryfikacjaAuto]: [
    VerificationState.Zweryfikowany,
    VerificationState.WeryfikacjaReczna,
  ],
  [VerificationState.WeryfikacjaReczna]: [
    VerificationState.Zweryfikowany,
    VerificationState.Odrzucony,
  ],
  [VerificationState.Odrzucony]: [VerificationState.WeryfikacjaAuto],
  [VerificationState.Zweryfikowany]: [VerificationState.Opublikowany],
  [VerificationState.Opublikowany]: [],
};

/** Czy przejście weryfikacji `from → to` jest dozwolone. */
export function canVerificationTransition(
  from: VerificationState,
  to: VerificationState,
): boolean {
  return VERIFICATION_TRANSITIONS[from].includes(to);
}

/** Błąd rzucany przy próbie niedozwolonego przejścia weryfikacji. */
export class InvalidVerificationTransitionError extends Error {
  readonly from: VerificationState;
  readonly to: VerificationState;

  constructor(from: VerificationState, to: VerificationState) {
    super(`Niedozwolone przejście weryfikacji: ${from} → ${to}`);
    this.name = 'InvalidVerificationTransitionError';
    this.from = from;
    this.to = to;
  }
}

/** Waliduje przejście weryfikacji — rzuca `InvalidVerificationTransitionError`, gdy niedozwolone. */
export function assertVerificationTransition(
  from: VerificationState,
  to: VerificationState,
): void {
  if (!canVerificationTransition(from, to)) {
    throw new InvalidVerificationTransitionError(from, to);
  }
}

/**
 * Rejestr zawodowy, w którym automat (D1) sprawdza numer PWZ.
 * Dla wertykalu psychologiczno-logopedycznego przyjęto KRL/KIF (założenie mapy).
 */
export enum ProfessionalRegistry {
  /** Krajowy Rejestr Logopedów. */
  KRL = 'KRL',
  /** Krajowa Izba Fizjoterapeutów. */
  KIF = 'KIF',
}
