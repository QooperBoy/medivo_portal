/**
 * BACK OFFICE / ADMIN (GRUPA F) — modele i kontrakty API panelu administracyjnego.
 *
 * Obejmuje:
 *  - kolejkę weryfikacji specjalistów (F1) — akceptacja/odrzucenie zgłoszeń PWZ,
 *    które trafiły do ręcznego przeglądu (fallback automatu D1);
 *  - moderację opinii (F2) — zatwierdzanie/odrzucanie opinii ze statusem `pending`;
 *  - spory o nieobecność (F3) — rozstrzyganie `disputed → completed | no_show`;
 *  - zgłoszenia nadużyć (F4) — przegląd sygnałów (multikonto, seria rezerwacji);
 *  - zarządzanie kontami (F5) — blokada/odblokowanie użytkowników;
 *  - dziennik audytu (F10) — log operacji administracyjnych i systemowych.
 *
 * Źródła prawdy cykli: src/domain/verification.ts (assertVerificationTransition)
 * oraz src/domain/booking-states.ts (assertTransition). Warstwa czysto domenowa —
 * BEZ importów react/next/msw.
 */

import type { Booking, Review, Verification } from './types';
import type { User } from './auth';

/* ------------------------------------------------------------------ *
 * F1 — Kolejka weryfikacji specjalistów
 * ------------------------------------------------------------------ */

/**
 * Pozycja kolejki weryfikacji (F1) — rekord `Verification` wzbogacony o nazwę
 * specjalisty (denormalizacja do wyświetlenia). Kolejka obejmuje zgłoszenia
 * w stanie `weryfikacja_reczna` (ręczny przegląd) oraz `zarejestrowany`.
 */
export interface AdminVerificationItem extends Verification {
  /** Imię i nazwisko specjalisty (do wyświetlenia w kolejce). */
  specialistName: string;
}

/** Odpowiedź kolejki weryfikacji (`GET /api/admin/verifications`). */
export interface AdminVerificationsResponse {
  items: AdminVerificationItem[];
}

/** Body odrzucenia weryfikacji (F1) — powód widoczny dla specjalisty. */
export interface RejectVerificationBody {
  /** Powód odrzucenia (wymagany, niepusty). */
  reason: string;
}

/* ------------------------------------------------------------------ *
 * F2 — Moderacja opinii
 * ------------------------------------------------------------------ */

/**
 * Pozycja kolejki moderacji opinii (F2) — opinia `pending` wzbogacona o nazwę
 * specjalisty, którego dotyczy.
 */
export interface AdminReviewItem extends Review {
  /** Imię i nazwisko specjalisty (do wyświetlenia w kolejce moderacji). */
  specialistName: string;
}

/** Odpowiedź kolejki moderacji opinii (`GET /api/admin/reviews`). */
export interface AdminReviewsResponse {
  items: AdminReviewItem[];
}

/* ------------------------------------------------------------------ *
 * F3 — Spory o nieobecność
 * ------------------------------------------------------------------ */

/**
 * Pozycja listy sporów (F3) — rezerwacja w stanie `disputed` wzbogacona o dane
 * pomocnicze panelu admina (nazwa specjalisty/usługi, wskaźnik no-show pacjenta
 * ze scoringu G7).
 */
export interface AdminDisputeItem extends Booking {
  /** Imię i nazwisko specjalisty (do wyświetlenia). */
  specialistName: string;
  /** Nazwa usługi (do wyświetlenia). */
  serviceName: string;
  /** Liczba nieobecności pacjenta ze scoringu G7 (kontekst decyzji). */
  patientNoShowCount: number;
}

/** Odpowiedź listy sporów (`GET /api/admin/disputes`). */
export interface AdminDisputesResponse {
  items: AdminDisputeItem[];
}

/**
 * Body rozstrzygnięcia sporu (F3). `outcome` mapuje na przejście rezerwacji
 * `disputed → completed` (uznanie sporu) lub `disputed → no_show` (odrzucenie).
 */
export interface ResolveDisputeBody {
  /** Wynik rozstrzygnięcia sporu. */
  outcome: 'completed' | 'no_show';
}

/* ------------------------------------------------------------------ *
 * F5 — Zarządzanie kontami
 * ------------------------------------------------------------------ */

/**
 * Pozycja listy kont (F5) — konto użytkownika z jawną (znormalizowaną) flagą
 * blokady. `blocked` jest tu wymagane (w `User` opcjonalne — domyślnie `false`).
 */
export interface AdminUserItem extends User {
  /** Czy konto jest zablokowane (znormalizowane do boolean). */
  blocked: boolean;
}

/** Odpowiedź listy kont (`GET /api/admin/users`). */
export interface AdminUsersResponse {
  items: AdminUserItem[];
}

/* ------------------------------------------------------------------ *
 * F10 — Dziennik audytu
 * ------------------------------------------------------------------ */

/**
 * Wpis dziennika audytu (F10) — pojedyncza operacja administracyjna/systemowa
 * (logowanie, publikacja profilu, moderacja, operacja RODO, blokada konta itd.).
 */
export interface AuditEntry {
  id: string;
  /** Znacznik zdarzenia (ISO 8601). */
  at: string;
  /** Aktor operacji (e-mail konta wykonującego akcję). */
  actor: string;
  /** Nazwa akcji (kropkowa, np. `review.approved`, `user.blocked`). */
  action: string;
  /** Identyfikator obiektu, którego dotyczy akcja (np. `spec_1`, id opinii). */
  target: string;
  /** Dodatkowy kontekst operacji (opcjonalny). */
  meta?: string;
}

/** Odpowiedź dziennika audytu (`GET /api/admin/audit`). */
export interface AuditResponse {
  items: AuditEntry[];
}

/* ------------------------------------------------------------------ *
 * F4 — Zgłoszenia nadużyć
 * ------------------------------------------------------------------ */

/** Waga zgłoszenia nadużycia (F4). */
export type AbuseSeverity = 'low' | 'medium' | 'high';
/** Status zgłoszenia nadużycia (F4). */
export type AbuseStatus = 'open' | 'reviewed' | 'dismissed';

/**
 * Zgłoszenie nadużycia (F4) — sygnał do przeglądu przez admina. Podmiotem może
 * być pacjent lub specjalista; `reason` opisuje charakter zgłoszenia.
 */
export interface AbuseFlag {
  id: string;
  /** Typ podmiotu, którego dotyczy zgłoszenie. */
  subjectType: 'patient' | 'specialist';
  /** Identyfikator podmiotu (e-mail pacjenta lub id specjalisty). */
  subject: string;
  /** Opis zgłoszenia (np. „podejrzenie multikonta"). */
  reason: string;
  /** Waga zgłoszenia. */
  severity: AbuseSeverity;
  /** Status obsługi zgłoszenia. */
  status: AbuseStatus;
  /** Znacznik utworzenia zgłoszenia (ISO 8601). */
  createdAt: string;
}

/** Odpowiedź listy zgłoszeń nadużyć (`GET /api/admin/abuse-flags`). */
export interface AbuseFlagsResponse {
  items: AbuseFlag[];
}

/* ------------------------------------------------------------------ *
 * Rejestr endpointów panelu admina (grupa F)
 * ------------------------------------------------------------------ *
 * Osobny rejestr (nie mieszać z API_ENDPOINTS / AUTH_ENDPOINTS /
 * PATIENT_ENDPOINTS / ONBOARDING_ENDPOINTS). Wszystkie ścieżki mają prefiks
 * `/api/admin/...` — rozłączny z istniejącymi kontraktami. Konwencja `:param`.
 */
export const ADMIN_ENDPOINTS = {
  verifications: { method: 'GET', path: '/api/admin/verifications' },
  approveVerification: {
    method: 'POST',
    path: '/api/admin/verifications/:id/approve',
  },
  rejectVerification: {
    method: 'POST',
    path: '/api/admin/verifications/:id/reject',
  },
  reviews: { method: 'GET', path: '/api/admin/reviews' },
  approveReview: { method: 'POST', path: '/api/admin/reviews/:id/approve' },
  rejectReview: { method: 'POST', path: '/api/admin/reviews/:id/reject' },
  disputes: { method: 'GET', path: '/api/admin/disputes' },
  resolveDispute: { method: 'POST', path: '/api/admin/disputes/:id/resolve' },
  users: { method: 'GET', path: '/api/admin/users' },
  blockUser: { method: 'POST', path: '/api/admin/users/:id/block' },
  unblockUser: { method: 'POST', path: '/api/admin/users/:id/unblock' },
  audit: { method: 'GET', path: '/api/admin/audit' },
  abuseFlags: { method: 'GET', path: '/api/admin/abuse-flags' },
  resolveAbuseFlag: {
    method: 'POST',
    path: '/api/admin/abuse-flags/:id/resolve',
  },
} as const;
