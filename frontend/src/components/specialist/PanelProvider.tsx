'use client';

/**
 * PanelProvider — glue panelu specjalisty. Pobiera „zalogowanego" specjalistę
 * (mock: `GET /api/me/specialist`) raz i udostępnia go pod-ekranom panelu przez
 * kontekst. Dzięki temu ekrany E1/E2/E3/E4 nie muszą osobno rozwiązywać, „kim
 * jestem" — biorą id z hooka `useCurrentSpecialist()`.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Specialist } from '@/domain';
import { apiClient } from '@/lib/api-client';

export interface CurrentSpecialistState {
  specialist: Specialist | null;
  loading: boolean;
  error: string | null;
}

const CurrentSpecialistContext = createContext<CurrentSpecialistState | null>(
  null,
);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurrentSpecialistState>({
    specialist: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient.get<Specialist>('/api/me/specialist');
        if (cancelled) return;
        if (res.status >= 400) {
          setState({
            specialist: null,
            loading: false,
            error: 'Nie udało się wczytać profilu specjalisty.',
          });
          return;
        }
        setState({ specialist: res.data, loading: false, error: null });
      } catch {
        if (!cancelled) {
          setState({
            specialist: null,
            loading: false,
            error: 'Błąd połączenia z zamockowanym backendem.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CurrentSpecialistContext.Provider value={state}>
      {children}
    </CurrentSpecialistContext.Provider>
  );
}

/** Hook: bieżący specjalista panelu (id do zapytań API + dane nagłówka). */
export function useCurrentSpecialist(): CurrentSpecialistState {
  const ctx = useContext(CurrentSpecialistContext);
  if (!ctx) {
    throw new Error(
      'useCurrentSpecialist musi być użyte wewnątrz <PanelProvider>.',
    );
  }
  return ctx;
}
