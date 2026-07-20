/**
 * CORE-STANY — Kanoniczny cykl życia rezerwacji.
 *
 * Źródło prawdy: flows/diagrams/00-core/00-stany-rezerwacji.md
 * Warstwa czysto domenowa — BEZ importów react/next/msw. Używalna po stronie
 * serwera, klienta oraz w handlerach MSW.
 *
 * Wartości enuma = kanoniczne stringi snake_case używane we WSZYSTKICH
 * diagramach i kontraktach API. Nie zmieniać bez aktualizacji diagramów.
 */

/**
 * Stany kanoniczne rezerwacji. Rezerwacja jest zawsze dokładnie w jednym stanie.
 *
 * Uwaga o zakończeniach cyklu (na diagramie `[*]`): porzucenie draftu,
 * wygaśnięcie locka po TTL 10 min oraz zamknięcie no_show do historii pacjenta
 * to ZAKOŃCZENIA cyklu (END), a NIE osobne stany kanoniczne — dlatego nie mają
 * własnych wartości w tym enumie (brak `expired` / `cancelled_by_system`).
 */
export enum BookingState {
  /** SZKIC — pacjent wypełnia formularz checkoutu (A5); termin NIE jest jeszcze zablokowany. */
  Draft = 'draft',
  /** TERMIN ZABLOKOWANY — lock slotu na TTL 10 min tylko dla tego pacjenta (silnik G5). */
  Locked = 'locked',
  /** CZEKA NA PŁATNOŚĆ ONLINE — okno płatności ~30 min, potem auto-anulacja (A6, Flaga 2). */
  PendingPayment = 'pending_payment',
  /** CZEKA NA DECYZJĘ SPECJALISTY — ręczna akceptacja/odrzucenie (E4, wariant scoring gate). */
  PendingApproval = 'pending_approval',
  /** WIZYTA UMÓWIONA — obie strony mają potwierdzenie (A7); przypomnienie T−24 h (G2). */
  Confirmed = 'confirmed',
  /** WIZYTA ODBYTA — potwierdzenie ręczne (E8) lub auto-approval T+48 h (G4); odblokowuje opinię (B5). Terminalny. */
  Completed = 'completed',
  /** ODWOŁANA PRZEZ PACJENTA — także auto-anulacja po braku wpłaty (A6). Terminalny. */
  CancelledByPatient = 'cancelled_by_patient',
  /** ODWOŁANA PRZEZ SPECJALISTĘ — pojedynczo (E5) lub hurtowo / urlop (E6); też odrzucenie z pending_approval. Terminalny. */
  CancelledBySpecialist = 'cancelled_by_specialist',
  /** NIEOBECNOŚĆ PACJENTA — zgłoszona przez specjalistę (E7); sankcje w scoringu (G7). */
  NoShow = 'no_show',
  /** SPÓR O NIEOBECNOŚĆ — pacjent kwestionuje no_show (B6); rozstrzyga admin (F3). */
  Disputed = 'disputed',
}

/**
 * Mapa dozwolonych przejść: stan → lista dozwolonych stanów następnych.
 * Stany terminalne mają pustą listę. Zgodne 1:1 z diagramem CORE-STANY.
 *
 * TTL-e i timery (kontekst — nie są osobnymi stanami):
 *  - lock slotu: TTL 10 min od wejścia w checkout (G5); wygaśnięcie = END, slot wraca do puli.
 *  - okno płatności online: ~30 min (A6) → auto-anulacja jako cancelled_by_patient.
 *  - auto-approval: T+48 h po terminie (G4) → completed; blokowany przy no_show / disputed (Flaga 3).
 */
export const BOOKING_TRANSITIONS: Record<BookingState, readonly BookingState[]> = {
  // draft → locked; porzucenie formularza = END (nie osobny stan)
  [BookingState.Draft]: [BookingState.Locked],
  // locked → gałąź scoring gate (pending_payment / pending_approval) lub od razu confirmed;
  // wygaśnięcie TTL 10 min = END (nie osobny stan)
  [BookingState.Locked]: [
    BookingState.PendingPayment,
    BookingState.PendingApproval,
    BookingState.Confirmed,
  ],
  // pending_payment → confirmed (webhook G9) lub cancelled_by_patient (timeout ~30 min, A6)
  [BookingState.PendingPayment]: [
    BookingState.Confirmed,
    BookingState.CancelledByPatient,
  ],
  // pending_approval → confirmed (accept E4) lub cancelled_by_specialist (reject E4)
  [BookingState.PendingApproval]: [
    BookingState.Confirmed,
    BookingState.CancelledBySpecialist,
  ],
  // confirmed → completed (E8/G4), odwołania obu stron, no_show (E7)
  [BookingState.Confirmed]: [
    BookingState.Completed,
    BookingState.CancelledByPatient,
    BookingState.CancelledBySpecialist,
    BookingState.NoShow,
  ],
  // no_show → disputed (spór B6); zamknięcie do historii = END (nie osobny stan)
  [BookingState.NoShow]: [BookingState.Disputed],
  // disputed → completed (admin uznaje, F3) lub no_show (admin odrzuca spór, F3)
  [BookingState.Disputed]: [BookingState.Completed, BookingState.NoShow],
  // Stany terminalne — brak przejść
  [BookingState.Completed]: [],
  [BookingState.CancelledByPatient]: [],
  [BookingState.CancelledBySpecialist]: [],
};

/**
 * Stany terminalne (pozytywne zamknięcie lub odwołanie). Rezerwacja w tym
 * stanie nie ma już żadnych dozwolonych przejść.
 *
 * Uwaga: `no_show` i `disputed` NIE są terminalne — mają dalsze przejścia
 * (no_show → disputed, disputed → completed | no_show). Zamknięcie no_show do
 * historii pacjenta to END cyklu, nie brak wyjść ze stanu.
 */
export const TERMINAL_BOOKING_STATES: ReadonlySet<BookingState> = new Set([
  BookingState.Completed,
  BookingState.CancelledByPatient,
  BookingState.CancelledBySpecialist,
]);

/** Czy przejście `from → to` jest dozwolone wg mapy kanonicznej. */
export function canTransition(from: BookingState, to: BookingState): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

/** Błąd rzucany przy próbie niedozwolonego przejścia rezerwacji. */
export class InvalidBookingTransitionError extends Error {
  readonly from: BookingState;
  readonly to: BookingState;

  constructor(from: BookingState, to: BookingState) {
    super(`Niedozwolone przejście: ${from} → ${to}`);
    this.name = 'InvalidBookingTransitionError';
    this.from = from;
    this.to = to;
  }
}

/**
 * Waliduje przejście — rzuca `InvalidBookingTransitionError`, gdy niedozwolone.
 * Używane m.in. przez handler `POST /api/bookings/:id/transition`.
 */
export function assertTransition(from: BookingState, to: BookingState): void {
  if (!canTransition(from, to)) {
    throw new InvalidBookingTransitionError(from, to);
  }
}
