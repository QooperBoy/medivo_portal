/**
 * Kontrakty API mocka — cel dla warstwy MSW (msw-engineer) oraz api-clienta.
 *
 * Dla każdego endpointu definiujemy: ścieżkę (path template), metodę HTTP oraz
 * typy `Params` / `Query` / `Body` / `Response`. Warstwa czysto domenowa —
 * BEZ importów react/next/msw.
 *
 * Sygnalizacja dla BE Inspectora (patrz src/lib/be-inspector.ts):
 *  - MUTACJE rezerwacji zwracają nagłówek `x-state-transition` z opisem przejścia,
 *    np. "locked→confirmed" (dla POST /api/bookings/:id/transition oraz POST /api/bookings).
 *  - ODCZYTY obsługiwane przez silniki są oznaczane nagłówkiem `x-engine`,
 *    np. "G5-slot-lock" (GET .../slots), "G7-scoring" (scoring), "G6-waitlist".
 *  - MUTACJE PANELU specjalisty spoza cyklu rezerwacji (grafik E2, usługi E3)
 *    także oznaczane są nagłówkiem `x-engine`, np. "E2-availability",
 *    "E3-services"; przejścia stanów rezerwacji nadal idą przez
 *    `transitionBooking` z nagłówkiem `x-state-transition`.
 * Handlery MSW powinny te nagłówki ustawiać, a api-client — przepisywać je do logu.
 */

import type { Booking, Review, Service, Slot, Specialist } from './types';
import type { BookingState } from './booking-states';
import type { ServiceMode, SlotMode } from './types';

/** Metody HTTP używane w kontraktach mocka. */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Nazwy nagłówków sygnalizacyjnych dla BE Inspectora. */
export const STATE_TRANSITION_HEADER = 'x-state-transition';
export const ENGINE_HEADER = 'x-engine';

/* ------------------------------------------------------------------ *
 * GET /api/specialists — lista/wyszukiwarka specjalistów (A3)
 * ------------------------------------------------------------------ */

/** Parametry query wyszukiwarki specjalistów. Wszystkie opcjonalne. */
export interface SpecialistsQuery {
  /** Fraza wyszukiwania (imię/nazwisko/specjalizacja). */
  q?: string;
  /** Filtr po mieście. */
  city?: string;
  /** Filtr po trybie realizacji. */
  mode?: ServiceMode;
  /** Filtr po pojedynczej specjalizacji/metodzie. */
  specialization?: string;
}

/**
 * Pozycja wyniku wyszukiwarki (A3): profil + kilka najbliższych wolnych terminów
 * pokazywanych INLINE na karcie. `previewSlots` pochodzą z „availability batch API"
 * (jedno zbiorcze zapytanie dla całej strony wyników), live z grafiku (E2).
 */
export interface SpecialistSearchItem extends Specialist {
  /** Najbliższe wolne terminy (posortowane rosnąco) — inline sloty karty (A3). */
  previewSlots: Slot[];
}

/** Odpowiedź listy specjalistów wraz z liczbą wszystkich pasujących wyników. */
export interface SpecialistsListResponse {
  items: SpecialistSearchItem[];
  total: number;
}

/* ------------------------------------------------------------------ *
 * GET /api/specialists/:slug — profil publiczny (A4)
 * ------------------------------------------------------------------ */

/** Parametry ścieżki profilu specjalisty. */
export interface SpecialistDetailParams {
  slug: string;
}

/** Profil specjalisty rozszerzony o usługi i opublikowane opinie. */
export type SpecialistDetailResponse = Specialist & {
  services: Service[];
  reviews: Review[];
};

/* ------------------------------------------------------------------ *
 * GET /api/specialists/:id/slots — dostępne terminy (obsł. silnik G5)
 * ------------------------------------------------------------------ */

/** Parametry ścieżki slotów specjalisty. */
export interface SpecialistSlotsParams {
  id: string;
}

/** Zakres czasu dla listy slotów (ISO 8601). Wszystkie pola opcjonalne. */
export interface SpecialistSlotsQuery {
  /** Dolna granica zakresu (ISO 8601). */
  from?: string;
  /** Górna granica zakresu (ISO 8601). */
  to?: string;
  /**
   * Czy uwzględnić sloty `blocked` (E2). Publiczny odczyt domyślnie je pomija;
   * panel specjalisty prosi o `includeBlocked=true`, by pokazać blokady w grafiku.
   */
  includeBlocked?: boolean;
}

/** Lista slotów specjalisty. Odczyt oznaczany `x-engine: G5-slot-lock`. */
export interface SlotsListResponse {
  items: Slot[];
}

/* ------------------------------------------------------------------ *
 * GET /api/specialists/:id/reviews — opinie profilu
 * ------------------------------------------------------------------ */

/** Parametry ścieżki opinii specjalisty. */
export interface SpecialistReviewsParams {
  id: string;
}

/** Lista opinii specjalisty (publikowane po moderacji). */
export interface ReviewsListResponse {
  items: Review[];
}

/* ------------------------------------------------------------------ *
 * POST /api/bookings — utworzenie rezerwacji (checkout A5)
 * ------------------------------------------------------------------ */

/**
 * Body tworzenia rezerwacji (draft z checkoutu). Bez pól serwerowych
 * (`id`, `state`, `createdAt`) — te ustawia mock.
 */
export interface CreateBookingBody {
  specialistId: string;
  serviceId: string;
  slotId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  /** Początek terminu wizyty (ISO 8601). */
  startsAt: string;
  /** Cena wizyty w PLN (pełne złote). */
  pricePln: number;
  /** Opcjonalne uwagi pacjenta. */
  notes?: string;
}

/**
 * Odpowiedź: utworzona rezerwacja. Stan początkowy zgodny z cyklem —
 * `draft` (formularz) lub `locked` po założeniu locka slotu (G5).
 * Odpowiedź niesie nagłówek `x-state-transition`, np. "→locked".
 */
export type CreateBookingResponse = Booking;

/* ------------------------------------------------------------------ *
 * GET /api/bookings/:id — odczyt rezerwacji
 * ------------------------------------------------------------------ */

/** Parametry ścieżki rezerwacji. */
export interface BookingParams {
  id: string;
}

/** Odpowiedź: pojedyncza rezerwacja. */
export type BookingResponse = Booking;

/* ------------------------------------------------------------------ *
 * POST /api/bookings/:id/transition — zmiana stanu rezerwacji
 * ------------------------------------------------------------------ */

/**
 * Body przejścia stanu. Docelowy stan `to` jest walidowany po stronie mocka
 * przez `assertTransition(from, to)` — niedozwolone przejście → błąd.
 */
export interface TransitionBookingBody {
  /** Docelowy stan kanoniczny. */
  to: BookingState;
  /**
   * Czy odwołanie nastąpiło po dozwolonym czasie (dla confirmed→cancelled_by_patient) —
   * wpływa na wybór eventu (booking.cancelled vs booking.cancelled_late).
   */
  late?: boolean;
}

/**
 * Odpowiedź: rezerwacja po przejściu. Niesie nagłówek `x-state-transition`
 * z opisem przejścia, np. "confirmed→completed".
 */
export type TransitionBookingResponse = Booking;

/* ------------------------------------------------------------------ *
 * GET /api/me/specialist — obecny (mock „zalogowany") specjalista (E1)
 * ------------------------------------------------------------------ */

/**
 * Profil specjalisty przypisanego do bieżącej (mockowanej) sesji panelu.
 * Panel startuje od tego endpointu, by ustalić kontekst `:id` dla dalszych żądań.
 */
export type MeSpecialistResponse = Specialist;

/* ------------------------------------------------------------------ *
 * GET /api/specialists/:id/bookings — rezerwacje w panelu (E1/E4)
 * ------------------------------------------------------------------ */

/**
 * Pozycja listy rezerwacji panelu — rezerwacja wzbogacona o dane pomocnicze
 * dla widoku specjalisty. Odczyt oznaczany `x-engine: G7-scoring`
 * (wskaźnik no-show pochodzi ze scoringu G7).
 */
export interface BookingListItem extends Booking {
  /** liczba nieobecności pacjenta ze scoringu G7 (wskaźnik no-show, E4) */
  patientNoShowCount: number;
  /** nazwa usługi (do wyświetlenia) */
  serviceName: string;
}

/**
 * Zakres logiczny filtrowania listy rezerwacji panelu:
 *  - `pending`  = pending_approval (do decyzji akceptuj/odrzuć, E4);
 *  - `upcoming` = confirmed w przyszłości;
 *  - `past`     = confirmed po terminie (do potwierdzenia „odbyła się" / no-show, E7/E8);
 *  - `history`  = completed | no_show | cancelled_* (stany zamknięte);
 *  - `all`      = wszystkie.
 */
export type BookingScope = 'pending' | 'upcoming' | 'past' | 'history' | 'all';

/** Parametry ścieżki listy rezerwacji specjalisty. */
export interface SpecialistBookingsParams {
  id: string;
}

/** Query listy rezerwacji panelu. Oba pola opcjonalne (filtry zawężające). */
export interface SpecialistBookingsQuery {
  /** Zakres logiczny (patrz `BookingScope`). */
  scope?: BookingScope;
  /** Zawężenie do pojedynczego stanu kanonicznego. */
  state?: BookingState;
}

/** Lista rezerwacji panelu. Odczyt oznaczany `x-engine: G7-scoring`. */
export interface SpecialistBookingsResponse {
  items: BookingListItem[];
}

/* ------------------------------------------------------------------ *
 * Grafik / dostępność (E2) — ręczne blokowanie i dodawanie terminów
 * ------------------------------------------------------------------ *
 * Model dostępności = godziny pracy − blokady − zajęte. Mutacje panelu
 * ustawiają nagłówek `x-engine: E2-availability` (sygnalizacja dla BE
 * Inspectora). Nie są to przejścia stanu rezerwacji — te idą osobno przez
 * `transitionBooking` z nagłówkiem `x-state-transition`.
 */

/** Parametry ścieżki akcji na pojedynczym slocie (block/unblock). */
export interface SlotActionParams {
  id: string;
}

/**
 * Body dodania terminu do grafiku (E2). Tworzy slot o statusie `available`.
 * `serviceId` opcjonalny — slot może być ogólny (bez przypisanej usługi).
 */
export interface AddSlotBody {
  /** Początek slotu (ISO 8601). */
  startsAt: string;
  /** Koniec slotu (ISO 8601). */
  endsAt: string;
  /** Tryb realizacji terminu. */
  mode: SlotMode;
  /** Usługa przypisana do slotu (opcjonalnie). */
  serviceId?: string;
}

/**
 * Odpowiedź akcji grafiku (block/unblock/addSlot): slot po zmianie.
 *  - block:   available → blocked;
 *  - unblock: blocked → available;
 *  - addSlot: nowy slot o statusie `available`.
 * Niesie nagłówek `x-engine: E2-availability`.
 */
export type SlotActionResponse = Slot;

/* ------------------------------------------------------------------ *
 * Usługi i cennik (E3) — CRUD ze słownika wertykalu (F8)
 * ------------------------------------------------------------------ *
 * Specjalista NIE wymyśla nazw usług — wybiera pozycję ze słownika (F8)
 * i ustawia cenę/czas/tryb. Mutacje panelu ustawiają nagłówek
 * `x-engine: E3-services` (sygnalizacja dla BE Inspectora).
 */

/** Pozycja słownika usług wertykalu (F8) — dozwolone nazwy usług. */
export interface ServiceCatalogItem {
  /** nazwa ze słownika wertykalu (F8) */
  name: string;
  /** Domyślny czas trwania w minutach (podpowiedź formularza). */
  defaultDurationMin: number;
  /** Sugerowana cena w PLN (pełne złote, opcjonalna podpowiedź). */
  suggestedPricePln?: number;
}

/** Słownik usług wertykalu (F8). Odczyt oznaczany `x-engine: E3-services`. */
export interface ServiceCatalogResponse {
  items: ServiceCatalogItem[];
}

/** Parametry ścieżki usług specjalisty. */
export interface SpecialistServicesParams {
  id: string;
}

/**
 * Body dodania usługi (E3). Nazwa MUSI pochodzić ze słownika (F8) —
 * mock waliduje `catalogName` względem `serviceCatalog`.
 */
export interface AddServiceBody {
  /** nazwa MUSI pochodzić ze słownika */
  catalogName: string;
  /** Cena usługi w PLN (pełne złote). */
  pricePln: number;
  /** Czas trwania w minutach. */
  durationMin: number;
  /** Tryb realizacji usługi. */
  mode: ServiceMode;
}

/** Odpowiedź dodania usługi: utworzona usługa. Niesie `x-engine: E3-services`. */
export type AddServiceResponse = Service;

/** Parametry ścieżki akcji na pojedynczej usłudze (update/delete). */
export interface ServiceActionParams {
  id: string;
}

/**
 * Body edycji usługi (E3). Wszystkie pola opcjonalne (edycja częściowa).
 * Nazwy usługi się nie edytuje — pochodzi ze słownika (F8) i jest stała.
 */
export interface UpdateServiceBody {
  /** Nowa cena w PLN (pełne złote). */
  pricePln?: number;
  /** Nowy czas trwania w minutach. */
  durationMin?: number;
  /** Nowy tryb realizacji usługi. */
  mode?: ServiceMode;
}

/** Odpowiedź edycji usługi: usługa po zmianie. Niesie `x-engine: E3-services`. */
export type UpdateServiceResponse = Service;

/** Odpowiedź usunięcia usługi (E3). Niesie `x-engine: E3-services`. */
export interface DeleteServiceResponse {
  ok: true;
}

/* ------------------------------------------------------------------ *
 * Rejestr endpointów (metadane path/method) dla msw-engineera
 * ------------------------------------------------------------------ */

/** Metadane pojedynczego endpointu mocka. */
export interface EndpointMeta {
  method: HttpMethod;
  /** Szablon ścieżki z parametrami w stylu `:param`. */
  path: string;
}

/**
 * Rejestr endpointów mocka. Klucze są stabilnymi identyfikatorami logicznymi
 * (do referencji z handlerów/testów). Ścieżki używają konwencji `:param`.
 */
export const API_ENDPOINTS = {
  listSpecialists: { method: 'GET', path: '/api/specialists' },
  getSpecialist: { method: 'GET', path: '/api/specialists/:slug' },
  listSlots: { method: 'GET', path: '/api/specialists/:id/slots' },
  listReviews: { method: 'GET', path: '/api/specialists/:id/reviews' },
  createBooking: { method: 'POST', path: '/api/bookings' },
  getBooking: { method: 'GET', path: '/api/bookings/:id' },
  transitionBooking: {
    method: 'POST',
    path: '/api/bookings/:id/transition',
  },
  // Panel specjalisty (E1–E8): obecny specjalista, lista rezerwacji, grafik, usługi
  getMeSpecialist: { method: 'GET', path: '/api/me/specialist' },
  listSpecialistBookings: {
    method: 'GET',
    path: '/api/specialists/:id/bookings',
  },
  blockSlot: { method: 'POST', path: '/api/slots/:id/block' },
  unblockSlot: { method: 'POST', path: '/api/slots/:id/unblock' },
  addSlot: { method: 'POST', path: '/api/specialists/:id/slots' },
  serviceCatalog: { method: 'GET', path: '/api/service-catalog' },
  addService: { method: 'POST', path: '/api/specialists/:id/services' },
  updateService: { method: 'PATCH', path: '/api/services/:id' },
  deleteService: { method: 'DELETE', path: '/api/services/:id' },
} as const satisfies Record<string, EndpointMeta>;

/** Logiczny identyfikator endpointu (klucz `API_ENDPOINTS`). */
export type ApiEndpointId = keyof typeof API_ENDPOINTS;
