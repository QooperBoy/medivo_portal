/**
 * Uwierzytelnianie i sesja (mock). Role: pacjent / specjalista / admin.
 * Warstwa czysto domenowa — BEZ importów react/next/msw.
 *
 * Uwaga: to MOCK — „hasło" nie jest weryfikowane kryptograficznie; logowanie
 * demo dopasowuje konto po e-mailu, a token jest atrapą (do BE Inspectora).
 */

import type { ProfessionalRegistry } from './verification';

/** Rola użytkownika w systemie. */
export type UserRole = 'patient' | 'specialist' | 'admin';

/** Konto użytkownika. */
export interface User {
  id: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Dla role='specialist' — powiązany profil specjalisty (spec_*). */
  specialistId?: string;
  createdAt: string;
  /** konto zablokowane przez admina F5 */
  blocked?: boolean;
}

/** Sesja: użytkownik + token (atrapa). */
export interface Session {
  user: User;
  token: string;
}

/** Body logowania. */
export interface LoginBody {
  email: string;
  password: string;
}

/** Body rejestracji pacjenta. */
export interface RegisterPatientBody {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

/** Body rejestracji specjalisty (z numerem PWZ — startuje cykl weryfikacji C3→D1). */
export interface RegisterSpecialistBody {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  pwzNumber: string;
  registry: ProfessionalRegistry;
  title: string;
}

/** Odpowiedź logowania/rejestracji. */
export type AuthResponse = Session;

/** Odpowiedź `GET /api/auth/session` (null gdy niezalogowany). */
export interface SessionResponse {
  user: User | null;
}

/** Endpointy auth (osobny rejestr, żeby nie mieszać z API_ENDPOINTS). */
export const AUTH_ENDPOINTS = {
  login: { method: 'POST', path: '/api/auth/login' },
  registerPatient: { method: 'POST', path: '/api/auth/register/patient' },
  registerSpecialist: { method: 'POST', path: '/api/auth/register/specialist' },
  session: { method: 'GET', path: '/api/auth/session' },
  logout: { method: 'POST', path: '/api/auth/logout' },
} as const;
