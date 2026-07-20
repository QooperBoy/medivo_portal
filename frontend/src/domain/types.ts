/**
 * Modele domenowe marketplace'u rezerwacji wizyt u psychologów/psychoterapeutów.
 *
 * Konwencje:
 *  - pola w camelCase, identyfikatory po angielsku;
 *  - ceny w PLN jako liczby całkowite — o ile nie zaznaczono inaczej, w polach
 *    `*Pln` trzymamy pełne złote; wartości "w groszach" (grosze = 1/100 PLN)
 *    są oznaczone jawnie sufiksem/komentarzem tam, gdzie występują;
 *  - czasy jako ISO 8601 string (np. "2026-07-20T09:00:00Z").
 *
 * Warstwa czysto domenowa — BEZ importów react/next/msw.
 */

import { BookingState } from './booking-states';
import { VerificationState, ProfessionalRegistry } from './verification';

/** Tytuł zawodowy specjalisty (wertykal psychologiczny). */
export type SpecialistTitle =
  | 'psycholog'
  | 'psychoterapeuta'
  | 'psychotraumatolog';

/** Tryb realizacji usługi/wizyty. */
export type ServiceMode = 'online' | 'stacjonarnie' | 'obie';

/** Tryb pojedynczego slotu w kalendarzu (konkretny termin jest albo zdalny, albo w gabinecie). */
export type SlotMode = 'online' | 'stacjonarnie';

/**
 * Status slotu w kalendarzu specjalisty.
 * `blocked` = termin ręcznie wyłączony z rezerwacji przez specjalistę (E2).
 */
export type SlotStatus = 'available' | 'locked' | 'booked' | 'blocked';

/** Status opinii w procesie moderacji. */
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * Adres gabinetu specjalisty. Specjalista może mieć wiele adresów (multi).
 */
export interface Address {
  id: string;
  /** Etykieta lokalizacji, np. "Gabinet centrum". */
  label: string;
  street: string;
  city: string;
  /** Kod pocztowy w formacie "00-000". */
  postalCode: string;
  /** Szerokość geograficzna (opcjonalna — do mapy). */
  lat?: number;
  /** Długość geograficzna (opcjonalna — do mapy). */
  lng?: number;
}

/**
 * Profil specjalisty. `verificationState` i `registry`/`pwzNumber` odzwierciedlają
 * cykl weryfikacji (KRL/KIF). Publicznie widoczny jest profil `opublikowany`.
 */
export interface Specialist {
  id: string;
  /** Identyfikator w URL profilu (A4), np. "anna-kowalska". */
  slug: string;
  firstName: string;
  lastName: string;
  /** Tytuł zawodowy (union `SpecialistTitle`). */
  title: SpecialistTitle;
  /** Specjalizacje/metody, np. "terapia poznawczo-behawioralna", "terapia par". */
  specializations: string[];
  /** Opis prezentacyjny specjalisty. */
  bio: string;
  /** URL zdjęcia (mock: pravatar). */
  photoUrl: string;
  /** Języki obsługi, np. "polski", "angielski". */
  languages: string[];
  /** Adresy gabinetów (multi). */
  addresses: Address[];
  /** Czy prowadzi wizyty online. */
  online: boolean;
  /** Średnia ocen z opinii (skala 1–5). */
  ratingAvg: number;
  /** Liczba opinii składających się na średnią. */
  ratingCount: number;
  /** Cena orientacyjna "od" w PLN (pełne złote). */
  priceFromPln: number;
  /** Stan cyklu weryfikacji specjalisty. */
  verificationState: VerificationState;
  /** Numer prawa wykonywania zawodu (PWZ). */
  pwzNumber: string;
  /** Rejestr zawodowy powiązany z PWZ. */
  registry: ProfessionalRegistry;
}

/**
 * Usługa oferowana przez specjalistę (np. konsultacja, sesja terapeutyczna).
 */
export interface Service {
  id: string;
  specialistId: string;
  /** Nazwa usługi, np. "Konsultacja psychologiczna". */
  name: string;
  /** Czas trwania w minutach. */
  durationMin: number;
  /** Cena usługi w PLN (pełne złote). */
  pricePln: number;
  /** Tryb realizacji usługi. */
  mode: ServiceMode;
  /** Opcjonalny opis usługi. */
  description?: string;
}

/**
 * Slot — konkretny termin w kalendarzu specjalisty, który pacjent może zarezerwować.
 * `locked` niesie `lockedUntil` (TTL 10 min, silnik G5).
 */
export interface Slot {
  id: string;
  specialistId: string;
  /** Usługa przypisana do slotu (opcjonalnie — slot może być ogólny). */
  serviceId?: string;
  /** Adres realizacji dla slotu stacjonarnego (opcjonalnie). */
  addressId?: string;
  /** Początek slotu (ISO 8601). */
  startsAt: string;
  /** Koniec slotu (ISO 8601). */
  endsAt: string;
  /** Status dostępności slotu. */
  status: SlotStatus;
  /** Do kiedy trwa lock (ISO 8601); ustawione tylko gdy status = "locked". */
  lockedUntil?: string;
  /** Tryb realizacji tego konkretnego terminu. */
  mode: SlotMode;
}

/**
 * Rezerwacja wizyty. `state` przechodzi wg kanonicznego cyklu (BOOKING_TRANSITIONS).
 * Rezerwacja tworzona jest jako `draft`/`locked` i domyka się w `confirmed`.
 */
export interface Booking {
  id: string;
  specialistId: string;
  serviceId: string;
  slotId: string;
  /** Imię i nazwisko pacjenta (u logopedów często rodzic rezerwujący dla dziecka). */
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  /** Aktualny stan kanoniczny rezerwacji. */
  state: BookingState;
  /** Znacznik utworzenia rezerwacji (ISO 8601). */
  createdAt: string;
  /** Początek terminu wizyty (ISO 8601). */
  startsAt: string;
  /** Cena wizyty w PLN (pełne złote), utrwalona w momencie rezerwacji. */
  pricePln: number;
  /** Opcjonalne uwagi pacjenta do wizyty. */
  notes?: string;
}

/**
 * Opinia o specjaliście. Opinia trafia do publikacji dopiero po moderacji
 * (`status = "approved"`, event review.approved). Powiązanie z `bookingId`
 * gwarantuje, że opinia pochodzi od pacjenta po odbytej wizycie (completed).
 */
export interface Review {
  id: string;
  specialistId: string;
  /** Rezerwacja, której dotyczy opinia (opcjonalnie — dowód odbytej wizyty). */
  bookingId?: string;
  authorName: string;
  /** Ocena w skali 1–5. */
  rating: number;
  text: string;
  /** Znacznik wystawienia opinii (ISO 8601). */
  createdAt: string;
  /** Status moderacji opinii. */
  status: ReviewStatus;
  /** Znacznik publikacji po zatwierdzeniu (ISO 8601, opcjonalny). */
  publishedAt?: string;
}

/**
 * Rekord weryfikacji specjalisty — stan procesu C3 → D1 → D3 wraz z SLA
 * kolejki ręcznej (do 24 h roboczych) i ewentualnym powodem odrzucenia.
 */
export interface Verification {
  specialistId: string;
  /** Numer PWZ zgłoszony do weryfikacji. */
  pwzNumber: string;
  /** Rejestr zawodowy, w którym sprawdzany jest PWZ. */
  registry: ProfessionalRegistry;
  /** Aktualny stan cyklu weryfikacji. */
  state: VerificationState;
  /** Znacznik zgłoszenia do weryfikacji (ISO 8601). */
  submittedAt: string;
  /** Termin SLA ręcznej weryfikacji (ISO 8601, opcjonalny — do 24 h roboczych). */
  slaDeadline?: string;
  /** Powód odrzucenia widoczny dla specjalisty (opcjonalny). */
  rejectionReason?: string;
}
