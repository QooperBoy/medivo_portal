/**
 * Handlery MSW implementujące kontrakty API mocka (patrz `@/domain/api-contracts`).
 *
 * Każdy handler:
 *  1. symuluje opóźnienie sieci (`withLatency`),
 *  2. sprawdza opcjonalny chaos (`maybeError`) — jeśli wyłączony (domyślnie), pomija,
 *  3. zwraca odpowiedź o kształcie zgodnym z typami `*Response`.
 *
 * Nagłówki sygnalizacyjne dla BE Inspectora:
 *  - `x-engine` — który silnik G* obsłużył ODCZYT / mutację,
 *  - `x-state-transition` — opis przejścia stanu rezerwacji (mutacje).
 */

import { http, HttpResponse } from 'msw';
import {
  ADMIN_ENDPOINTS,
  API_ENDPOINTS,
  AUTH_ENDPOINTS,
  BookingState,
  DomainEvent,
  ENGINE_HEADER,
  InvalidBookingTransitionError,
  InvalidVerificationTransitionError,
  ONBOARDING_ENDPOINTS,
  PANEL_EXTRA_ENDPOINTS,
  PATIENT_ENDPOINTS,
  ProfessionalRegistry,
  STATE_TRANSITION_HEADER,
  eventsForTransition,
} from '@/domain';
import type {
  AbuseFlag,
  AbuseFlagsResponse,
  AddServiceResponse,
  AdminDisputesResponse,
  AdminReviewsResponse,
  AdminUsersResponse,
  AdminVerificationsResponse,
  AuditResponse,
  AuthResponse,
  Address,
  Booking,
  BookingScope,
  CreateBookingBody,
  CreateReviewResponse,
  CreateVacationBody,
  DeleteServiceResponse,
  LoginBody,
  MeSpecialistResponse,
  NotificationPrefs,
  PatientBookingsResponse,
  RegisterPatientBody,
  RegisterSpecialistBody,
  Review,
  ReviewsListResponse,
  RodoExport,
  ScoringInfo,
  ServiceCatalogResponse,
  ServiceMode,
  SessionResponse,
  SlotActionResponse,
  SlotMode,
  SlotsListResponse,
  Specialist,
  SpecialistBookingsResponse,
  SpecialistDetailResponse,
  SpecialistStats,
  SpecialistsQuery,
  Subscription,
  SubscriptionPlansResponse,
  TransitionBookingBody,
  UpdateNotificationPrefsBody,
  UpdateServiceBody,
  UpdateServiceResponse,
  UpdateSpecialistBody,
  User,
  VacationBlock,
  VacationResponse,
  Verification,
  VerificationResponse,
  WaitlistEntry,
  WaitlistResponse,
} from '@/domain';
import {
  AbuseFlagNotFoundError,
  AlreadyPublishedError,
  AuthError,
  BookingNotFoundError,
  CatalogServiceInvalidError,
  InvalidSubscriptionPlanError,
  InvalidVacationRangeError,
  RejectReasonRequiredError,
  ReviewAlreadyExistsError,
  ReviewNotAllowedError,
  ReviewNotFoundError,
  ServiceNotFoundError,
  SlotNotBlockableError,
  SlotNotFoundError,
  SlotUnavailableError,
  SpecialistNotFoundError,
  UserNotFoundError,
  VacationNotFoundError,
  VerificationNotFoundError,
  addService,
  addSlot,
  approveReview,
  approveVerification,
  blockSlot,
  blockUser,
  changeSubscription,
  createBooking,
  createReview,
  createVacation,
  deleteService,
  deleteVacation,
  getBooking,
  getMeSpecialist,
  getNotificationPrefs,
  getReviewsBySpecialist,
  getScoring,
  getServiceCatalog,
  getServicesBySpecialist,
  getSession,
  getSlots,
  getSpecialistBySlug,
  getSpecialistStats,
  getSpecialistVerification,
  getSubscription,
  getSubscriptionPlans,
  goLive,
  joinWaitlist,
  listAbuseFlags,
  listAdminUsers,
  listAdminVerifications,
  listAudit,
  listDisputes,
  listPatientBookings,
  listPendingReviews,
  listSpecialistBookings,
  listSpecialists,
  listVacation,
  listWaitlist,
  login,
  logout,
  registerPatient,
  registerSpecialist,
  rejectReview,
  rejectVerification,
  resolveAbuseFlag,
  resolveDispute,
  resubmitVerification,
  rodoErase,
  rodoExport,
  transitionBooking,
  unblockSlot,
  unblockUser,
  updateNotificationPrefs,
  updateService,
  updateSpecialist,
} from './db';
import { maybeError, withLatency } from './latency';

/* ------------------------------------------------------------------ *
 * Pomocnicze
 * ------------------------------------------------------------------ */

/** Pierwszy string z parametru ścieżki MSW (może być string | string[]). */
function firstParam(value: string | readonly string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (value && value.length > 0) return value[0];
  return '';
}

/** Odpowiedź błędu chaosu (body ma kształt JSON — zawężamy z `unknown`). */
function chaosResponse(
  err: { status: number; body: unknown },
  headers?: Record<string, string>,
) {
  return HttpResponse.json(err.body as Record<string, unknown>, {
    status: err.status,
    headers,
  });
}

/** Bezpieczne parsowanie trybu realizacji z query. */
function parseMode(value: string | null): ServiceMode | undefined {
  if (value === 'online' || value === 'stacjonarnie' || value === 'obie') return value;
  return undefined;
}

/** Type guard: czy wartość jest kanonicznym stanem rezerwacji. */
function isBookingState(value: unknown): value is BookingState {
  return (
    typeof value === 'string' && (Object.values(BookingState) as string[]).includes(value)
  );
}

/** Type guard: czy wartość jest dozwolonym zakresem listy rezerwacji panelu. */
function isBookingScope(value: unknown): value is BookingScope {
  return (
    value === 'pending' ||
    value === 'upcoming' ||
    value === 'past' ||
    value === 'history' ||
    value === 'all'
  );
}

/** Type guard: czy wartość jest trybem pojedynczego slotu. */
function isSlotMode(value: unknown): value is SlotMode {
  return value === 'online' || value === 'stacjonarnie';
}

/** Type guard: czy wartość jest dozwolonym rejestrem zawodowym (KRL/KIF). */
function isProfessionalRegistry(value: unknown): value is ProfessionalRegistry {
  return value === ProfessionalRegistry.KRL || value === ProfessionalRegistry.KIF;
}

/** Type guard: czy wartość ma kształt adresu gabinetu (`Address`), E11. */
function isAddress(value: unknown): value is Address {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.label === 'string' &&
    typeof a.street === 'string' &&
    typeof a.city === 'string' &&
    typeof a.postalCode === 'string' &&
    (a.lat === undefined || typeof a.lat === 'number') &&
    (a.lng === undefined || typeof a.lng === 'number')
  );
}

/** Dobór silnika (nagłówek x-engine) dla mutacji na podstawie eventu pierwotnego. */
function engineForEvents(events: DomainEvent[]): string | null {
  const first = events[0];
  switch (first) {
    case DomainEvent.BookingCreated:
      return 'G9-payments';
    case DomainEvent.BookingCancelled:
    case DomainEvent.BookingCancelledLate:
      return 'G6-waitlist';
    case DomainEvent.VisitNoShow:
      return 'G7-scoring';
    case DomainEvent.VisitApproved:
      return 'G4-auto-approval';
    case DomainEvent.DisputeOpened:
      return 'F3-dispute';
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ *
 * Handlery
 * ------------------------------------------------------------------ */

export const handlers = [
  /* GET /api/specialists — lista/wyszukiwarka (silnik G-search) */
  http.get(API_ENDPOINTS.listSpecialists.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G-search' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const url = new URL(request.url);
    const query: SpecialistsQuery = {
      q: url.searchParams.get('q') ?? undefined,
      city: url.searchParams.get('city') ?? undefined,
      mode: parseMode(url.searchParams.get('mode')),
      specialization: url.searchParams.get('specialization') ?? undefined,
    };

    return HttpResponse.json(listSpecialists(query), { status: 200, headers: engineHeaders });
  }),

  /* GET /api/specialists/:slug — profil publiczny (z usługami i opiniami) */
  http.get(API_ENDPOINTS.getSpecialist.path, async ({ params }) => {
    await withLatency();

    const err = maybeError();
    if (err) return chaosResponse(err);

    const slug = firstParam(params.slug);
    const specialist = getSpecialistBySlug(slug);
    if (!specialist) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Nie znaleziono specjalisty.' },
        { status: 404 },
      );
    }

    const body: SpecialistDetailResponse = {
      ...specialist,
      services: getServicesBySpecialist(specialist.id),
      reviews: getReviewsBySpecialist(specialist.id),
    };
    return HttpResponse.json(body, { status: 200 });
  }),

  /* GET /api/specialists/:id/slots — grafik (silnik G5-slot-lock) */
  http.get(API_ENDPOINTS.listSlots.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G5-slot-lock' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    const url = new URL(request.url);
    // `includeBlocked=true` (panel grafiku) pokazuje ręczne blokady (E2);
    // publiczny odczyt pomija sloty `blocked`.
    const items = getSlots(id, {
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      includeBlocked: url.searchParams.get('includeBlocked') === 'true',
    });

    const body: SlotsListResponse = { items };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* GET /api/specialists/:id/reviews — opinie (silnik G7-scoring) */
  http.get(API_ENDPOINTS.listReviews.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G7-scoring' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    const body: ReviewsListResponse = { items: getReviewsBySpecialist(id) };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/bookings — utworzenie rezerwacji (lock slotu, G5); draft→locked */
  http.post(API_ENDPOINTS.createBooking.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G5-slot-lock' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    const body = raw as CreateBookingBody;

    try {
      const booking = createBooking(body);
      return HttpResponse.json(booking, {
        status: 201,
        headers: {
          ...engineHeaders,
          [STATE_TRANSITION_HEADER]: 'draft→locked',
        },
      });
    } catch (e) {
      if (e instanceof SlotUnavailableError) {
        return HttpResponse.json(
          { error: 'slot_unavailable', message: e.message },
          { status: 409, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* GET /api/bookings/:id — odczyt rezerwacji */
  http.get(API_ENDPOINTS.getBooking.path, async ({ params }) => {
    await withLatency();

    const err = maybeError();
    if (err) return chaosResponse(err);

    const id = firstParam(params.id);
    const booking = getBooking(id);
    if (!booking) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Nie znaleziono rezerwacji.' },
        { status: 404 },
      );
    }
    return HttpResponse.json(booking, { status: 200 });
  }),

  /* POST /api/bookings/:id/transition — zmiana stanu (walidacja assertTransition) */
  http.post(API_ENDPOINTS.transitionBooking.path, async ({ params, request }) => {
    await withLatency();

    const err = maybeError();
    if (err) return chaosResponse(err);

    const id = firstParam(params.id);
    const booking = getBooking(id);
    if (!booking) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Nie znaleziono rezerwacji.' },
        { status: 404 },
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400 },
      );
    }

    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400 },
      );
    }
    const body = raw as TransitionBookingBody;
    if (!isBookingState(body.to)) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Pole "to" nie jest poprawnym stanem.' },
        { status: 400 },
      );
    }

    const from = booking.state;
    const to = body.to;
    const late = body.late === true;
    const transitionLabel = `${from}→${to}`;

    try {
      const updated = transitionBooking(id, to, { late });
      const events = eventsForTransition(from, to, { late });
      const headers: Record<string, string> = {
        [STATE_TRANSITION_HEADER]: transitionLabel,
      };
      const engine = engineForEvents(events);
      if (engine) headers[ENGINE_HEADER] = engine;

      return HttpResponse.json(updated, { status: 200, headers });
    } catch (e) {
      if (e instanceof InvalidBookingTransitionError) {
        return HttpResponse.json(
          {
            error: 'invalid_transition',
            message: e.message,
            from: e.from,
            to: e.to,
          },
          { status: 409, headers: { [STATE_TRANSITION_HEADER]: transitionLabel } },
        );
      }
      throw e;
    }
  }),

  /* ---------------------------------------------------------------- *
   * Panel specjalisty (E1–E8)
   * ---------------------------------------------------------------- */

  /* GET /api/me/specialist — „zalogowany" specjalista panelu (E1) */
  http.get(API_ENDPOINTS.getMeSpecialist.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E1-panel' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: MeSpecialistResponse = getMeSpecialist();
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* GET /api/specialists/:id/bookings — rezerwacje panelu (E1/E4); scoring G7 */
  http.get(API_ENDPOINTS.listSpecialistBookings.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G7-scoring' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    const url = new URL(request.url);

    // Walidacja parametrów zawężających (scope/state) — nieprawidłowe → 400.
    let scope: BookingScope | undefined;
    const scopeRaw = url.searchParams.get('scope');
    if (scopeRaw !== null) {
      if (!isBookingScope(scopeRaw)) {
        return HttpResponse.json(
          { error: 'bad_request', message: 'Nieprawidłowy parametr "scope".' },
          { status: 400, headers: engineHeaders },
        );
      }
      scope = scopeRaw;
    }

    let state: BookingState | undefined;
    const stateRaw = url.searchParams.get('state');
    if (stateRaw !== null) {
      if (!isBookingState(stateRaw)) {
        return HttpResponse.json(
          { error: 'bad_request', message: 'Nieprawidłowy parametr "state".' },
          { status: 400, headers: engineHeaders },
        );
      }
      state = stateRaw;
    }

    const body: SpecialistBookingsResponse = {
      items: listSpecialistBookings(id, { scope, state }),
    };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/slots/:id/block — ręczna blokada terminu (E2) */
  http.post(API_ENDPOINTS.blockSlot.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E2-availability' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      const slot: SlotActionResponse = blockSlot(id);
      return HttpResponse.json(slot, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof SlotNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      if (e instanceof SlotNotBlockableError) {
        return HttpResponse.json(
          { error: 'slot_not_blockable', message: e.message },
          { status: 409, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* POST /api/slots/:id/unblock — zdjęcie blokady terminu (E2) */
  http.post(API_ENDPOINTS.unblockSlot.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E2-availability' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      const slot: SlotActionResponse = unblockSlot(id);
      return HttpResponse.json(slot, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof SlotNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* POST /api/specialists/:id/slots — ręczne dodanie terminu (E2); 201 */
  http.post(API_ENDPOINTS.addSlot.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E2-availability' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    const startsAt = src.startsAt;
    const endsAt = src.endsAt;
    const mode = isSlotMode(src.mode) ? src.mode : undefined;
    const serviceId = typeof src.serviceId === 'string' ? src.serviceId : undefined;
    if (
      typeof startsAt !== 'string' ||
      typeof endsAt !== 'string' ||
      mode === undefined
    ) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagane pola: startsAt, endsAt, mode.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const slot: SlotActionResponse = addSlot(id, { startsAt, endsAt, mode, serviceId });
    return HttpResponse.json(slot, { status: 201, headers: engineHeaders });
  }),

  /* GET /api/service-catalog — słownik usług wertykalu F8 (E3) */
  http.get(API_ENDPOINTS.serviceCatalog.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E3-services' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: ServiceCatalogResponse = { items: getServiceCatalog() };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/specialists/:id/services — dodanie usługi ze słownika (E3); 201 */
  http.post(API_ENDPOINTS.addService.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E3-services' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    const catalogName = src.catalogName;
    const pricePln = src.pricePln;
    const durationMin = src.durationMin;
    const mode = typeof src.mode === 'string' ? parseMode(src.mode) : undefined;
    if (
      typeof catalogName !== 'string' ||
      typeof pricePln !== 'number' ||
      typeof durationMin !== 'number' ||
      mode === undefined
    ) {
      return HttpResponse.json(
        {
          error: 'bad_request',
          message: 'Wymagane pola: catalogName, pricePln, durationMin, mode.',
        },
        { status: 400, headers: engineHeaders },
      );
    }

    try {
      const service: AddServiceResponse = addService(id, {
        catalogName,
        pricePln,
        durationMin,
        mode,
      });
      return HttpResponse.json(service, { status: 201, headers: engineHeaders });
    } catch (e) {
      if (e instanceof CatalogServiceInvalidError) {
        return HttpResponse.json(
          { error: 'invalid_catalog_name', message: e.message },
          { status: 400, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* PATCH /api/services/:id — edycja ceny/czasu/trybu usługi (E3) */
  http.patch(API_ENDPOINTS.updateService.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E3-services' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    const patch: UpdateServiceBody = {};
    if (typeof src.pricePln === 'number') patch.pricePln = src.pricePln;
    if (typeof src.durationMin === 'number') patch.durationMin = src.durationMin;
    if (typeof src.mode === 'string') {
      const mode = parseMode(src.mode);
      if (mode) patch.mode = mode;
    }

    try {
      const service: UpdateServiceResponse = updateService(id, patch);
      return HttpResponse.json(service, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof ServiceNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* DELETE /api/services/:id — usunięcie usługi (E3) */
  http.delete(API_ENDPOINTS.deleteService.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E3-services' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      deleteService(id);
      const body: DeleteServiceResponse = { ok: true };
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof ServiceNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* ---------------------------------------------------------------- *
   * Panel specjalisty (rozszerzenie E) — statystyki (E10), subskrypcja
   * (E12), ustawienia profilu (E11), tryb urlop (E6). Ścieżki 2-/3-segmentowe
   * (`:id/stats|subscription|vacation[/:vid]`) oraz metoda PATCH na
   * `/api/specialists/:id` są rozłączne z 1-segmentowym `GET /api/specialists/:slug`
   * i z `POST /api/specialists/:id/services|slots` (inny ostatni segment).
   * ---------------------------------------------------------------- */

  /* GET /api/specialists/:id/stats — statystyki praktyki (E10) */
  http.get(PANEL_EXTRA_ENDPOINTS.stats.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E10-stats' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    const body: SpecialistStats = getSpecialistStats(id);
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* GET /api/specialists/:id/subscription — bieżąca subskrypcja (E12) */
  http.get(PANEL_EXTRA_ENDPOINTS.getSubscription.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E12-billing' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    const body: Subscription = getSubscription(id);
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/specialists/:id/subscription — zmiana planu (E12); 400 zły plan */
  http.post(PANEL_EXTRA_ENDPOINTS.changeSubscription.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E12-billing' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    if (typeof src.planId !== 'string') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagane pole: planId.' },
        { status: 400, headers: engineHeaders },
      );
    }

    try {
      const body: Subscription = changeSubscription(id, src.planId);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof InvalidSubscriptionPlanError) {
        return HttpResponse.json(
          { error: 'invalid_plan', message: e.message },
          { status: 400, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* PATCH /api/specialists/:id — ustawienia profilu (E11); 404 gdy brak */
  http.patch(PANEL_EXTRA_ENDPOINTS.updateSpecialist.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E11-settings' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    const patch: UpdateSpecialistBody = {};
    if (typeof src.bio === 'string') patch.bio = src.bio;
    if (typeof src.online === 'boolean') patch.online = src.online;
    if (Array.isArray(src.languages)) {
      const arr: unknown[] = src.languages;
      if (arr.every((l): l is string => typeof l === 'string')) patch.languages = arr;
    }
    if (Array.isArray(src.addresses)) {
      const arr: unknown[] = src.addresses;
      if (arr.every(isAddress)) patch.addresses = arr;
    }

    try {
      const body: Specialist = updateSpecialist(id, patch);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof SpecialistNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* GET /api/specialists/:id/vacation — lista bloków urlopu (E6) */
  http.get(PANEL_EXTRA_ENDPOINTS.listVacation.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E6-vacation' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    const body: VacationResponse = { items: listVacation(id) };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/specialists/:id/vacation — dodanie bloku urlopu (E6); 201, 400 zły zakres */
  http.post(PANEL_EXTRA_ENDPOINTS.createVacation.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E6-vacation' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    const from = src.from;
    const to = src.to;
    const reason = typeof src.reason === 'string' ? src.reason : undefined;
    if (typeof from !== 'string' || typeof to !== 'string') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagane pola: from, to.' },
        { status: 400, headers: engineHeaders },
      );
    }

    try {
      const body: VacationBlock = createVacation(id, { from, to, reason });
      return HttpResponse.json(body, { status: 201, headers: engineHeaders });
    } catch (e) {
      if (e instanceof InvalidVacationRangeError) {
        return HttpResponse.json(
          { error: 'invalid_range', message: e.message },
          { status: 400, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* DELETE /api/specialists/:id/vacation/:vid — usunięcie bloku urlopu (E6); 404 gdy brak */
  http.delete(PANEL_EXTRA_ENDPOINTS.deleteVacation.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'E6-vacation' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    const vid = firstParam(params.vid);
    try {
      deleteVacation(id, vid);
      return HttpResponse.json({ ok: true }, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof VacationNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* ---------------------------------------------------------------- *
   * Uwierzytelnianie i sesja (EPIC A) — silnik „auth"
   * ---------------------------------------------------------------- */

  /* POST /api/auth/login — logowanie (dopasowanie po e-mailu); 401 gdy brak konta */
  http.post(AUTH_ENDPOINTS.login.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'auth' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    if (typeof src.email !== 'string' || typeof src.password !== 'string') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagane pola: email, password.' },
        { status: 400, headers: engineHeaders },
      );
    }
    const body: LoginBody = { email: src.email, password: src.password };

    try {
      const session: AuthResponse = login(body);
      return HttpResponse.json(session, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof AuthError) {
        return HttpResponse.json(
          { error: 'unauthorized', message: e.message },
          { status: e.status, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* POST /api/auth/register/patient — rejestracja pacjenta; 201, 409 gdy e-mail zajęty */
  http.post(AUTH_ENDPOINTS.registerPatient.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'auth' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    if (
      typeof src.firstName !== 'string' ||
      typeof src.lastName !== 'string' ||
      typeof src.email !== 'string' ||
      typeof src.phone !== 'string' ||
      typeof src.password !== 'string'
    ) {
      return HttpResponse.json(
        {
          error: 'bad_request',
          message: 'Wymagane pola: firstName, lastName, email, phone, password.',
        },
        { status: 400, headers: engineHeaders },
      );
    }
    const body: RegisterPatientBody = {
      firstName: src.firstName,
      lastName: src.lastName,
      email: src.email,
      phone: src.phone,
      password: src.password,
    };

    try {
      const session: AuthResponse = registerPatient(body);
      return HttpResponse.json(session, { status: 201, headers: engineHeaders });
    } catch (e) {
      if (e instanceof AuthError) {
        return HttpResponse.json(
          { error: 'email_taken', message: e.message },
          { status: e.status, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* POST /api/auth/register/specialist — rejestracja specjalisty; 201, 409 gdy e-mail zajęty */
  http.post(AUTH_ENDPOINTS.registerSpecialist.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'auth' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    if (
      typeof src.firstName !== 'string' ||
      typeof src.lastName !== 'string' ||
      typeof src.email !== 'string' ||
      typeof src.phone !== 'string' ||
      typeof src.password !== 'string' ||
      typeof src.pwzNumber !== 'string' ||
      typeof src.title !== 'string' ||
      !isProfessionalRegistry(src.registry)
    ) {
      return HttpResponse.json(
        {
          error: 'bad_request',
          message:
            'Wymagane pola: firstName, lastName, email, phone, password, pwzNumber, registry, title.',
        },
        { status: 400, headers: engineHeaders },
      );
    }
    const body: RegisterSpecialistBody = {
      firstName: src.firstName,
      lastName: src.lastName,
      email: src.email,
      phone: src.phone,
      password: src.password,
      pwzNumber: src.pwzNumber,
      registry: src.registry,
      title: src.title,
    };

    try {
      const session: AuthResponse = registerSpecialist(body);
      return HttpResponse.json(session, { status: 201, headers: engineHeaders });
    } catch (e) {
      if (e instanceof AuthError) {
        return HttpResponse.json(
          { error: 'email_taken', message: e.message },
          { status: e.status, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* GET /api/auth/session — bieżąca sesja (user lub null) */
  http.get(AUTH_ENDPOINTS.session.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'auth' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: SessionResponse = getSession();
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/auth/logout — wylogowanie (czyści sesję) */
  http.post(AUTH_ENDPOINTS.logout.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'auth' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    logout();
    return HttpResponse.json({ ok: true }, { status: 200, headers: engineHeaders });
  }),

  /* ---------------------------------------------------------------- *
   * Konto pacjenta (GRUPA B) — rezerwacje, opinie, powiadomienia,
   * waitlista, RODO. Tożsamość po `?email=`. Ścieżki `/api/patients/...`
   * są rozłączne z `/api/specialists/...` i `/api/bookings/...`.
   * ---------------------------------------------------------------- */

  /* GET /api/patients/bookings?email= — rezerwacje pacjenta (B4/B5/B6) */
  http.get(PATIENT_ENDPOINTS.listBookings.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'bookings' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const email = new URL(request.url).searchParams.get('email');
    if (email === null || email.trim() === '') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagany parametr "email".' },
        { status: 400, headers: engineHeaders },
      );
    }

    const body: PatientBookingsResponse = { items: listPatientBookings(email) };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* GET /api/patients/scoring?email= — scoring nieobecności → bramka checkoutu (A5/A6); G7 */
  http.get(PATIENT_ENDPOINTS.scoring.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G7-scoring' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const email = new URL(request.url).searchParams.get('email');
    if (email === null || email.trim() === '') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagany parametr "email".' },
        { status: 400, headers: engineHeaders },
      );
    }

    const body: ScoringInfo = getScoring(email);
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/reviews — wystawienie opinii (B5); 201, 404/409 przy walidacji */
  http.post(PATIENT_ENDPOINTS.createReview.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G3-review' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    const bookingId = src.bookingId;
    const rating = src.rating;
    const text = src.text;
    const authorName = src.authorName;
    if (
      typeof bookingId !== 'string' ||
      typeof rating !== 'number' ||
      typeof text !== 'string' ||
      typeof authorName !== 'string'
    ) {
      return HttpResponse.json(
        {
          error: 'bad_request',
          message: 'Wymagane pola: bookingId, rating, text, authorName.',
        },
        { status: 400, headers: engineHeaders },
      );
    }
    if (rating < 1 || rating > 5) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Ocena musi mieścić się w skali 1–5.' },
        { status: 400, headers: engineHeaders },
      );
    }

    try {
      const review: CreateReviewResponse = createReview({
        bookingId,
        rating,
        text,
        authorName,
      });
      return HttpResponse.json(review, { status: 201, headers: engineHeaders });
    } catch (e) {
      if (e instanceof BookingNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      if (e instanceof ReviewNotAllowedError || e instanceof ReviewAlreadyExistsError) {
        return HttpResponse.json(
          { error: 'review_conflict', message: e.message },
          { status: 409, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* GET /api/patients/notification-prefs?email= — preferencje powiadomień (G1) */
  http.get(PATIENT_ENDPOINTS.getNotifPrefs.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G1-notifications' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const email = new URL(request.url).searchParams.get('email');
    if (email === null || email.trim() === '') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagany parametr "email".' },
        { status: 400, headers: engineHeaders },
      );
    }

    const body: NotificationPrefs = getNotificationPrefs(email);
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* PUT /api/patients/notification-prefs?email= — aktualizacja preferencji (G1) */
  http.put(PATIENT_ENDPOINTS.updateNotifPrefs.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G1-notifications' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const email = new URL(request.url).searchParams.get('email');
    if (email === null || email.trim() === '') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagany parametr "email".' },
        { status: 400, headers: engineHeaders },
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    // Pola preferencji (boolean). Uwaga: `src.email` to KANAŁ e-mail (boolean),
    // nie tożsamość pacjenta — ta pochodzi z query `?email=` (string).
    const src = raw as Record<string, unknown>;
    const patch: UpdateNotificationPrefsBody = {};
    if (typeof src.email === 'boolean') patch.email = src.email;
    if (typeof src.sms === 'boolean') patch.sms = src.sms;
    if (typeof src.reminders === 'boolean') patch.reminders = src.reminders;
    if (typeof src.marketing === 'boolean') patch.marketing = src.marketing;

    const body: NotificationPrefs = updateNotificationPrefs(email, patch);
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/waitlist — zapis na waitlistę „daj znać o wolnym terminie" (G6); 201 */
  http.post(PATIENT_ENDPOINTS.joinWaitlist.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G6-waitlist' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }

    const src = raw as Record<string, unknown>;
    const specialistId = src.specialistId;
    const patientName = src.patientName;
    const patientEmail = src.patientEmail;
    const serviceId = typeof src.serviceId === 'string' ? src.serviceId : undefined;
    if (
      typeof specialistId !== 'string' ||
      typeof patientName !== 'string' ||
      typeof patientEmail !== 'string'
    ) {
      return HttpResponse.json(
        {
          error: 'bad_request',
          message: 'Wymagane pola: specialistId, patientName, patientEmail.',
        },
        { status: 400, headers: engineHeaders },
      );
    }

    const entry: WaitlistEntry = joinWaitlist({
      specialistId,
      patientName,
      patientEmail,
      serviceId,
    });
    return HttpResponse.json(entry, { status: 201, headers: engineHeaders });
  }),

  /* GET /api/patients/waitlist?email= — wpisy pacjenta na waitliście (G6) */
  http.get(PATIENT_ENDPOINTS.listWaitlist.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G6-waitlist' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const email = new URL(request.url).searchParams.get('email');
    if (email === null || email.trim() === '') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagany parametr "email".' },
        { status: 400, headers: engineHeaders },
      );
    }

    const body: WaitlistResponse = { items: listWaitlist(email) };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/patients/rodo/export?email= — eksport danych pacjenta (G11) */
  http.post(PATIENT_ENDPOINTS.rodoExport.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G11-rodo' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const email = new URL(request.url).searchParams.get('email');
    if (email === null || email.trim() === '') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagany parametr "email".' },
        { status: 400, headers: engineHeaders },
      );
    }

    const body: RodoExport = rodoExport(email);
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/patients/rodo/erase?email= — usunięcie (anonimizacja) danych pacjenta (G11) */
  http.post(PATIENT_ENDPOINTS.rodoErase.path, async ({ request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'G11-rodo' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const email = new URL(request.url).searchParams.get('email');
    if (email === null || email.trim() === '') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagany parametr "email".' },
        { status: 400, headers: engineHeaders },
      );
    }

    rodoErase(email);
    return HttpResponse.json({ ok: true }, { status: 200, headers: engineHeaders });
  }),

  /* ---------------------------------------------------------------- *
   * Onboarding specjalisty (GRUPY C/D) — weryfikacja PWZ (D1),
   * publikacja profilu go-live (D3), plany subskrypcji (C2).
   * Ścieżki `/api/specialists/:id/verification|go-live` oraz
   * `/api/subscription/plans` są rozłączne z istniejącymi kontraktami.
   * ---------------------------------------------------------------- */

  /* GET /api/specialists/:id/verification — stan weryfikacji PWZ (D1); 404 gdy brak */
  http.get(ONBOARDING_ENDPOINTS.getVerification.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'D1-verification' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    const verification = getSpecialistVerification(id);
    if (!verification) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Nie znaleziono weryfikacji specjalisty.' },
        { status: 404, headers: engineHeaders },
      );
    }

    const body: VerificationResponse = verification;
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/specialists/:id/go-live — publikacja profilu (D3); 409 już opublikowany, 404 brak */
  http.post(ONBOARDING_ENDPOINTS.goLive.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'D3-golive' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      const body: VerificationResponse = goLive(id);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof VerificationNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      if (e instanceof AlreadyPublishedError) {
        return HttpResponse.json(
          { error: 'already_published', message: e.message },
          { status: 409, headers: engineHeaders },
        );
      }
      if (e instanceof InvalidVerificationTransitionError) {
        return HttpResponse.json(
          { error: 'invalid_transition', message: e.message, from: e.from, to: e.to },
          { status: 409, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* POST /api/specialists/:id/verification/resubmit — ponowne zgłoszenie po odrzuceniu (D1); 409/404 */
  http.post(ONBOARDING_ENDPOINTS.resubmitVerification.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'D1-verification' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      const body: VerificationResponse = resubmitVerification(id);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof VerificationNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      if (e instanceof InvalidVerificationTransitionError) {
        return HttpResponse.json(
          { error: 'invalid_transition', message: e.message, from: e.from, to: e.to },
          { status: 409, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* GET /api/subscription/plans — katalog planów subskrypcji (C2); silnik billing */
  http.get(ONBOARDING_ENDPOINTS.subscriptionPlans.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'billing' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: SubscriptionPlansResponse = { items: getSubscriptionPlans() };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* ---------------------------------------------------------------- *
   * Back office / panel administracyjny (GRUPA F) — kolejka weryfikacji
   * (F1), moderacja opinii (F2), spory (F3), nadużycia (F4), konta (F5),
   * dziennik audytu (F10). Ścieżki `/api/admin/...` są rozłączne z istniejącymi.
   * ---------------------------------------------------------------- */

  /* GET /api/admin/verifications — kolejka weryfikacji PWZ (F1) */
  http.get(ADMIN_ENDPOINTS.verifications.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F1-verify' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: AdminVerificationsResponse = { items: listAdminVerifications() };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/admin/verifications/:id/approve — akceptacja weryfikacji (F1); 404/409 */
  http.post(ADMIN_ENDPOINTS.approveVerification.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F1-verify' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      const body: Verification = approveVerification(id);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof VerificationNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      if (e instanceof InvalidVerificationTransitionError) {
        return HttpResponse.json(
          { error: 'invalid_transition', message: e.message, from: e.from, to: e.to },
          { status: 409, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* POST /api/admin/verifications/:id/reject — odrzucenie weryfikacji z powodem (F1); 400/404/409 */
  http.post(ADMIN_ENDPOINTS.rejectVerification.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F1-verify' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    const src = raw as Record<string, unknown>;
    if (typeof src.reason !== 'string') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Wymagane pole: reason.' },
        { status: 400, headers: engineHeaders },
      );
    }

    try {
      const body: Verification = rejectVerification(id, src.reason);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof VerificationNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      if (e instanceof RejectReasonRequiredError) {
        return HttpResponse.json(
          { error: 'bad_request', message: e.message },
          { status: 400, headers: engineHeaders },
        );
      }
      if (e instanceof InvalidVerificationTransitionError) {
        return HttpResponse.json(
          { error: 'invalid_transition', message: e.message, from: e.from, to: e.to },
          { status: 409, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* GET /api/admin/reviews — kolejka moderacji opinii (F2) */
  http.get(ADMIN_ENDPOINTS.reviews.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F2-moderation' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: AdminReviewsResponse = { items: listPendingReviews() };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/admin/reviews/:id/approve — zatwierdzenie opinii (F2); 404 */
  http.post(ADMIN_ENDPOINTS.approveReview.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F2-moderation' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      const body: Review = approveReview(id);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof ReviewNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* POST /api/admin/reviews/:id/reject — odrzucenie opinii (F2); 404 */
  http.post(ADMIN_ENDPOINTS.rejectReview.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F2-moderation' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      const body: Review = rejectReview(id);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof ReviewNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* GET /api/admin/disputes — spory o nieobecność (F3) */
  http.get(ADMIN_ENDPOINTS.disputes.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F3-disputes' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: AdminDisputesResponse = { items: listDisputes() };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/admin/disputes/:id/resolve — rozstrzygnięcie sporu (F3); disputed→completed|no_show; 400/404/409 */
  http.post(ADMIN_ENDPOINTS.resolveDispute.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F3-disputes' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Nieprawidłowy JSON w ciele żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    if (typeof raw !== 'object' || raw === null) {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Brak ciała żądania.' },
        { status: 400, headers: engineHeaders },
      );
    }
    const src = raw as Record<string, unknown>;
    if (src.outcome !== 'completed' && src.outcome !== 'no_show') {
      return HttpResponse.json(
        { error: 'bad_request', message: 'Pole "outcome" musi być "completed" lub "no_show".' },
        { status: 400, headers: engineHeaders },
      );
    }
    const outcome: 'completed' | 'no_show' = src.outcome;
    const target =
      outcome === 'completed' ? BookingState.Completed : BookingState.NoShow;
    const transitionLabel = `${BookingState.Disputed}→${target}`;

    try {
      const body: Booking = resolveDispute(id, outcome);
      return HttpResponse.json(body, {
        status: 200,
        headers: { ...engineHeaders, [STATE_TRANSITION_HEADER]: transitionLabel },
      });
    } catch (e) {
      if (e instanceof BookingNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      if (e instanceof InvalidBookingTransitionError) {
        return HttpResponse.json(
          { error: 'invalid_transition', message: e.message, from: e.from, to: e.to },
          {
            status: 409,
            headers: { ...engineHeaders, [STATE_TRANSITION_HEADER]: `${e.from}→${e.to}` },
          },
        );
      }
      throw e;
    }
  }),

  /* GET /api/admin/users — konta użytkowników (F5) */
  http.get(ADMIN_ENDPOINTS.users.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F5-users' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: AdminUsersResponse = { items: listAdminUsers() };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/admin/users/:id/block — blokada konta (F5); 404 */
  http.post(ADMIN_ENDPOINTS.blockUser.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F5-users' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      const body: User = blockUser(id);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof UserNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* POST /api/admin/users/:id/unblock — odblokowanie konta (F5); 404 */
  http.post(ADMIN_ENDPOINTS.unblockUser.path, async ({ params }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F5-users' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);
    try {
      const body: User = unblockUser(id);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof UserNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),

  /* GET /api/admin/audit — dziennik audytu (F10) */
  http.get(ADMIN_ENDPOINTS.audit.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F10-audit' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: AuditResponse = { items: listAudit() };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* GET /api/admin/abuse-flags — zgłoszenia nadużyć (F4) */
  http.get(ADMIN_ENDPOINTS.abuseFlags.path, async () => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F4-abuse' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const body: AbuseFlagsResponse = { items: listAbuseFlags() };
    return HttpResponse.json(body, { status: 200, headers: engineHeaders });
  }),

  /* POST /api/admin/abuse-flags/:id/resolve — rozstrzygnięcie zgłoszenia (F4); status reviewed|dismissed; 404 */
  http.post(ADMIN_ENDPOINTS.resolveAbuseFlag.path, async ({ params, request }) => {
    await withLatency();
    const engineHeaders = { [ENGINE_HEADER]: 'F4-abuse' };

    const err = maybeError();
    if (err) return chaosResponse(err, engineHeaders);

    const id = firstParam(params.id);

    // Opcjonalne ciało { status: 'reviewed' | 'dismissed' } — domyślnie 'reviewed'.
    let status: 'reviewed' | 'dismissed' = 'reviewed';
    try {
      const raw: unknown = await request.json();
      if (typeof raw === 'object' && raw !== null) {
        const s = (raw as Record<string, unknown>).status;
        if (s === 'reviewed' || s === 'dismissed') status = s;
      }
    } catch {
      // Brak/nieprawidłowe ciało — używamy domyślnego statusu 'reviewed'.
    }

    try {
      const body: AbuseFlag = resolveAbuseFlag(id, status);
      return HttpResponse.json(body, { status: 200, headers: engineHeaders });
    } catch (e) {
      if (e instanceof AbuseFlagNotFoundError) {
        return HttpResponse.json(
          { error: 'not_found', message: e.message },
          { status: 404, headers: engineHeaders },
        );
      }
      throw e;
    }
  }),
];
