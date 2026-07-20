/**
 * BE Inspector — wspólny store logów żądań do (zamockowanego) backendu.
 *
 * Kontrakt glue między warstwami:
 *  - `src/lib/api-client.ts` (msw-engineer) woła `beInspector.begin()` przed
 *    żądaniem i `beInspector.complete()` po odpowiedzi.
 *  - `src/components/be-inspector/BeInspector.tsx` (ui-designer) subskrybuje
 *    store przez hook `useBeInspector()` i renderuje wysuwany panel.
 *
 * Store jest frameworkowo-neutralny (zwykły pub/sub) + cienki hook Reactowy
 * oparty o useSyncExternalStore, żeby uniknąć problemów z SSR/hydracją.
 */

export type BeLogPhase = 'pending' | 'success' | 'error';

export interface BeLogEntry {
  /** unikalny, rosnący identyfikator wpisu */
  id: string;
  /** znacznik czasu rozpoczęcia (ms epoch) */
  ts: number;
  method: string;
  url: string;
  /** kod HTTP odpowiedzi (null dopóki pending) */
  status: number | null;
  /** czas trwania żądania w ms (null dopóki pending) */
  latencyMs: number | null;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  /** wartość nagłówka `x-engine` (który silnik G* obsłużył żądanie) */
  engine?: string | null;
  /** wartość nagłówka `x-state-transition` (np. "locked→confirmed") */
  stateTransition?: string | null;
  phase: BeLogPhase;
}

/** Dane przekazywane przy rozpoczęciu żądania. */
export type BeLogBegin = Pick<BeLogEntry, 'method' | 'url'> &
  Partial<Pick<BeLogEntry, 'requestHeaders' | 'requestBody'>>;

/** Dane przekazywane przy zakończeniu żądania. */
export type BeLogComplete = Partial<
  Pick<
    BeLogEntry,
    | 'status'
    | 'latencyMs'
    | 'responseHeaders'
    | 'responseBody'
    | 'engine'
    | 'stateTransition'
    | 'phase'
  >
>;

type Listener = () => void;

const MAX_ENTRIES = 100;
const EMPTY: readonly BeLogEntry[] = Object.freeze([]);

class BeInspectorStore {
  private entries: readonly BeLogEntry[] = EMPTY;
  private listeners = new Set<Listener>();
  private seq = 0;

  /** Rejestruje żądanie w stanie `pending`; zwraca id do późniejszego dopełnienia. */
  begin(input: BeLogBegin): string {
    const id = `req_${++this.seq}`;
    const entry: BeLogEntry = {
      id,
      ts: Date.now(),
      method: input.method.toUpperCase(),
      url: input.url,
      status: null,
      latencyMs: null,
      requestHeaders: input.requestHeaders,
      requestBody: input.requestBody,
      phase: 'pending',
    };
    // najnowsze na górze; przycinamy historię
    this.entries = [entry, ...this.entries].slice(0, MAX_ENTRIES);
    this.emit();
    return id;
  }

  /** Dopełnia istniejący wpis wynikiem odpowiedzi. */
  complete(id: string, patch: BeLogComplete): void {
    let changed = false;
    const next = this.entries.map((e) => {
      if (e.id !== id) return e;
      changed = true;
      return {
        ...e,
        ...patch,
        phase:
          patch.phase ??
          (patch.status != null && patch.status >= 400 ? 'error' : 'success'),
      };
    });
    if (!changed) return;
    this.entries = next;
    this.emit();
  }

  clear(): void {
    this.entries = EMPTY;
    this.emit();
  }

  getSnapshot = (): readonly BeLogEntry[] => this.entries;

  getServerSnapshot = (): readonly BeLogEntry[] => EMPTY;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}

export const beInspector = new BeInspectorStore();
