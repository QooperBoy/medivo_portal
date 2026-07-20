'use client';

/**
 * (specialist) /panel/subskrypcja — Subskrypcja specjalisty (E12).
 *
 * Renderuje wyłącznie treść sekcji (layout panelu dostarcza nagłówek i
 * nawigację). Kontekst „obecnego specjalisty" pochodzi z PanelProvider.
 *
 * Model rozliczeń jest SUBSKRYPCYJNY (stała opłata za okres), nie prowizyjny.
 * Pobiera bieżącą subskrypcję (`GET /api/specialists/:id/subscription`) oraz
 * katalog planów (`GET /api/subscription/plans`). Zmiana planu to
 * `POST /api/specialists/:id/subscription {planId}`; po sukcesie odświeżamy
 * subskrypcję. Bieżący plan jest oznaczony i nieklikalny. Błąd 400 (np. plan
 * spoza katalogu) jest obsłużony komunikatem. Daty w strefie Europe/Warsaw.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ONBOARDING_ENDPOINTS,
  PANEL_EXTRA_ENDPOINTS,
  type ChangeSubscriptionBody,
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionPlansResponse,
  type SubscriptionStatus,
} from '@/domain';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Chip,
  type ChipVariant,
} from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { ShieldCheck } from '@/components/illustrations';
import { Sparkle, Dots, Leaf } from '@/components/doodles';
import { cn } from '@/lib/utils';
import { useCurrentSpecialist } from '@/components/specialist/PanelProvider';

/* ------------------------------------------------------------------ *
 * Ścieżki i helpery
 * ------------------------------------------------------------------ */

/** Ścieżka subskrypcji specjalisty (wspólna dla GET i POST). */
function subscriptionPath(id: string): string {
  return PANEL_EXTRA_ENDPOINTS.getSubscription.path.replace(
    ':id',
    encodeURIComponent(id),
  );
}

const PLANS_PATH = ONBOARDING_ENDPOINTS.subscriptionPlans.path;

/** Data w strefie Europe/Warsaw (np. „20 sierpnia 2026"). */
const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Warsaw',
});

function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** Sufiks okresu rozliczeniowego planu. */
function periodSuffix(period: SubscriptionPlan['period']): string {
  return period === 'year' ? '/ rok' : '/ mies.';
}

/** Ciało błędu z mocka (`{ error, message }`) — do bezpiecznego odczytu komunikatu. */
interface ApiErrorBody {
  error: string;
  message: string;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { message?: unknown }).message === 'string'
  );
}

/* ------------------------------------------------------------------ *
 * Status subskrypcji → Chip
 * ------------------------------------------------------------------ */

interface StatusMeta {
  readonly label: string;
  readonly variant: ChipVariant;
  readonly className?: string;
}

const STATUS_META: Record<SubscriptionStatus, StatusMeta> = {
  trialing: {
    label: 'Okres próbny',
    variant: 'default',
    className: 'border border-warning-200 bg-warning-50 text-warning-700',
  },
  active: { label: 'Aktywna', variant: 'brand' },
  past_due: {
    label: 'Zaległa płatność',
    variant: 'default',
    className: 'border border-danger-200 bg-danger-50 text-danger-700',
  },
  canceled: { label: 'Anulowana', variant: 'default' },
};

function StatusChip({ status }: { status: SubscriptionStatus }) {
  const meta = STATUS_META[status];
  return (
    <Chip variant={meta.variant} className={meta.className}>
      {meta.label}
    </Chip>
  );
}

/* ------------------------------------------------------------------ *
 * Drobne elementy prezentacji
 * ------------------------------------------------------------------ */

/** Znacznik listy cech — „ptaszek" (dekoracyjny). */
function CheckMark() {
  return (
    <span
      className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12l5 5L20 7" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Stany pobierania
 * ------------------------------------------------------------------ */

type SubscriptionState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; subscription: Subscription };

type PlansState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; plans: SubscriptionPlan[] };

/* ------------------------------------------------------------------ *
 * Karta bieżącej subskrypcji
 * ------------------------------------------------------------------ */

function CurrentSubscriptionCard({
  subscription,
}: {
  subscription: Subscription;
}) {
  const { planName, pricePln, status, trialEndsAt, renewsAt } = subscription;

  return (
    <Card className="relative overflow-hidden">
      <ShieldCheck className="pointer-events-none absolute -right-4 -top-4 hidden h-28 w-28 opacity-20 md:block" />
      <CardContent className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Twój plan</span>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-ink">{planName}</h2>
              <StatusChip status={status} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-ink tabular-nums">
              {pricePln} zł
            </span>
            <span className="text-sm text-ink-muted">/ mies.</span>
          </div>
        </div>

        <dl className="flex flex-col gap-1 text-sm">
          {status === 'trialing' && trialEndsAt && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-ink-muted">Okres próbny do:</dt>
              <dd className="font-medium text-ink">{formatDate(trialEndsAt)}</dd>
            </div>
          )}
          {renewsAt && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-ink-muted">Kolejne odnowienie:</dt>
              <dd className="font-medium text-ink">{formatDate(renewsAt)}</dd>
            </div>
          )}
          {pricePln === 0 && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="sr-only">Opłata:</dt>
              <dd className="text-ink-muted">Bez opłaty miesięcznej.</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Karta planu (z akcją zmiany)
 * ------------------------------------------------------------------ */

function PlanCard({
  plan,
  isCurrent,
  isChanging,
  disabled,
  onChoose,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  isChanging: boolean;
  disabled: boolean;
  onChoose: (planId: string) => void;
}) {
  const highlighted = plan.highlighted === true;
  return (
    <Card
      className={cn(
        'relative flex h-full flex-col',
        isCurrent
          ? 'border-brand-600 ring-1 ring-brand-600'
          : highlighted && 'border-brand-300 shadow-card-hover',
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{plan.name}</CardTitle>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {isCurrent && <Chip variant="brand">Twój plan</Chip>}
            {highlighted && !isCurrent && <Chip variant="outline">Popularny</Chip>}
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight text-ink tabular-nums">
            {plan.pricePln} zł
          </span>
          <span className="text-sm text-ink-muted">
            {periodSuffix(plan.period)}
          </span>
        </div>
        {plan.pricePln === 0 && (
          <p className="text-xs text-ink-subtle">Bez opłaty miesięcznej.</p>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5 pt-4">
        <ul className="flex flex-1 flex-col gap-2.5">
          {plan.features.map((feature) => (
            <li
              key={`${plan.id}-${feature}`}
              className="flex items-start gap-2.5 text-sm text-ink-muted"
            >
              <CheckMark />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={isCurrent ? 'outline' : highlighted ? 'primary' : 'outline'}
          className="w-full"
          disabled={isCurrent || disabled}
          loading={isChanging}
          aria-label={
            isCurrent
              ? `Plan ${plan.name} jest Twoim bieżącym planem`
              : `Zmień na plan ${plan.name}`
          }
          onClick={() => onChoose(plan.id)}
        >
          {isCurrent ? 'Twój plan' : 'Zmień na ten plan'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Szkielety
 * ------------------------------------------------------------------ */

const PLAN_SKELETONS = ['s1', 's2', 's3'] as const;

function PlansSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3" aria-hidden="true">
      {PLAN_SKELETONS.map((id) => (
        <Card key={id} className="flex h-full flex-col p-5">
          <div className="h-5 w-24 animate-pulse rounded bg-surface-subtle" />
          <div className="mt-4 h-8 w-28 animate-pulse rounded bg-surface-subtle" />
          <div className="mt-6 flex flex-col gap-3">
            <div className="h-4 w-full animate-pulse rounded bg-surface-subtle" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-surface-subtle" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-surface-subtle" />
          </div>
          <div className="mt-6 h-11 w-full animate-pulse rounded-xl2 bg-surface-subtle" />
        </Card>
      ))}
    </div>
  );
}

function CurrentSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-32 animate-pulse rounded-xl2 bg-surface-subtle"
    />
  );
}

/* ------------------------------------------------------------------ *
 * Strona
 * ------------------------------------------------------------------ */

export default function SubskrypcjaPage() {
  const { specialist, loading, error } = useCurrentSpecialist();
  const specialistId = specialist?.id ?? null;

  const [subState, setSubState] = useState<SubscriptionState>({
    status: 'loading',
  });
  const [plansState, setPlansState] = useState<PlansState>({ status: 'loading' });
  const [changingPlanId, setChangingPlanId] = useState<string | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);

  const loadSubscription = useCallback(async (id: string) => {
    setSubState({ status: 'loading' });
    try {
      const res = await apiClient.get<Subscription>(subscriptionPath(id));
      if (res.status >= 400) {
        setSubState({
          status: 'error',
          message: 'Nie udało się wczytać subskrypcji z zamockowanego backendu.',
        });
        return;
      }
      setSubState({ status: 'ready', subscription: res.data });
    } catch {
      setSubState({
        status: 'error',
        message: 'Błąd połączenia z zamockowanym backendem.',
      });
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setPlansState({ status: 'loading' });
    try {
      const res = await apiClient.get<SubscriptionPlansResponse>(PLANS_PATH);
      if (res.status >= 400 || !Array.isArray(res.data?.items)) {
        setPlansState({
          status: 'error',
          message: 'Nie udało się wczytać planów. Spróbuj ponownie.',
        });
        return;
      }
      setPlansState({ status: 'ready', plans: res.data.items });
    } catch {
      setPlansState({
        status: 'error',
        message: 'Błąd połączenia z zamockowanym backendem.',
      });
    }
  }, []);

  useEffect(() => {
    if (!specialistId) return;
    void loadSubscription(specialistId);
    void loadPlans();
  }, [specialistId, loadSubscription, loadPlans]);

  const changePlan = useCallback(
    async (id: string, planId: string) => {
      setChangeError(null);
      setChangingPlanId(planId);
      try {
        const body: ChangeSubscriptionBody = { planId };
        const res = await apiClient.post<Subscription>(
          subscriptionPath(id),
          body,
        );
        if (res.status >= 400) {
          setChangeError(
            isApiErrorBody(res.data)
              ? res.data.message
              : 'Nie udało się zmienić planu. Spróbuj ponownie.',
          );
          return;
        }
        // Po zmianie odśwież subskrypcję (ponowny odczyt bieżącego stanu).
        await loadSubscription(id);
      } catch {
        setChangeError('Błąd połączenia z zamockowanym backendem.');
      } finally {
        setChangingPlanId(null);
      }
    },
    [loadSubscription],
  );

  const header = (
    <header className="relative flex flex-col gap-3">
      <Dots className="pointer-events-none absolute -top-2 right-0 hidden h-12 w-12 text-brand-100 md:block" />
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          Subskrypcja
          <Leaf className="h-5 w-5" />
        </h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          Zarządzaj planem subskrypcji swojej praktyki. Model rozliczeń jest
          subskrypcyjny — stała opłata za okres, bez prowizji od wizyt.
        </p>
      </div>
      <BeBadge
        endpoint="GET /api/specialists/:id/subscription"
        desc="Subskrypcja i katalog planów pochodzą z zamockowanego backendu (MSW): silnik E12-billing."
        className="self-start"
      />
    </header>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <CurrentSkeleton />
        <PlansSkeleton />
      </div>
    );
  }

  if (error || !specialist) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p
          role="alert"
          className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          {error ?? 'Nie udało się wczytać profilu specjalisty.'}
        </p>
      </div>
    );
  }

  const currentPlanId =
    subState.status === 'ready' ? subState.subscription.planId : null;

  return (
    <div className="flex flex-col gap-8">
      {header}

      {/* ==================== BIEŻĄCA SUBSKRYPCJA ==================== */}
      <section className="flex flex-col gap-3" aria-labelledby="current-heading">
        <h2 id="current-heading" className="text-lg font-semibold text-ink">
          Bieżąca subskrypcja
        </h2>

        <div aria-live="polite" aria-busy={subState.status === 'loading'}>
          {subState.status === 'loading' && <CurrentSkeleton />}

          {subState.status === 'error' && (
            <div className="flex flex-col items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-4">
              <p role="alert" className="text-sm text-danger-700">
                {subState.message}
              </p>
              <Button
                variant="secondary"
                onClick={() => void loadSubscription(specialist.id)}
              >
                Spróbuj ponownie
              </Button>
            </div>
          )}

          {subState.status === 'ready' && (
            <CurrentSubscriptionCard subscription={subState.subscription} />
          )}
        </div>
      </section>

      {/* ========================= PLANY ========================= */}
      <section className="flex flex-col gap-4" aria-labelledby="plans-heading">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 id="plans-heading" className="text-lg font-semibold text-ink">
              Dostępne plany
            </h2>
            <Sparkle className="h-4 w-4 text-brand-500" />
          </div>
          <p className="max-w-2xl text-sm text-ink-muted">
            Zmiana planu obowiązuje od kolejnego okresu rozliczeniowego. Bieżący
            plan jest oznaczony.
          </p>
          <BeBadge
            endpoint="GET /api/subscription/plans"
            desc="Katalog planów (C2) pochodzi z zamockowanego backendu (MSW) i jest logowany w panelu BE Inspector."
            className="self-start"
          />
        </div>

        {/* Komunikat błędu zmiany planu (np. 400 — plan spoza katalogu). */}
        {changeError && (
          <p
            role="alert"
            className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
          >
            {changeError}
          </p>
        )}

        <div aria-live="polite" aria-busy={plansState.status === 'loading'}>
          {plansState.status === 'loading' && <PlansSkeleton />}

          {plansState.status === 'error' && (
            <div className="flex flex-col items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-4">
              <p role="alert" className="text-sm text-danger-700">
                {plansState.message}
              </p>
              <Button variant="secondary" onClick={() => void loadPlans()}>
                Spróbuj ponownie
              </Button>
            </div>
          )}

          {plansState.status === 'ready' &&
            (plansState.plans.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Brak dostępnych planów do wyświetlenia.
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {plansState.plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrent={plan.id === currentPlanId}
                    isChanging={changingPlanId === plan.id}
                    disabled={changingPlanId !== null}
                    onChoose={(planId) => void changePlan(specialist.id, planId)}
                  />
                ))}
              </div>
            ))}
        </div>
      </section>

      {/* ===================== ADNOTACJE ===================== */}
      <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-5">
        <p className="max-w-3xl text-xs text-ink-subtle">
          Model rozliczeń jest subskrypcyjny — płacisz stałą opłatę za wybrany
          okres rozliczeniowy, niezależnie od liczby wizyt. Nie pobieramy prowizji
          od pojedynczych wizyt.
        </p>
        <p className="max-w-3xl text-xs text-ink-subtle">
          Oznaczenie „Popularny” wskazuje najczęściej wybierany plan, a nie płatne
          wyróżnienie. Wszelkie płatne wyróżnienia w serwisie są zawsze wyraźnie
          oznaczone.
        </p>
        <p className="max-w-3xl text-xs text-ink-subtle">
          Dane demonstracyjne — subskrypcja obsługiwana jest przez zamockowany
          backend (silnik E12).
        </p>
      </div>
    </div>
  );
}
