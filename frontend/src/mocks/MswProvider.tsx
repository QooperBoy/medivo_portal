'use client';

/**
 * MswProvider — startuje worker MSW po stronie klienta (dokładnie raz), a
 * następnie renderuje dzieci. Nie blokuje SSR/hydracji: worker uruchamiany jest
 * w `useEffect`. Po starcie (lub przy błędzie) sygnalizuje `markMockReady()`,
 * dzięki czemu api-client wie, że może już wykonywać żądania.
 *
 * Guard przez `startedRef` zapewnia pojedynczy start także przy podwójnym
 * wywołaniu efektu w React StrictMode (dev).
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { markMockReady } from './ready';

export function MswProvider({ children }: { children: ReactNode }) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const { worker } = await import('./browser');
        await worker.start({
          onUnhandledRequest: 'bypass',
          serviceWorker: { url: '/mockServiceWorker.js' },
          quiet: true,
        });
      } catch {
        // Ignorujemy — bezpiecznik w ready.ts i tak odblokuje żądania.
      } finally {
        markMockReady();
      }
    })();
  }, []);

  return <>{children}</>;
}
