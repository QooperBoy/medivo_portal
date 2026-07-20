'use client';

/**
 * ServicesManager (E3) — usługi i cennik specjalisty na zamockowanym backendzie.
 *
 * Źródła danych:
 *  - lista usług: GET /api/specialists/:slug (profil → `services`),
 *  - słownik nazw (F8): GET /api/service-catalog (silnik E3-services).
 * Nazwy usług pochodzą WYŁĄCZNIE ze słownika — specjalista nie wpisuje własnych.
 * Operacje: dodanie (POST), edycja ceny/czasu/trybu (PATCH), usunięcie (DELETE
 * z potwierdzeniem). Po każdej mutacji następuje ciche odświeżenie danych.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type {
  AddServiceBody,
  DeleteServiceResponse,
  Service,
  ServiceCatalogItem,
  ServiceCatalogResponse,
  ServiceMode,
  SpecialistDetailResponse,
  UpdateServiceBody,
} from '@/domain';
import { apiClient } from '@/lib/api-client';
import { Button, Card, CardContent } from '@/components/ui';
import { EmptyResults } from '@/components/illustrations';

export interface ServicesManagerProps {
  specialistId: string;
  specialistSlug: string;
}

const FIELD_CLASS =
  'h-11 w-full rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

const SERVICE_MODE_LABEL: Record<ServiceMode, string> = {
  online: 'online',
  stacjonarnie: 'stacjonarnie',
  obie: 'online i stacjonarnie',
};

const SERVICE_MODE_OPTIONS: readonly { value: ServiceMode; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'stacjonarnie', label: 'Stacjonarnie' },
  { value: 'obie', label: 'Online i stacjonarnie' },
];

/** Bezpieczne zawężenie wartości selecta do trybu usługi. */
function parseServiceMode(value: string): ServiceMode {
  return value === 'stacjonarnie' || value === 'obie' ? value : 'online';
}

/** Walidacja pól cena/czas (pełne złote, minuty). Zwraca komunikat lub null. */
function validatePriceDuration(price: string, duration: string): string | null {
  const priceNum = Number(price);
  if (!Number.isInteger(priceNum) || priceNum < 1) {
    return 'Podaj cenę w pełnych złotych (min. 1 zł).';
  }
  const durationNum = Number(duration);
  if (!Number.isInteger(durationNum) || durationNum < 5) {
    return 'Podaj czas trwania w minutach (min. 5).';
  }
  return null;
}

type LoadState =
  | { status: 'loading' }
  | {
      status: 'ready';
      services: Service[];
      catalog: ServiceCatalogItem[];
      catalogError: boolean;
    }
  | { status: 'error'; message: string };

export function ServicesManager({
  specialistId,
  specialistSlug,
}: ServicesManagerProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setState({ status: 'loading' });
      try {
        const [profileRes, catalogRes] = await Promise.all([
          apiClient.get<SpecialistDetailResponse>(
            `/api/specialists/${specialistSlug}`,
          ),
          apiClient.get<ServiceCatalogResponse>('/api/service-catalog'),
        ]);

        if (profileRes.status === 404) {
          setState({
            status: 'error',
            message: 'Nie znaleziono profilu specjalisty.',
          });
          return;
        }
        if (profileRes.status >= 400) {
          setState({
            status: 'error',
            message: `Nie udało się pobrać usług (kod ${profileRes.status}).`,
          });
          return;
        }

        const catalogOk = catalogRes.status < 400;
        setState({
          status: 'ready',
          services: profileRes.data.services,
          catalog: catalogOk ? catalogRes.data.items : [],
          catalogError: !catalogOk,
        });
      } catch {
        setState({
          status: 'error',
          message: 'Nie udało się połączyć z zamockowanym backendem.',
        });
      }
    },
    [specialistSlug],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(() => void load({ silent: true }), [load]);

  if (state.status === 'loading') {
    return <ServicesSkeleton />;
  }

  if (state.status === 'error') {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-4 rounded-xl2 border border-danger-200 bg-danger-50 p-8 text-center"
      >
        <p className="text-sm text-danger-700">{state.message}</p>
        <Button variant="outline" onClick={() => void load()}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AddServiceForm
        specialistId={specialistId}
        catalog={state.catalog}
        catalogError={state.catalogError}
        onAdded={refetch}
      />

      <section aria-label="Lista usług" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Twoje usługi</h2>

        {state.services.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl2 border border-slate-200/70 bg-white p-10 text-center shadow-card">
            <EmptyResults className="h-32 w-32" />
            <div className="flex flex-col gap-1">
              <h3 role="status" className="text-lg font-semibold text-ink">
                Brak usług
              </h3>
              <p className="text-sm text-ink-muted">
                Brak usług — dodaj pierwszą ze słownika.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {state.services.map((service) => (
              <li key={service.id}>
                <ServiceCard service={service} onChanged={refetch} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Formularz dodania usługi (nazwa ze słownika F8)
 * ------------------------------------------------------------------ */

interface AddServiceFormProps {
  specialistId: string;
  catalog: ServiceCatalogItem[];
  catalogError: boolean;
  onAdded: () => void;
}

function AddServiceForm({
  specialistId,
  catalog,
  catalogError,
  onAdded,
}: AddServiceFormProps) {
  const nameId = useId();
  const priceId = useId();
  const durationId = useId();
  const modeId = useId();

  const [catalogName, setCatalogName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [mode, setMode] = useState<ServiceMode>('online');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => catalog.find((item) => item.name === catalogName) ?? null,
    [catalog, catalogName],
  );

  function handleCatalogChange(name: string) {
    setCatalogName(name);
    setError(null);
    const item = catalog.find((c) => c.name === name);
    if (item) {
      setDuration(String(item.defaultDurationMin));
      setPrice(
        item.suggestedPricePln !== undefined
          ? String(item.suggestedPricePln)
          : '',
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!catalogName) {
      setError('Wybierz nazwę usługi ze słownika.');
      return;
    }
    const invalid = validatePriceDuration(price, duration);
    if (invalid) {
      setError(invalid);
      return;
    }

    const body: AddServiceBody = {
      catalogName,
      pricePln: Number(price),
      durationMin: Number(duration),
      mode,
    };

    setSubmitting(true);
    try {
      const res = await apiClient.post<Service>(
        `/api/specialists/${specialistId}/services`,
        body,
      );
      if (res.status === 201 || res.status === 200) {
        setCatalogName('');
        setPrice('');
        setDuration('');
        setMode('online');
        onAdded();
      } else if (res.status === 400) {
        setError(
          'Wybrana nazwa nie pochodzi ze słownika usług. Wybierz pozycję z listy.',
        );
      } else {
        setError(`Nie udało się dodać usługi (kod ${res.status}).`);
      }
    } catch {
      setError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">Dodaj usługę</h2>
          <p className="text-sm text-ink-muted">
            Nazwę usługi wybierasz ze słownika wertykalu (F8) — nie wpisujesz
            własnej. Ustaw cenę, czas trwania i tryb realizacji.
          </p>
        </div>

        {catalogError ? (
          <p
            role="alert"
            className="rounded-xl2 border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700"
          >
            Nie udało się wczytać słownika usług. Odśwież stronę, aby dodać
            usługę.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor={nameId} className="text-sm font-medium text-ink">
                  Nazwa usługi{' '}
                  <span className="font-normal text-ink-subtle">
                    (ze słownika F8)
                  </span>
                </label>
                <select
                  id={nameId}
                  value={catalogName}
                  onChange={(e) => handleCatalogChange(e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="">Wybierz nazwę ze słownika…</option>
                  {catalog.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {selected && (
                  <p className="text-xs text-ink-subtle">
                    Podpowiedź ze słownika: {selected.defaultDurationMin} min
                    {selected.suggestedPricePln !== undefined
                      ? ` · ok. ${selected.suggestedPricePln} zł`
                      : ''}
                    .
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={priceId} className="text-sm font-medium text-ink">
                  Cena (zł)
                </label>
                <input
                  id={priceId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={durationId}
                  className="text-sm font-medium text-ink"
                >
                  Czas trwania (min)
                </label>
                <input
                  id={durationId}
                  type="number"
                  inputMode="numeric"
                  min={5}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor={modeId} className="text-sm font-medium text-ink">
                  Tryb realizacji
                </label>
                <select
                  id={modeId}
                  value={mode}
                  onChange={(e) => setMode(parseServiceMode(e.target.value))}
                  className={FIELD_CLASS}
                >
                  {SERVICE_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={catalog.length === 0}
              >
                Dodaj usługę
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Pojedyncza usługa: podgląd + edycja inline + usunięcie z potwierdzeniem
 * ------------------------------------------------------------------ */

interface ServiceCardProps {
  service: Service;
  onChanged: () => void;
}

function ServiceCard({ service, onChanged }: ServiceCardProps) {
  const priceId = useId();
  const durationId = useId();
  const modeId = useId();

  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(service.pricePln));
  const [duration, setDuration] = useState(String(service.durationMin));
  const [mode, setMode] = useState<ServiceMode>(service.mode);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function startEdit() {
    setPrice(String(service.pricePln));
    setDuration(String(service.durationMin));
    setMode(service.mode);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const invalid = validatePriceDuration(price, duration);
    if (invalid) {
      setError(invalid);
      return;
    }

    const body: UpdateServiceBody = {
      pricePln: Number(price),
      durationMin: Number(duration),
      mode,
    };

    setSaving(true);
    try {
      const res = await apiClient.request<Service>(
        'PATCH',
        `/api/services/${service.id}`,
        { body },
      );
      if (res.status === 200) {
        setEditing(false);
        onChanged();
      } else if (res.status === 404) {
        setError('Nie znaleziono usługi — mogła zostać już usunięta.');
      } else {
        setError(`Nie udało się zapisać zmian (kod ${res.status}).`);
      }
    } catch {
      setError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await apiClient.request<DeleteServiceResponse>(
        'DELETE',
        `/api/services/${service.id}`,
      );
      if (res.status === 200 || res.status === 204 || res.status === 404) {
        // 404 = usługa już nie istnieje; i tak odświeżamy listę.
        setConfirmOpen(false);
        onChanged();
      } else {
        setConfirmOpen(false);
        setError(`Nie udało się usunąć usługi (kod ${res.status}).`);
      }
    } catch {
      setConfirmOpen(false);
      setError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-ink">{service.name}</h3>
              <p className="text-xs text-ink-subtle">
                Nazwa pochodzi ze słownika (F8) i jest stała — edytujesz cenę,
                czas i tryb.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={priceId} className="text-sm font-medium text-ink">
                  Cena (zł)
                </label>
                <input
                  id={priceId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={durationId}
                  className="text-sm font-medium text-ink"
                >
                  Czas trwania (min)
                </label>
                <input
                  id={durationId}
                  type="number"
                  inputMode="numeric"
                  min={5}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={modeId} className="text-sm font-medium text-ink">
                  Tryb realizacji
                </label>
                <select
                  id={modeId}
                  value={mode}
                  onChange={(e) => setMode(parseServiceMode(e.target.value))}
                  className={FIELD_CLASS}
                >
                  {SERVICE_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={cancelEdit}>
                Anuluj
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                Zapisz zmiany
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-ink">
                  {service.name}
                </h3>
                <p className="text-sm text-ink-muted">
                  {service.durationMin} min · {service.pricePln} zł ·{' '}
                  {SERVICE_MODE_LABEL[service.mode]}
                </p>
                {service.description && (
                  <p className="text-sm text-ink-subtle">{service.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="md" onClick={startEdit}>
                  Edytuj
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setConfirmOpen(true)}
                  className="text-danger-700 hover:bg-danger-50"
                >
                  Usuń
                </Button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
              >
                {error}
              </p>
            )}
          </>
        )}
      </CardContent>

      {confirmOpen && (
        <ConfirmDeleteDialog
          serviceName={service.name}
          deleting={deleting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Dostępny dialog potwierdzenia usunięcia (role=dialog, Esc, focus trap)
 * ------------------------------------------------------------------ */

interface ConfirmDeleteDialogProps {
  serviceName: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDeleteDialog({
  serviceName,
  deleting,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Fokus startowy na bezpiecznej akcji (Anuluj).
    cancelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="my-0 flex w-full max-w-md flex-col gap-5 rounded-t-xl2 bg-white p-5 shadow-card sm:my-8 sm:rounded-xl2"
      >
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            Usunąć usługę?
          </h2>
          <p id={descId} className="text-sm text-ink-muted">
            Usługa „{serviceName}” zostanie usunięta z Twojego cennika. Tej
            operacji nie można cofnąć.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button ref={cancelRef} type="button" variant="ghost" onClick={onCancel}>
            Anuluj
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deleting}
            onClick={onConfirm}
          >
            Usuń usługę
          </Button>
        </div>
      </div>
    </div>
  );
}

function ServicesSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Wczytuję usługi…</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-24 animate-pulse rounded-xl2 bg-surface-subtle"
        />
      ))}
    </div>
  );
}
