/**
 * Sygnalizacja gotowości mocka (MSW).
 *
 * Nowe ekrany (szukaj/profil/potwierdzenie) fetchują dane już przy montowaniu.
 * Worker MSW startuje asynchronicznie w `MswProvider`, więc bez synchronizacji
 * pierwsze żądanie mogłoby wystartować, zanim worker zacznie przechwytywać ruch
 * (i trafić w prawdziwą sieć → błąd). `api-client` czeka na `mockReady` w
 * przeglądarce, zanim wykona żądanie.
 *
 * UWAGA: ten moduł NIE importuje 'msw' — jest lekki i może być bezpiecznie
 * dołączony przez api-client wszędzie.
 */

let resolveReady: (() => void) | null = null;
let resolved = false;

/** Rozwiązywana, gdy worker MSW jest gotowy (lub po zadziałaniu bezpiecznika). */
export const mockReady: Promise<void> = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

/** Oznacza mock jako gotowy (wywoływane przez MswProvider po starcie workera). */
export function markMockReady(): void {
  if (resolved) return;
  resolved = true;
  resolveReady?.();
}

// Bezpiecznik: gdyby worker nie wystartował (np. brak wsparcia SW), po 4 s
// odblokuj żądania, żeby UI nie wisiało w nieskończoność. Tylko w przeglądarce.
if (typeof window !== 'undefined') {
  setTimeout(markMockReady, 4000);
}
