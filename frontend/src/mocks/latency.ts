/**
 * Opóźnienia sieciowe i opcjonalny "chaos" (wstrzykiwanie błędów) dla mocka MSW.
 *
 * Handlery wołają `withLatency()` na starcie (symulacja RTT) oraz sprawdzają
 * `maybeError()` (opcjonalna, konfigurowalna w runtime symulacja awarii backendu).
 * Domyślnie błędy są WYŁĄCZONE (`errorRate: 0`) — demo jest przewidywalne,
 * a chaos można włączyć z konsoli przez `setChaos({ errorRate: 0.1 })`.
 */

import { delay } from 'msw';

/** Konfiguracja opóźnień i częstości błędów. Modyfikowalna w runtime. */
export interface ChaosConfig {
  /** Prawdopodobieństwo błędu (0..1). 0 = błędy wyłączone. */
  errorRate: number;
  /** Dolna granica losowego opóźnienia (ms). */
  minMs: number;
  /** Górna granica losowego opóźnienia (ms). */
  maxMs: number;
}

/**
 * Aktualna konfiguracja chaosu. Współdzielona referencja — `setChaos` mutuje
 * ten obiekt, więc zmiany są widoczne natychmiast dla wszystkich handlerów.
 */
export const chaos: ChaosConfig = {
  errorRate: 0,
  minMs: 120,
  maxMs: 480,
};

/** Nadpisuje wybrane pola konfiguracji chaosu (runtime, np. z konsoli). */
export function setChaos(patch: Partial<ChaosConfig>): void {
  Object.assign(chaos, patch);
}

/**
 * Czeka losowy czas z przedziału [min, max] ms (symulacja opóźnienia sieci).
 * Domyślnie korzysta z bieżącej konfiguracji `chaos` (min. 120 / maks. 480 ms).
 */
export async function withLatency(
  min: number = chaos.minMs,
  max: number = chaos.maxMs,
): Promise<void> {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const ms = Math.round(lo + Math.random() * (hi - lo));
  await delay(ms);
}

/** Ładunek błędu do zwrócenia przez handler (kod HTTP + body). */
interface ChaosError {
  status: number;
  body: unknown;
}

/**
 * Z prawdopodobieństwem `chaos.errorRate` zwraca losowy błąd serwera (500/503)
 * do odesłania przez handler; w przeciwnym razie `null` (normalna odpowiedź).
 */
export function maybeError(): ChaosError | null {
  if (chaos.errorRate <= 0) return null;
  if (Math.random() >= chaos.errorRate) return null;
  const status = Math.random() < 0.5 ? 500 : 503;
  return {
    status,
    body: {
      error: status === 500 ? 'internal_error' : 'service_unavailable',
      message:
        status === 500
          ? 'Wewnętrzny błąd zamockowanego backendu (chaos).'
          : 'Zamockowany backend chwilowo niedostępny (chaos).',
    },
  };
}
