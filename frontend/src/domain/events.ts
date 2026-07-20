/**
 * CORE-EVENTY — Katalog eventów domenowych i ich mapowanie z przejść stanów.
 *
 * Źródło prawdy: flows/diagrams/00-core/00-katalog-eventow.md
 * oraz notatki "Eventy emitowane przy przejściach" w 00-stany-rezerwacji.md.
 *
 * Warstwa czysto domenowa — BEZ importów react/next/msw.
 */

import { BookingState } from './booking-states';

/**
 * Eventy domenowe (nazwy kropkowe). Część potwierdzona mapą projektu
 * (kanoniczne), część to nazwy ROBOCZE — mapa nie definiuje pełnego katalogu.
 */
export enum DomainEvent {
  // --- Kanoniczne (potwierdzone mapą / CLAUDE.md) ---
  /** Powstała nowa rezerwacja (wejście w confirmed). */
  BookingCreated = 'booking.created',
  /** Rezerwacja odwołana w dozwolonym czasie (bez kary scoringu). */
  BookingCancelled = 'booking.cancelled',
  /** Rezerwacja odwołana po terminie — kara w scoringu (G7). */
  BookingCancelledLate = 'booking.cancelled_late',
  /** Pacjent nie stawił się na wizycie (E7). */
  VisitNoShow = 'visit.no_show',
  /** Opinia zatwierdzona przez moderację (F2) → publikacja na profilu. */
  ReviewApproved = 'review.approved',

  // --- Robocze — mapa nie definiuje (zgłoszone w rozbieżnościach) ---
  /** robocza — mapa nie definiuje: zwolnił się termin → start waitlisty (G6). */
  SlotReleased = 'slot.released',
  /** robocza — mapa nie definiuje: wizyta uznana za odbytą (E8 lub G4). */
  VisitApproved = 'visit.approved',
  /** robocza — mapa nie definiuje: pacjent otworzył spór o no_show (B6). */
  DisputeOpened = 'dispute.opened',
  /** robocza — mapa nie definiuje: webhook — wpłata zaksięgowana (G9, Flaga 2). */
  PaymentSucceeded = 'payment.succeeded',
  /** robocza — mapa nie definiuje: webhook — zwrot wykonany (G9, Flaga 2). */
  PaymentRefunded = 'payment.refunded',
  /** robocza — mapa nie definiuje: żądanie usunięcia danych (B9/F5 → G11). */
  RodoErasureRequested = 'rodo.erasure_requested',
  /** robocza — mapa nie definiuje: zgoda RODO odnotowana w rejestrze (A5 → G11). */
  ConsentRecorded = 'consent.recorded',
  /** robocza — mapa nie definiuje: profil specjalisty wystartował publicznie (D3 → G12). */
  ProfilePublished = 'profile.published',
}

/**
 * Pięć eventów potwierdzonych mapą projektu. Pozostałe wartości `DomainEvent`
 * to nazwy robocze i mogą się jeszcze zmienić.
 */
export const CANONICAL_EVENTS: ReadonlySet<DomainEvent> = new Set([
  DomainEvent.BookingCreated,
  DomainEvent.BookingCancelled,
  DomainEvent.BookingCancelledLate,
  DomainEvent.VisitNoShow,
  DomainEvent.ReviewApproved,
]);

/** Czy dana nazwa eventu jest kanoniczna (potwierdzona mapą). */
export function isCanonicalEvent(event: DomainEvent): boolean {
  return CANONICAL_EVENTS.has(event);
}

/**
 * Eventy emitowane przy przejściu rezerwacji `from → to`.
 *
 * Mapowanie wg notatek diagramu CORE-STANY:
 *  - wejście w `confirmed` (z locked / pending_payment / pending_approval) → booking.created
 *  - `confirmed → cancelled_by_patient` w terminie → booking.cancelled; po terminie → booking.cancelled_late
 *  - `pending_payment → cancelled_by_patient` (timeout ~30 min, A6) → booking.cancelled
 *  - `confirmed → cancelled_by_specialist` → booking.cancelled
 *  - `confirmed → no_show` → visit.no_show
 *  - wejście w `completed` (E8 lub G4, także z disputed) → visit.approved (robocza)
 *  - `no_show → disputed` → dispute.opened (robocza)
 *
 * Zwraca eventy PIERWOTNE przejścia (co się stało). Kaskady wtórne
 * (np. booking.cancelled → slot.released → waitlista G6, booking.cancelled_late →
 * scoring G7) są konsumowane przez silniki i celowo NIE są tu zwracane.
 *
 * Przejścia bez przypisanego eventu domenowego (np. draft→locked lock G5,
 * locked→pending_*, pending_approval→cancelled_by_specialist jako odrzucenie
 * przed potwierdzeniem) zwracają pustą tablicę.
 *
 * @param opts.late true, gdy odwołanie pacjenta nastąpiło po dozwolonym czasie.
 */
export function eventsForTransition(
  from: BookingState,
  to: BookingState,
  opts?: { late?: boolean },
): DomainEvent[] {
  // Wejście w confirmed — niezależnie od źródła (locked / pending_payment / pending_approval)
  if (to === BookingState.Confirmed) {
    return [DomainEvent.BookingCreated];
  }

  // Wejście w completed — potwierdzenie E8, auto-approval G4 lub uznanie sporu (disputed→completed)
  if (to === BookingState.Completed) {
    return [DomainEvent.VisitApproved]; // robocza
  }

  // Odwołanie przez pacjenta z confirmed — w terminie vs po terminie
  if (
    from === BookingState.Confirmed &&
    to === BookingState.CancelledByPatient
  ) {
    return [
      opts?.late
        ? DomainEvent.BookingCancelledLate
        : DomainEvent.BookingCancelled,
    ];
  }

  // Auto-anulacja po braku wpłaty (A6) — traktowana jak odwołanie w terminie
  if (
    from === BookingState.PendingPayment &&
    to === BookingState.CancelledByPatient
  ) {
    return [DomainEvent.BookingCancelled];
  }

  // Odwołanie umówionej wizyty przez specjalistę (E5/E6).
  // Odrzucenie z pending_approval (E4) NIE emituje eventu — booking nigdy nie był utworzony.
  if (
    from === BookingState.Confirmed &&
    to === BookingState.CancelledBySpecialist
  ) {
    return [DomainEvent.BookingCancelled];
  }

  // Zgłoszenie nieobecności (E7)
  if (from === BookingState.Confirmed && to === BookingState.NoShow) {
    return [DomainEvent.VisitNoShow];
  }

  // Otwarcie sporu o nieobecność (B6)
  if (from === BookingState.NoShow && to === BookingState.Disputed) {
    return [DomainEvent.DisputeOpened]; // robocza
  }

  return [];
}
