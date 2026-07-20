'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { SpecialistsListResponse } from '@/domain';
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

/* ------------------------------------------------------------------ *
 * Stan panelu demo — dowód działania zamockowanego backendu (MSW).
 * ------------------------------------------------------------------ */
type DemoState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; total: number; latencyMs: number; engine: string | null }
  | { status: 'error'; message: string };

/* ------------------------------------------------------------------ *
 * Dane prezentacyjne strony głównej (etykiety PL, identyfikatory EN).
 * ------------------------------------------------------------------ */
interface Specialization {
  /** Etykieta wyświetlana (PL). */
  readonly label: string;
  /** Wartość parametru `specialization` w /szukaj. */
  readonly query: string;
}

/** Pełna lista neutralnych etykiet specjalizacji (bez rankingu). */
const SPECIALIZATIONS: readonly Specialization[] = [
  { label: 'Terapia poznawczo-behawioralna', query: 'terapia poznawczo-behawioralna' },
  { label: 'Terapia par', query: 'terapia par' },
  { label: 'Terapia dzieci i młodzieży', query: 'terapia dzieci i młodzieży' },
  { label: 'Psychotraumatologia', query: 'psychotraumatologia' },
  { label: 'Terapia uzależnień', query: 'terapia uzależnień' },
  { label: 'Zaburzenia lękowe', query: 'zaburzenia lękowe' },
  { label: 'Zaburzenia depresyjne', query: 'zaburzenia depresyjne' },
  { label: 'Terapia schematów', query: 'terapia schematów' },
];

/** Podzbiór pokazywany jako szybkie wyszukiwania w hero. */
const HERO_TAGS: readonly Specialization[] = [
  { label: 'Terapia par', query: 'terapia par' },
  { label: 'Zaburzenia lękowe', query: 'zaburzenia lękowe' },
  { label: 'Terapia dzieci i młodzieży', query: 'terapia dzieci i młodzieży' },
  { label: 'Psychotraumatologia', query: 'psychotraumatologia' },
];

interface Step {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

const STEPS: readonly Step[] = [
  {
    id: 'search',
    title: 'Wyszukaj i porównaj',
    body: 'Filtruj specjalistów po specjalizacji, mieście i formie wizyty. Porównaj profile, doświadczenie i wolne terminy.',
  },
  {
    id: 'pick',
    title: 'Wybierz termin',
    body: 'Sprawdź dostępne godziny w kalendarzu i wybierz slot, który Ci pasuje — online lub w gabinecie.',
  },
  {
    id: 'book',
    title: 'Zarezerwuj i dostań potwierdzenie',
    body: 'Zarezerwuj wizytę w kilku krokach. Otrzymasz potwierdzenie oraz automatyczne przypomnienie przed spotkaniem.',
  },
];

interface TrustPoint {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

const TRUST_POINTS: readonly TrustPoint[] = [
  {
    id: 'verified',
    title: 'Zweryfikowani specjaliści',
    body: 'Potwierdzamy uprawnienia (PWZ) w rejestrach KRL i KIF.',
  },
  {
    id: 'format',
    title: 'Wizyty online lub w gabinecie',
    body: 'Wybierasz formę wizyty, która Ci odpowiada.',
  },
  {
    id: 'privacy',
    title: 'Ochrona danych',
    body: 'Dane przetwarzamy zgodnie z RODO.',
  },
];

/** Wspólny styl głównego CTA renderowanego jako `Link` (48px tap target). */
const primaryCtaClass =
  'inline-flex min-h-[3rem] w-fit items-center justify-center gap-2 rounded-xl2 bg-brand-700 px-6 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-800 active:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

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

/** Znacznik listy — check (dekoracyjny). */
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

/** Klikalny tag specjalizacji: `Link` → /szukaj z wizualnym `Chip`. */
function SpecLink({
  spec,
  variant = 'brand',
}: {
  spec: Specialization;
  variant?: ChipVariant;
}) {
  return (
    <Link
      href={`/szukaj?specialization=${encodeURIComponent(spec.query)}`}
      className="group inline-flex min-h-[2.75rem] items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    >
      <Chip
        variant={variant}
        className="px-4 py-2.5 text-sm transition-colors group-hover:bg-brand-100 group-hover:text-brand-800"
      >
        {spec.label}
      </Chip>
    </Link>
  );
}

export default function HomePage() {
  const [state, setState] = useState<DemoState>({ status: 'idle' });
  const loading = state.status === 'loading';

  async function handleTestMock() {
    setState({ status: 'loading' });
    try {
      const res =
        await apiClient.get<SpecialistsListResponse>('/api/specialists');
      setState({
        status: 'success',
        total: res.data.total,
        latencyMs: res.latencyMs,
        engine: res.engine,
      });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Nie udało się pobrać danych z zamockowanego backendu.',
      });
    }
  }

  return (
    <div className="flex flex-col gap-12">
      {/* ============================= HERO ============================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-6 shadow-card md:p-10">
        <Dots className="pointer-events-none absolute right-6 top-6 hidden h-16 w-16 text-brand-200 md:block" />

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          {/* Kolumna tekstowa */}
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Wizyty online i stacjonarne
            </span>

            <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Znajdź psychologa i zarezerwuj{' '}
              <span className="relative inline-block whitespace-nowrap text-brand-700">
                wizytę
                <Squiggle className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full text-brand-400" />
              </span>{' '}
              online
            </h1>

            <p className="max-w-xl text-base text-ink-muted">
              Przeglądaj profile zweryfikowanych specjalistów, sprawdzaj wolne
              terminy i rezerwuj wizytę w kilku krokach — w gabinecie lub online.
            </p>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-ink-muted">
                Popularne wyszukiwania
              </span>
              <nav
                aria-label="Popularne wyszukiwania"
                className="flex flex-wrap gap-2"
              >
                {HERO_TAGS.map((spec) => (
                  <SpecLink key={spec.query} spec={spec} variant="brand" />
                ))}
              </nav>
            </div>
          </div>

          {/* Kolumna graficzna */}
          <div className="relative flex justify-center">
            <Blob className="pointer-events-none absolute -top-6 right-2 h-64 w-64 text-brand-100" />
            <HeroCalm className="relative w-full max-w-md" />
          </div>
        </div>

        {/* CTA obok panelu demo (dowód zamockowanego backendu) */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-stretch">
          {/* Karta CTA */}
          <div className="flex flex-col justify-center gap-4 rounded-xl2 border border-brand-100 bg-white/70 p-5 shadow-card">
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold text-ink">
                Zacznij od wyszukiwania
              </p>
              <p className="text-sm text-ink-muted">
                Podaj specjalizację lub miasto i przejrzyj dostępnych
                specjalistów — bez opłat za korzystanie z wyszukiwarki.
              </p>
            </div>
            <Link href="/szukaj" className={primaryCtaClass}>
              Znajdź specjalistę
              <ChevronRight />
            </Link>
          </div>

          {/* Panel demo — dowód działania zamockowanego backendu */}
          <div className="flex flex-col gap-4 rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-ink">
                Sprawdź zamockowany backend
              </h2>
              <p className="text-sm text-ink-muted">
                Wywołaj przykładowe żądanie do warstwy MSW i zobacz odpowiedź.
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleTestMock}
              loading={loading}
              className="w-full"
            >
              {loading ? 'Ładowanie…' : 'Testuj mock'}
            </Button>

            <div aria-live="polite" role="status" className="min-h-[2.5rem]">
              {state.status === 'success' && (
                <div className="flex items-start gap-2 rounded-xl2 border border-success-200 bg-success-50 p-3 text-sm text-brand-800">
                  <span aria-hidden="true">✓</span>
                  <span>
                    Pobrano {state.total} specjalistów z zamockowanego backendu (
                    {state.latencyMs} ms, x-engine: {state.engine ?? 'brak'}).
                  </span>
                </div>
              )}
              {state.status === 'error' && (
                <div className="flex items-start gap-2 rounded-xl2 border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
                  <span aria-hidden="true">✕</span>
                  <span>Błąd żądania: {state.message}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              <BeBadge
                endpoint="GET /api/specialists"
                desc="Żądanie jest zamockowane przez MSW i zalogowane w panelu BE Inspector (uchwyt w rogu ekranu)."
              />
              <p className="text-xs text-ink-subtle">
                Otwórz panel BE Inspector w prawym dolnym rogu, aby zobaczyć
                zalogowane żądanie — to dowód, że backend jest zamockowany.
              </p>
            </div>
          </div>
        </div>
      </section>

      <WavyDivider className="h-6 w-full text-brand-100" />

      {/* ========================= JAK TO DZIAŁA ======================== */}
      <section className="relative overflow-hidden">
        <Dots className="pointer-events-none absolute -right-2 -top-4 hidden h-20 w-20 text-brand-100 md:block" />

        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
            Jak to działa
            <Sparkle className="h-5 w-5 text-brand-500" />
          </h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Korzystanie z wyszukiwarki jest bezpłatne dla pacjenta, a
            przypomnienia o wizycie wysyłamy automatycznie.
          </p>
        </div>

        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.id} className="relative">
              <Card className="h-full transition-shadow hover:shadow-card-hover">
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

      {/* ===================== POPULARNE SPECJALIZACJE ================== */}
      <section className="relative">
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
            Popularne specjalizacje
            <Leaf className="h-5 w-5 text-brand-500" />
          </h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Wybierz obszar, aby przejść do wyszukiwarki z gotowym filtrem.
          </p>
        </div>

        <nav
          aria-label="Popularne specjalizacje"
          className="mt-5 flex flex-wrap gap-3"
        >
          {SPECIALIZATIONS.map((spec) => (
            <SpecLink key={spec.query} spec={spec} variant="outline" />
          ))}
        </nav>
      </section>

      {/* ====================== BEZPIECZEŃSTWO / ZAUFANIE =============== */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-surface-muted p-6 shadow-card md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative flex justify-center">
            <Blob className="pointer-events-none absolute inset-0 m-auto h-56 w-56 text-brand-100" />
            <ShieldCheck className="relative w-full max-w-xs" />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Bezpieczeństwo i zaufanie
            </h2>
            <ul className="flex flex-col gap-4">
              {TRUST_POINTS.map((point) => (
                <li key={point.id} className="flex items-start gap-3">
                  <CheckMark />
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-base font-semibold text-ink">
                      {point.title}
                    </h3>
                    <p className="text-sm text-ink-muted">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ========================= CTA KOŃCOWE ========================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 to-surface-muted p-6 md:p-10">
        <CalmScene className="pointer-events-none absolute -bottom-6 -right-4 hidden h-44 w-44 md:block" />
        <div className="relative flex flex-col gap-4 md:max-w-lg">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Znajdź specjalistę dopasowanego do Twoich potrzeb
          </h2>
          <p className="text-base text-ink-muted">
            Przejrzyj profile, sprawdź dostępne terminy i zarezerwuj wizytę
            online lub w gabinecie.
          </p>
          <Link href="/szukaj" className={primaryCtaClass}>
            Znajdź specjalistę
            <ChevronRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
