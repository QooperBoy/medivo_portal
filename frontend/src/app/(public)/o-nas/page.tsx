/**
 * (public) /o-nas — strona statyczna „O nas" (A9).
 *
 * Server component: opisuje misję przykładowego serwisu (marketplace) do
 * rezerwacji wizyt u psychologów i psychoterapeutów, wyróżniki (weryfikacja
 * PWZ, subskrypcja zamiast prowizji, RODO) oraz sekcję „Jak działamy".
 * Treść jest materiałem demonstracyjnym (mock) — bez superlatywów i rankingu.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';
import { HeroCalm, ShieldCheck } from '@/components/illustrations';
import { Dots, Sparkle, Squiggle, Leaf, WavyDivider } from '@/components/doodles';

export const metadata: Metadata = {
  title: 'O nas — ZnanyPsycholog (demo)',
  description:
    'Misja ZnanyPsycholog — przykładowego serwisu (marketplace) do rezerwacji wizyt u psychologów i psychoterapeutów. Materiał demonstracyjny (mock).',
};

/* ------------------------------------------------------------------ *
 * Style linków-przycisków (min. 44px tap target) — bez JS.
 * ------------------------------------------------------------------ */
const linkPrimary =
  'inline-flex min-h-[2.75rem] w-fit items-center justify-center gap-2 rounded-xl2 bg-brand-700 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800 active:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const linkOutline =
  'inline-flex min-h-[2.75rem] w-fit items-center justify-center gap-2 rounded-xl2 border border-brand-600 bg-white px-5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 active:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

/* ------------------------------------------------------------------ *
 * Ikony i noty (dekoracyjne).
 * ------------------------------------------------------------------ */
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

function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-5 w-5 flex-none text-warning-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  );
}

/** Powtarzalna nota o charakterze demonstracyjnym serwisu. */
function DemoNote() {
  return (
    <div className="flex items-start gap-3 rounded-xl2 border border-warning-200 bg-warning-50 p-4">
      <NoteIcon />
      <p className="text-sm text-warning-700">
        <span className="font-semibold">Materiał demonstracyjny.</span>{' '}
        ZnanyPsycholog to makieta front-endu (mock) działająca na zamockowanym
        backendzie (MSW). Nie jest to realny serwis — przedstawione treści i dane
        są wyłącznie poglądowe.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Dane prezentacyjne (etykiety PL, identyfikatory EN).
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
    body: 'Uprawnienia specjalistów potwierdzamy w rejestrach zawodowych (KRL, KIF), zanim profil trafi do wyszukiwarki.',
    icon: <ShieldCheck className="h-12 w-12" />,
  },
  {
    id: 'subscription',
    title: 'Subskrypcja zamiast prowizji',
    body: 'Specjalista płaci stałą opłatę za okres rozliczeniowy. Nie pobieramy prowizji od pojedynczych wizyt.',
    icon: (
      <IconBox>
        <IconWallet />
      </IconBox>
    ),
  },
  {
    id: 'rodo',
    title: 'Ochrona danych (RODO)',
    body: 'Dane pacjentów i specjalistów przetwarzamy zgodnie z RODO. Konto pozwala pobrać lub usunąć swoje dane.',
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
    id: 'search',
    title: 'Pacjent szuka i porównuje',
    body: 'Pacjent filtruje profile po specjalizacji, mieście i formie wizyty, a następnie porównuje dostępne terminy.',
  },
  {
    id: 'book',
    title: 'Rezerwacja terminu',
    body: 'Pacjent wybiera wolny termin z kalendarza specjalisty i rezerwuje wizytę online lub w gabinecie.',
  },
  {
    id: 'reminders',
    title: 'Potwierdzenie i przypomnienia',
    body: 'Po rezerwacji obie strony otrzymują potwierdzenie, a przed wizytą — automatyczne przypomnienie.',
  },
  {
    id: 'specialist',
    title: 'Specjalista prowadzi praktykę',
    body: 'Specjalista zarządza grafikiem, usługami i profilem w panelu — w modelu subskrypcyjnym, bez prowizji od wizyt.',
  },
];

export default function ONasPage() {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      {/* ============================= HERO ============================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-6 shadow-card md:p-10">
        <Dots className="pointer-events-none absolute right-6 top-6 hidden h-16 w-16 text-brand-200 md:block" />

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              O nas
            </span>

            <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Łączymy pacjentów ze{' '}
              <span className="relative inline-block whitespace-nowrap text-brand-700">
                specjalistami
                <Squiggle className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full text-brand-400" />
              </span>
            </h1>

            <p className="max-w-xl text-base text-ink-muted">
              ZnanyPsycholog to przykładowy serwis typu marketplace do rezerwacji
              wizyt u psychologów i psychoterapeutów. Pokazujemy, jak może
              wyglądać wyszukiwanie specjalisty, rezerwacja terminu i prowadzenie
              praktyki w jednym miejscu.
            </p>
          </div>

          <div className="relative flex justify-center">
            <HeroCalm className="relative w-full max-w-md" />
          </div>
        </div>
      </section>

      <DemoNote />

      {/* ============================= MISJA ============================ */}
      <section aria-labelledby="mission-heading" className="flex flex-col gap-3">
        <h2
          id="mission-heading"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink"
        >
          Nasza misja
          <Leaf className="h-5 w-5 text-brand-500" />
        </h2>
        <p className="max-w-3xl text-base text-ink-muted">
          Chcemy, aby droga od decyzji o rozpoczęciu terapii do pierwszej wizyty
          była prosta i zrozumiała. Pacjentom udostępniamy przejrzyste profile
          zweryfikowanych specjalistów oraz dostępne terminy, a specjalistom —
          narzędzia do prowadzenia kalendarza i profilu. Nie oceniamy skuteczności
          terapii ani nie tworzymy rankingów specjalistów.
        </p>
      </section>

      <WavyDivider className="h-6 w-full text-brand-100" />

      {/* ========================== WYRÓŻNIKI ========================== */}
      <section aria-labelledby="features-heading" className="relative">
        <div className="flex flex-col gap-2">
          <h2
            id="features-heading"
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Co nas wyróżnia
          </h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Trzy zasady, na których opieramy działanie tej makiety serwisu.
          </p>
        </div>

        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.id}>
              <Card className="h-full">
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

      {/* ========================= JAK DZIAŁAMY ======================== */}
      <section aria-labelledby="how-heading" className="relative">
        <div className="flex flex-col gap-2">
          <h2
            id="how-heading"
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Jak działamy
          </h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Od wyszukania specjalisty po prowadzenie praktyki — w czterech krokach.
          </p>
        </div>

        <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3">
                  <span
                    className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <h3 className="text-base font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="text-sm text-ink-muted">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ============================= CTA ============================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 to-surface-muted p-6 md:p-10">
        <div className="flex flex-col gap-4 md:max-w-lg">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Zobacz, jak to działa
          </h2>
          <p className="text-base text-ink-muted">
            Przejrzyj wyszukiwarkę specjalistów lub sprawdź, jak wygląda panel dla
            psychologów i psychoterapeutów.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/szukaj" className={linkPrimary}>
              Znajdź specjalistę
            </Link>
            <Link href="/dla-specjalistow" className={linkOutline}>
              Dla specjalistów
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
