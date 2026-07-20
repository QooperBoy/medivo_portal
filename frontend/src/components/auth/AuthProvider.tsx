'use client';

/**
 * AuthProvider — kontekst uwierzytelniania (EPIC A) dla mocka.
 *
 * Sesja klienta trzymana jest w `localStorage` (klucz `zp_auth`), bo mock
 * backendu żyje w pamięci i RESETUJE się przy przeładowaniu strony —
 * localStorage jest więc źródłem prawdy sesji po stronie przeglądarki.
 *
 *  - inicjalizacja: `loading:true`, `user:null` (spójne między SSR a pierwszym
 *    renderem klienta); dopiero w efekcie odczytujemy usera z localStorage,
 *    co eliminuje rozjazd hydracji,
 *  - `login` / `registerPatient` wołają endpoint (widoczny w BE Inspectorze) i po
 *    sukcesie zapisują `user` do localStorage oraz do stanu,
 *  - `logout` woła endpoint i czyści localStorage + stan.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '@/lib/api-client';
import { AUTH_ENDPOINTS } from '@/domain';
import type {
  LoginBody,
  RegisterPatientBody,
  Session,
  User,
  UserRole,
} from '@/domain';

/** Klucz sesji klienta w localStorage. */
const STORAGE_KEY = 'zp_auth';

/**
 * Wynik logowania/rejestracji: sukces z użytkownikiem albo błąd ze statusem
 * (401 — złe dane logowania, 409 — e-mail zajęty, 0 — błąd sieci) i gotowym
 * komunikatem po polsku.
 */
export type AuthOutcome =
  | { ok: true; user: User }
  | { ok: false; status: number; message: string };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthOutcome>;
  registerPatient: (body: RegisterPatientBody) => Promise<AuthOutcome>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Ścieżka „strony domowej" zależna od roli (dokąd kierować po zalogowaniu). */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'specialist':
      return '/panel';
    case 'admin':
      return '/admin';
    case 'patient':
    default:
      return '/moje-wizyty';
  }
}

/** Type guard: minimalna walidacja kształtu usera (z localStorage lub odpowiedzi). */
function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.email === 'string' &&
    typeof v.firstName === 'string' &&
    typeof v.lastName === 'string' &&
    (v.role === 'patient' || v.role === 'specialist' || v.role === 'admin') &&
    typeof v.createdAt === 'string'
  );
}

/** Wyłuskuje `user` z (potencjalnie błędnej) odpowiedzi sesji; null gdy niepoprawna. */
function userFromSession(data: unknown): User | null {
  if (typeof data !== 'object' || data === null) return null;
  const candidate = (data as Record<string, unknown>).user;
  return isUser(candidate) ? candidate : null;
}

/** Odczyt zapisanej sesji klienta (tylko w przeglądarce, odporny na błędy). */
function readStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Odczyt sesji dopiero po zamontowaniu (klient) — brak rozjazdu hydracji.
  useEffect(() => {
    setUser(readStoredUser());
    setLoading(false);
  }, []);

  const persist = useCallback((nextUser: User) => {
    setUser(nextUser);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } catch {
      // localStorage niedostępny (np. tryb prywatny) — stan w pamięci wystarcza.
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Pomijamy — i tak wyczyściliśmy stan w pamięci.
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthOutcome> => {
      const body: LoginBody = { email, password };
      try {
        const res = await apiClient.post<Session>(AUTH_ENDPOINTS.login.path, body);
        const nextUser = userFromSession(res.data);
        if (res.status === 200 && nextUser) {
          persist(nextUser);
          return { ok: true, user: nextUser };
        }
        if (res.status === 401) {
          return { ok: false, status: 401, message: 'Nieprawidłowy e-mail lub hasło.' };
        }
        return {
          ok: false,
          status: res.status,
          message: 'Nie udało się zalogować. Spróbuj ponownie.',
        };
      } catch {
        return {
          ok: false,
          status: 0,
          message: 'Błąd połączenia z serwerem. Spróbuj ponownie.',
        };
      }
    },
    [persist],
  );

  const registerPatient = useCallback(
    async (body: RegisterPatientBody): Promise<AuthOutcome> => {
      try {
        const res = await apiClient.post<Session>(
          AUTH_ENDPOINTS.registerPatient.path,
          body,
        );
        const nextUser = userFromSession(res.data);
        if (res.status === 201 && nextUser) {
          persist(nextUser);
          return { ok: true, user: nextUser };
        }
        if (res.status === 409) {
          return {
            ok: false,
            status: 409,
            message: 'Konto z tym adresem e-mail już istnieje.',
          };
        }
        return {
          ok: false,
          status: res.status,
          message: 'Nie udało się utworzyć konta. Spróbuj ponownie.',
        };
      } catch {
        return {
          ok: false,
          status: 0,
          message: 'Błąd połączenia z serwerem. Spróbuj ponownie.',
        };
      }
    },
    [persist],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post<{ ok: boolean }>(AUTH_ENDPOINTS.logout.path);
    } catch {
      // Nawet gdy wylogowanie po stronie mocka zawiedzie, czyścimy sesję klienta.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, registerPatient, logout }),
    [user, loading, login, registerPatient, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook dostępu do kontekstu auth. Rzuca, gdy użyty poza `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth musi być użyte wewnątrz <AuthProvider>.');
  }
  return ctx;
}
