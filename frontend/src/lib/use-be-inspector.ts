'use client';

import { useSyncExternalStore } from 'react';
import { beInspector, type BeLogEntry } from './be-inspector';

/**
 * Hook subskrybujący store BE Inspectora. Bezpieczny dla SSR
 * (getServerSnapshot zwraca stabilną, pustą listę).
 */
export function useBeInspector(): readonly BeLogEntry[] {
  return useSyncExternalStore(
    beInspector.subscribe,
    beInspector.getSnapshot,
    beInspector.getServerSnapshot,
  );
}
