/**
 * Klient HTTP mocka — cienka nakładka na `fetch`, która KAŻDE żądanie loguje do
 * BE Inspectora (`beInspector.begin` przed, `beInspector.complete` po). Odczytuje
 * nagłówki sygnalizacyjne `x-engine` / `x-state-transition` i przepisuje je do logu
 * oraz do wyniku.
 *
 * Zasady:
 *  - NIE rzuca na statusy 4xx/5xx — zwraca `ApiResult` (żeby UI mogło pokazać błąd).
 *  - Rzuca (po zalogowaniu jako `error`, status 0) tylko przy błędzie sieci/fetch.
 *
 * Działa w przeglądarce (używany w komponentach klienckich).
 */

import { ENGINE_HEADER, STATE_TRANSITION_HEADER } from '@/domain';
import { beInspector } from '@/lib/be-inspector';
import { mockReady } from '@/mocks/ready';

/** Wynik żądania wraz z metadanymi sygnalizacyjnymi dla BE Inspectora. */
export interface ApiResult<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
  latencyMs: number;
  /** Wartość nagłówka `x-engine` (który silnik G* obsłużył żądanie). */
  engine: string | null;
  /** Wartość nagłówka `x-state-transition` (np. "locked→confirmed"). */
  stateTransition: string | null;
}

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

/** Zegar o wysokiej rozdzielczości z fallbackiem do Date.now. */
function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/** Kolekcjonuje nagłówki odpowiedzi do zwykłego rekordu. */
function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/** Bezpieczne parsowanie ciała odpowiedzi (JSON gdy content-type json, inaczej tekst). */
async function parseResponseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  url: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { body, headers: extraHeaders } = options;
  const hasBody = body !== undefined;

  const requestHeaders: Record<string, string> = { ...(extraHeaders ?? {}) };
  if (hasBody && requestHeaders['content-type'] === undefined) {
    requestHeaders['content-type'] = 'application/json';
  }

  // Poczekaj, aż worker MSW będzie gotowy przechwytywać żądania (tylko w
  // przeglądarce) — zapobiega wyścigowi fetch-on-mount ze startem workera.
  if (typeof window !== 'undefined') {
    await mockReady;
  }

  const id = beInspector.begin({
    method,
    url,
    requestHeaders,
    requestBody: body,
  });

  const start = nowMs();
  try {
    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers: requestHeaders,
      body: hasBody ? JSON.stringify(body) : undefined,
    });

    const latencyMs = Math.round(nowMs() - start);
    const responseHeaders = headersToRecord(res.headers);
    const engine = res.headers.get(ENGINE_HEADER);
    const stateTransition = res.headers.get(STATE_TRANSITION_HEADER);
    const data = (await parseResponseBody(res)) as T;

    beInspector.complete(id, {
      status: res.status,
      latencyMs,
      responseHeaders,
      responseBody: data,
      engine,
      stateTransition,
    });

    return {
      data,
      status: res.status,
      headers: responseHeaders,
      latencyMs,
      engine,
      stateTransition,
    };
  } catch (error) {
    const latencyMs = Math.round(nowMs() - start);
    beInspector.complete(id, {
      status: 0,
      latencyMs,
      phase: 'error',
      responseBody: {
        error: 'network_error',
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

export const apiClient: {
  request<T>(
    method: string,
    url: string,
    options?: { body?: unknown; headers?: Record<string, string> },
  ): Promise<ApiResult<T>>;
  get<T>(url: string, options?: { headers?: Record<string, string> }): Promise<ApiResult<T>>;
  post<T>(
    url: string,
    body?: unknown,
    options?: { headers?: Record<string, string> },
  ): Promise<ApiResult<T>>;
} = {
  request,
  get<T>(url: string, options?: { headers?: Record<string, string> }): Promise<ApiResult<T>> {
    return request<T>('GET', url, options);
  },
  post<T>(
    url: string,
    body?: unknown,
    options?: { headers?: Record<string, string> },
  ): Promise<ApiResult<T>> {
    return request<T>('POST', url, { ...options, body });
  },
};
