/**
 * Konto pacjenta (GRUPA B) — modele i kontrakty API strefy pacjenta.
 *
 * Obejmuje: listę rezerwacji pacjenta (B4/B5/B6), wystawianie opinii (B5),
 * preferencje powiadomień (silnik G1), waitlistę „daj znać o wolnym terminie"
 * (silnik G6) oraz operacje RODO — eksport i usunięcie danych (silnik G11).
 *
 * Tożsamość pacjenta w warstwie mocka identyfikujemy po `patientEmail`
 * (klient przekazuje `?email=`). Konto DEMO: `pacjent@demo.pl` (Jan Kowalczyk).
 *
 * Warstwa czysto domenowa — BEZ importów react/next/msw.
 */

import type { Booking, Review } from './types';

/**
 * Pozycja listy rezerwacji pacjenta — rezerwacja wzbogacona o dane specjalisty
 * i usługi oraz flagi akcji dostępnych w strefie pacjenta:
 *  - `canCancel` — stan `confirmed` i termin w przyszłości (odwołanie, B4);
 *  - `canReview` — stan `completed` i brak wystawionej opinii (wystaw opinię, B5);
 *  - `hasReview` — czy dla `bookingId` istnieje już opinia.
 */
export interface PatientBookingItem extends Booking {
  /** Imię i nazwisko specjalisty (do wyświetlenia). */
  specialistName: string;
  /** Slug profilu specjalisty (link A4). */
  specialistSlug: string;
  /** URL zdjęcia specjalisty (do wyświetlenia). */
  specialistPhotoUrl: string;
  /** Nazwa usługi (do wyświetlenia). */
  serviceName: string;
  /** Czy pacjent może odwołać wizytę (confirmed + termin w przyszłości). */
  canCancel: boolean;
  /** Czy pacjent może wystawić opinię (completed + brak opinii). */
  canReview: boolean;
  /** Czy dla tej rezerwacji istnieje już opinia. */
  hasReview: boolean;
}

/** Odpowiedź listy rezerwacji pacjenta (`GET /api/patients/bookings`). */
export interface PatientBookingsResponse {
  items: PatientBookingItem[];
}

/**
 * Body wystawienia opinii (B5). Opinia jest dowodowo powiązana z rezerwacją
 * (`bookingId`) — mock waliduje, że wizyta się odbyła (stan `completed`)
 * i nie ma jeszcze opinii.
 */
export interface CreateReviewBody {
  /** Rezerwacja, której dotyczy opinia (musi być w stanie `completed`). */
  bookingId: string;
  /** Ocena w skali 1–5. */
  rating: number;
  /** Treść opinii. */
  text: string;
  /** Podpis autora opinii (do wyświetlenia). */
  authorName: string;
}

/** Odpowiedź wystawienia opinii: utworzona opinia (status `pending` — moderacja). */
export type CreateReviewResponse = Review;

/**
 * Preferencje powiadomień pacjenta (silnik G1). Kanały i zgody marketingowe.
 * Domyślnie: `email` i `sms` włączone, `reminders` włączone, `marketing` wyłączone.
 */
export interface NotificationPrefs {
  /** Powiadomienia e-mail (potwierdzenia, zmiany terminów). */
  email: boolean;
  /** Powiadomienia SMS. */
  sms: boolean;
  /** Przypomnienia o wizycie (T−24 h, G2). */
  reminders: boolean;
  /** Zgoda na komunikację marketingową. */
  marketing: boolean;
}

/** Body częściowej aktualizacji preferencji powiadomień (PUT — patch). */
export type UpdateNotificationPrefsBody = Partial<NotificationPrefs>;

/**
 * Status wpisu na waitliście (silnik G6):
 *  - `active`  — oczekuje na zwolnienie terminu;
 *  - `offered` — zaproponowano zwolniony termin (okno na rezerwację);
 *  - `booked`  — pacjent zarezerwował zaproponowany termin;
 *  - `expired` — oferta/wpis wygasł.
 */
export type WaitlistStatus = 'active' | 'offered' | 'booked' | 'expired';

/** Wpis pacjenta na waitliście specjalisty („daj znać o wolnym terminie", G6). */
export interface WaitlistEntry {
  id: string;
  specialistId: string;
  /** Imię i nazwisko specjalisty (denormalizacja do wyświetlenia). */
  specialistName: string;
  patientEmail: string;
  patientName: string;
  /** Usługa, której dotyczy oczekiwanie (opcjonalnie). */
  serviceId?: string;
  /** Znacznik zapisania na waitlistę (ISO 8601). */
  createdAt: string;
  /** Status wpisu na waitliście. */
  status: WaitlistStatus;
}

/** Body zapisu na waitlistę (`POST /api/waitlist`). */
export interface JoinWaitlistBody {
  specialistId: string;
  patientName: string;
  patientEmail: string;
  /** Usługa, której dotyczy oczekiwanie (opcjonalnie). */
  serviceId?: string;
}

/** Odpowiedź listy wpisów pacjenta na waitliście (`GET /api/patients/waitlist`). */
export interface WaitlistResponse {
  items: WaitlistEntry[];
}

/**
 * Bramka scoringu nieobecności (silnik G7) sterująca wariantem checkoutu (A5/A6):
 *  - `none`     — brak sankcji; rezerwacja może przejść wprost do `confirmed` (A5);
 *  - `payment`  — wymagana przedpłata online; rezerwacja idzie przez
 *                 `pending_payment` (A6, Flaga 2);
 *  - `approval` — wymagana akceptacja specjalisty; rezerwacja idzie przez
 *                 `pending_approval` (decyzja w panelu E4).
 */
export type ScoringGate = 'none' | 'payment' | 'approval';

/**
 * Wynik scoringu pacjenta (silnik G7) użyty w bramce checkoutu. Zawiera liczbę
 * nieobecności w historii, wynikową bramkę oraz krótkie uzasadnienie (PL).
 */
export interface ScoringInfo {
  /** Liczba nieobecności (`no_show`) w historii pacjenta. */
  noShowCount: number;
  /** Bramka checkoutu wynikająca z progów scoringu. */
  gate: ScoringGate;
  /** Krótkie uzasadnienie decyzji bramki (PL, do wyświetlenia). */
  reason: string;
}

/**
 * Pakiet eksportu danych pacjenta (RODO, silnik G11). Zbiera rezerwacje,
 * opinie i wpisy waitlisty powiązane z pacjentem oraz znacznik wygenerowania.
 */
export interface RodoExport {
  /** Dane konta (minimalny zakres — e-mail identyfikujący pacjenta). */
  user: { email: string };
  /** Rezerwacje pacjenta. */
  bookings: Booking[];
  /** Opinie pacjenta (powiązane przez `bookingId`). */
  reviews: Review[];
  /** Wpisy pacjenta na waitliście. */
  waitlist: WaitlistEntry[];
  /** Znacznik wygenerowania eksportu (ISO 8601). */
  generatedAt: string;
}

/**
 * Rejestr endpointów strefy pacjenta (grupa B). Osobny rejestr, żeby nie
 * mieszać z `API_ENDPOINTS` (specjaliści/rezerwacje) i `AUTH_ENDPOINTS`.
 * Ścieżki `/api/patients/...` są rozłączne z `/api/specialists/...`.
 */
export const PATIENT_ENDPOINTS = {
  listBookings: { method: 'GET', path: '/api/patients/bookings' },
  scoring: { method: 'GET', path: '/api/patients/scoring' },
  createReview: { method: 'POST', path: '/api/reviews' },
  getNotifPrefs: { method: 'GET', path: '/api/patients/notification-prefs' },
  updateNotifPrefs: { method: 'PUT', path: '/api/patients/notification-prefs' },
  joinWaitlist: { method: 'POST', path: '/api/waitlist' },
  listWaitlist: { method: 'GET', path: '/api/patients/waitlist' },
  rodoExport: { method: 'POST', path: '/api/patients/rodo/export' },
  rodoErase: { method: 'POST', path: '/api/patients/rodo/erase' },
} as const;
