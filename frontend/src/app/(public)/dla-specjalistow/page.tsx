'use client';

/**
 * (public) /dla-specjalistow — landing B2B dla specjalistów (C1) + cennik (C2).
 *
 * Model rozliczeń: SUBSKRYPCJA specjalisty (stała opłata za okres), NIE prowizja
 * od wizyt. Sekcje: hero z CTA do rejestracji, wyróżniki, „jak zacząć" (3 kroki),
 * cennik pobierany z `GET /api/subscription/plans` (widoczny w BE Inspectorze),
 * FAQ i CTA końcowe. Copy PL, bez superlatywów/rankingu.
 *
 * Całość jest komponentem klienckim — cennik pobieramy po stronie klienta, aby
 * żądanie do zamockowanego backendu (MSW) trafiło do panelu BE Inspector.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  ONBOARDING_ENDPOINTS,
  type SubscriptionPlan,
  type SubscriptionPlansResponse,
} from '@/domain';
import { Button, Card, CardContent, CardHeader, CardTitle, Chip } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { HeroCalm, ShieldCheck, CalmScene } from '@/components/illustrations';
import {
  Squiggle,
  Sparkle,
  Dots,
  Arrow,
  Leaf,
  Blob,
  WavyDivider,
} from '@/components/doodles';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Stałe / helpery
 * ------------------------------------------------------------------ */

const PLANS_PATH = ONBOARDING_ENDPOINTS.subscriptionPlans.path;
const REGISTER_HREF = '/rejestracja-specjalisty';

/** Sufiks okresu rozliczeniowego planu. */
function periodSuffix(period: SubscriptionPlan['period']): string {
  return period === 'year' ? '/ rok' : '/ mies.';
}

/** Bazowe klasy CTA renderowanego jako `Link` (min. 48px tap target). */
const ctaBase =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl2 px-6 text-base font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const ctaVariant: Record<'primary' | 'outline', string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  outline:
    'border border-brand-600 bg-white text-brand-700 hover:bg-brand-50 active:bg-brand-100',
};

/** CTA jako link nawigacyjny (next/link) w stylu przycisku. */
function CtaLink({
  href,
  variant = 'primary',
  className,
  children,
}: {
  href: string;
  variant?: 'primary' | 'outline';
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(ctaBase, ctaVariant[variant], className)}>
      {children}
    </Link>
  );
}

/** Strzałka „w prawo" dla CTA (dekoracyjna). */
function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Znacznik listy — „ptaszek" (dekoracyjny). */
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

/** Pudełko na ikonę wyróżnika (jednolity wygląd kart). */
function IconBox({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-xl2 bg-brand-50 text-brand-700"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

/* --- proste ikony liniowe wyróżników (dekoracyjne) --- */

function IconWallet() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6" />
      <path d="M16 12.5h.01" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4M8 14h3M8 17h6" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Dane prezentacyjne (etykiety PL, identyfikatory EN)
 * ------------------------------------------------------------------ */

interface Feature {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly icon: ReactNode;
}

const FEATURES: readonly Feature[] = [
  {
    id: 'pwz',
    title: 'Weryfikacja PWZ',
    body: 'Potwierdzamy Twoje uprawnienia w rejestrach KRL i KIF, zanim profil trafi do wyszukiwarki.',
    icon: <ShieldCheck className="h-12 w-12" />,
  },
  {
    id: 'subscription',
    title: 'Subskrypcja zamiast prowizji',
    body: 'Płacisz stałą opłatę za okres rozliczeniowy. Nie pobieramy prowizji od pojedynczych wizyt.',
    icon: (
      <IconBox>
        <IconWallet />
      </IconBox>
    ),
  },
  {
    id: 'calendar',
    title: 'Kalendarz i dostępność',
    body: 'Ustawiasz godziny pracy, blokady i tryb wizyt — online lub w gabinecie.',
    icon: (
      <IconBox>
        <IconCalendar />
      </IconBox>
    ),
  },
  {
    id: 'reminders',
    title: 'Automatyczne przypomnienia',
    body: 'Pacjenci otrzymują przypomnienia o wizycie e-mailem i SMS-em.',
    icon: (
      <IconBox>
        <IconBell />
      </IconBox>
    ),
  },
  {
    id: 'rodo',
    title: 'Ochrona danych (RODO)',
    body: 'Dane pacjentów i Twoje przetwarzamy zgodnie z RODO.',
    icon: (
      <IconBox>
        <IconLock />
      </IconBox>
    ),
  },
];

interface Step {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

const STEPS: readonly Step[] = [
  {
    id: 'register',
    title: 'Rejestracja z numerem PWZ',
    body: 'Załóż konto specjalisty i podaj numer PWZ oraz rejestr zawodowy (KRL lub KIF).',
  },
  {
    id: 'verify',
    title: 'Weryfikacja uprawnień',
    body: 'Automat sprawdza numer w rejestrze. W razie potrzeby zgłoszenie trafia do weryfikacji ręcznej — z terminem do 24 godzin roboczych.',
  },
  {
    id: 'golive',
    title: 'Publikacja profilu',
    body: 'Po pozytywnej weryfikacji publikujesz profil (go-live) i zaczynasz przyjmować rezerwacje.',
  },
];

interface Faq {
  readonly id: string;
  readonly q: string;
  readonly a: string;
}

const FAQS: readonly Faq[] = [
  {
    id: 'commission',
    q: 'Czy płacę prowizję od wizyt?',
    a: 'Nie. Model jest subskrypcyjny — płacisz stałą opłatę za wybrany okres rozliczeniowy, niezależnie od liczby wizyt.',
  },
  {
    id: 'verification-time',
    q: 'Jak długo trwa weryfikacja PWZ?',
    a: 'Automat sprawdza numer w rejestrze KRL/KIF od razu po rejestracji. Jeśli potrzebna jest weryfikacja ręczna, rozpatrujemy zgłoszenie w czasie do 24 godzin roboczych.',
  },
  {
    id: 'registries',
    q: 'Jakie rejestry zawodowe obsługujecie?',
    a: 'Numer PWZ sprawdzamy w rejestrach KRL (Krajowy Rejestr Logopedów) oraz KIF (Krajowa Izba Fizjoterapeutów). Rejestr wybierasz podczas rejestracji.',
  },
  {
    id: 'change-plan',
    q: 'Czy mogę zmienić plan później?',
    a: 'Tak. Plan subskrypcji zmienisz w panelu specjalisty — zmiana obowiązuje od kolejnego okresu rozliczeniowego.',
  },
  {
    id: 'visible',
    q: 'Kiedy mój profil stanie się widoczny dla pacjentów?',
    a: 'Po pozytywnej weryfikacji publikujesz profil (go-live). Dopiero opublikowany profil pojawia się w wyszukiwarce.',
  },
];

/** Identyfikatory kart-szkieletów cennika (klucze listy podczas ładowania). */
const PLAN_SKELETONS = ['s1', 's2', 's3'] as const;

/* ------------------------------------------------------------------ *
 * Stan cennika (C2)
 * ------------------------------------------------------------------ */

type PlansState =
  | { status: 'loading' }
  | { status: 'success'; plans: SubscriptionPlan[] }
  | { status: 'error'; message: string };

/** Pojedyncza karta planu subskrypcji. */
function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  const highlighted = plan.highlighted === true;
  return (
    <Card
      className={cn(
        'relative flex h-full flex-col',
        highlighted && 'border-brand-500 ring-1 ring-brand-500 shadow-card-hover',
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{plan.name}</CardTitle>
          {highlighted && <Chip variant="brand">Popularny</Chip>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight text-ink">
            {plan.pricePln} zł
          </span>
          <span className="text-sm text-ink-muted">{periodSuffix(plan.period)}</span>
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

        <CtaLink
          href={REGISTER_HREF}
          variant={highlighted ? 'primary' : 'outline'}
          className="w-full"
        >
          Załóż konto
        </CtaLink>
      </CardContent>
    </Card>
  );
}

/** Szkielet cennika na czas ładowania. */
function PlansSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3" aria-hidden="true">
      {PLAN_SKELETONS.map((id) => (
        <Card key={id} className="flex h-full flex-col p-5">
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-8 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 flex flex-col gap-3">
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="mt-6 h-12 w-full animate-pulse rounded-xl2 bg-slate-100" />
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Strona
 * ------------------------------------------------------------------ */

export default function DlaSpecjalistowPage() {
  const [plansState, setPlansState] = useState<PlansState>({ status: 'loading' });

  const loadPlans = useCallback(async () => {
    setPlansState({ status: 'loading' });
    try {
      const res = await apiClient.get<SubscriptionPlansResponse>(PLANS_PATH);
      if (res.status === 200 && res.data && Array.isArray(res.data.items)) {
        setPlansState({ status: 'success', plans: res.data.items });
        return;
      }
      setPlansState({
        status: 'error',
        message: 'Nie udało się pobrać cennika. Spróbuj ponownie.',
      });
    } catch {
      setPlansState({
        status: 'error',
        message: 'Błąd połączenia z serwerem. Spróbuj ponownie.',
      });
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  return (
    <div className="flex flex-col gap-12">
      {/* ============================= HERO ============================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-6 shadow-card md:p-10">
        <Dots className="pointer-events-none absolute right-6 top-6 hidden h-16 w-16 text-brand-200 md:block" />

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Panel dla specjalistów
            </span>

            <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Przyjmuj{' '}
              <span className="relative inline-block whitespace-nowrap text-brand-700">
                rezerwacje
                <Squiggle className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full text-brand-400" />
              </span>{' '}
              online — panel dla psychologów i psychoterapeutów
            </h1>

            <p className="max-w-xl text-base text-ink-muted">
              Prowadź kalendarz, przyjmuj rezerwacje i zarządzaj profilem w jednym
              miejscu. Model subskrypcyjny — płacisz stałą opłatę za okres, bez
              prowizji od wizyt.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <CtaLink href={REGISTER_HREF} variant="primary" className="w-fit">
                Załóż konto specjalisty
                <ChevronRight />
              </CtaLink>
              <p className="text-sm text-ink-muted">
                Masz już konto?{' '}
                <Link
                  href="/logowanie"
                  className="font-medium text-brand-700 underline-offset-2 hover:underline"
                >
                  Zaloguj się
                </Link>
              </p>
            </div>
          </div>

          <div className="relative flex justify-center">
            <Blob className="pointer-events-none absolute -top-6 right-2 h-64 w-64 text-brand-100" />
            <HeroCalm className="relative w-full max-w-md" />
          </div>
        </div>
      </section>

      <WavyDivider className="h-6 w-full text-brand-100" />

      {/* ========================== WYRÓŻNIKI ========================== */}
      <section className="relative overflow-hidden" aria-labelledby="features-heading">
        <Dots className="pointer-events-none absolute -right-2 -top-4 hidden h-20 w-20 text-brand-100 md:block" />
        <div className="flex flex-col gap-2">
          <h2
            id="features-heading"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink"
          >
            Co zyskujesz jako specjalista
            <Sparkle className="h-5 w-5 text-brand-500" />
          </h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Narzędzia do prowadzenia praktyki i przyjmowania rezerwacji — w modelu
            subskrypcyjnym, bez prowizji od wizyt.
          </p>
        </div>

        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.id}>
              <Card className="h-full transition-shadow hover:shadow-card-hover">
                <CardContent className="flex h-full flex-col gap-3">
                  {feature.icon}
                  <h3 className="text-base font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-ink-muted">{feature.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* ========================== JAK ZACZĄĆ ========================= */}
      <section className="relative" aria-labelledby="steps-heading">
        <div className="flex flex-col gap-2">
          <h2
            id="steps-heading"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink"
          >
            Jak zacząć
            <Leaf className="h-5 w-5 text-brand-500" />
          </h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Od rejestracji do publikacji profilu w trzech krokach.
          </p>
        </div>

        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.id} className="relative">
              <Card className="h-full">
                <CardHeader className="flex-row items-center gap-3">
                  <span
                    className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <p className="text-sm text-ink-muted">{step.body}</p>
                </CardContent>
              </Card>

              {index < STEPS.length - 1 && (
                <Arrow className="pointer-events-none absolute -right-5 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-brand-300 md:block" />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ============================ CENNIK =========================== */}
      <section
        className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-surface-muted p-6 shadow-card md:p-10"
        aria-labelledby="pricing-heading"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <h2
              id="pricing-heading"
              className="text-2xl font-bold tracking-tight text-ink"
            >
              Cennik subskrypcji
            </h2>
            <p className="max-w-2xl text-sm text-ink-muted">
              Wybierz plan dopasowany do skali Twojej praktyki. Stała opłata za
              okres rozliczeniowy — bez prowizji od wizyt.
            </p>
          </div>
          <BeBadge
            endpoint="GET /api/subscription/plans"
            desc="Cennik pochodzi z zamockowanego backendu (MSW) i jest logowany w panelu BE Inspector."
            className="w-fit"
          />
        </div>

        <div className="mt-6" aria-live="polite" aria-busy={plansState.status === 'loading'}>
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

          {plansState.status === 'success' &&
            (plansState.plans.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Brak dostępnych planów do wyświetlenia.
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {plansState.plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            ))}
        </div>

        {/* Adnotacja transparentności (Omnibus) */}
        <p className="mt-5 max-w-2xl text-xs text-ink-subtle">
          Oznaczenie „Popularny” wskazuje najczęściej wybierany plan, a nie płatne
          wyróżnienie. Wszelkie płatne wyróżnienia w serwisie są zawsze wyraźnie
          oznaczone.
        </p>
      </section>

      {/* ============================= FAQ ============================= */}
      <section className="relative" aria-labelledby="faq-heading">
        <div className="flex flex-col gap-2">
          <h2
            id="faq-heading"
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Najczęstsze pytania
          </h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Krótkie odpowiedzi na pytania o rozliczenia i weryfikację.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {FAQS.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-xl2 border border-slate-200/70 bg-white p-4 shadow-card"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-ink marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
                {faq.q}
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 flex-none text-brand-600 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <p className="mt-3 text-sm text-ink-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ========================= CTA KOŃCOWE ========================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 to-surface-muted p-6 md:p-10">
        <CalmScene className="pointer-events-none absolute -bottom-6 -right-4 hidden h-44 w-44 md:block" />
        <div className="relative flex flex-col gap-4 md:max-w-lg">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Gotowy, aby przyjmować rezerwacje online?
          </h2>
          <p className="text-base text-ink-muted">
            Załóż konto specjalisty, zweryfikuj numer PWZ i opublikuj profil.
            To demonstracja na zamockowanym backendzie (MSW).
          </p>
          <CtaLink href={REGISTER_HREF} variant="primary" className="w-fit">
            Załóż konto specjalisty
            <ChevronRight />
          </CtaLink>
        </div>
      </section>
    </div>
  );
}
