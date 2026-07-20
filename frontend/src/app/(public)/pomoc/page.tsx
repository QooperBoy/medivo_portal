/**
 * (public) /pomoc — centrum pomocy / FAQ (A9).
 *
 * Server component: zestaw najczęstszych pytań w podziale „Dla pacjentów" i
 * „Dla specjalistów" (dostępne `<details>`/`<summary>`), skróty do kluczowych
 * tras oraz odesłanie do kontaktu. Treść demonstracyjna (mock).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyResults } from '@/components/illustrations';
import { Dots, Sparkle } from '@/components/doodles';

export const metadata: Metadata = {
  title: 'Pomoc i FAQ — ZnanyPsycholog (demo)',
  description:
    'Najczęstsze pytania pacjentów i specjalistów o rezerwacje, weryfikację PWZ i subskrypcję. Centrum pomocy demonstracyjnego serwisu ZnanyPsycholog (mock).',
};

/* ------------------------------------------------------------------ *
 * Style linków-przycisków (min. 44px tap target).
 * ------------------------------------------------------------------ */
const linkOutline =
  'inline-flex min-h-[2.75rem] w-fit items-center justify-center gap-2 rounded-xl2 border border-brand-600 bg-white px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 active:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const linkPrimary =
  'inline-flex min-h-[2.75rem] w-fit items-center justify-center gap-2 rounded-xl2 bg-brand-700 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800 active:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

/* ------------------------------------------------------------------ *
 * Dane FAQ (etykiety PL, identyfikatory EN).
 * ------------------------------------------------------------------ */
interface Faq {
  readonly id: string;
  readonly q: string;
  readonly a: string;
}

const PATIENT_FAQS: readonly Faq[] = [
  {
    id: 'how-search',
    q: 'Jak znaleźć specjalistę?',
    a: 'Skorzystaj z wyszukiwarki i filtrów: specjalizacja, miasto oraz forma wizyty (online lub w gabinecie). Wyniki możesz porównać po profilach i dostępnych terminach.',
  },
  {
    id: 'cost-search',
    q: 'Czy korzystanie z wyszukiwarki jest płatne?',
    a: 'Nie. W tej makiecie przeglądanie profili i wyszukiwarka są bezpłatne dla pacjenta. Koszt wizyty ustala specjalista i jest widoczny przy usłudze.',
  },
  {
    id: 'how-book',
    q: 'Jak zarezerwować wizytę?',
    a: 'Wejdź na profil specjalisty, wybierz wolny termin z kalendarza i potwierdź rezerwację. Po zakończeniu procesu zobaczysz podsumowanie wizyty.',
  },
  {
    id: 'online-office',
    q: 'Czym różni się wizyta online od stacjonarnej?',
    a: 'Wizyta online odbywa się zdalnie, a stacjonarna — w gabinecie specjalisty. Formę wizyty wybierasz podczas rezerwacji, jeśli specjalista udostępnia obie opcje.',
  },
  {
    id: 'reminders',
    q: 'Czy dostanę przypomnienie o wizycie?',
    a: 'Tak. Po rezerwacji otrzymasz potwierdzenie, a przed terminem — automatyczne przypomnienie. To zachowanie makiety uruchamiane na zamockowanym backendzie.',
  },
  {
    id: 'reschedule',
    q: 'Jak odwołać lub zmienić termin wizyty?',
    a: 'Wizytami zarządzasz w sekcji „Moje wizyty". Znajdziesz tam szczegóły rezerwacji oraz opcje dostępne dla danej wizyty.',
  },
  {
    id: 'my-data',
    q: 'Gdzie sprawdzę i pobiorę swoje dane?',
    a: 'Twoje dane konta znajdziesz w sekcji „Dane konta". Możesz je tam przejrzeć, pobrać (eksport) lub złożyć wniosek o usunięcie konta.',
  },
  {
    id: 'no-results',
    q: 'Co zrobić, gdy nie widzę wolnych terminów?',
    a: 'Zmień filtry (np. formę wizyty lub miasto) albo sprawdź inny termin. Jeśli specjalista nie ma wolnych terminów, spróbuj wybrać innego specjalistę o zbliżonej specjalizacji.',
  },
];

const SPECIALIST_FAQS: readonly Faq[] = [
  {
    id: 'join',
    q: 'Jak dołączyć jako specjalista?',
    a: 'Załóż konto specjalisty i podaj numer PWZ oraz rejestr zawodowy (KRL lub KIF). Po weryfikacji uprawnień opublikujesz profil.',
  },
  {
    id: 'pwz',
    q: 'Na czym polega weryfikacja PWZ?',
    a: 'Numer prawa wykonywania zawodu sprawdzamy w rejestrze. W razie potrzeby zgłoszenie trafia do weryfikacji ręcznej, zanim profil stanie się widoczny dla pacjentów.',
  },
  {
    id: 'subscription',
    q: 'Czy płacę prowizję od wizyt?',
    a: 'Nie. Model jest subskrypcyjny — płacisz stałą opłatę za wybrany okres rozliczeniowy, niezależnie od liczby wizyt.',
  },
  {
    id: 'calendar',
    q: 'Jak ustawić grafik i dostępność?',
    a: 'W panelu specjalisty ustawiasz godziny pracy, blokady oraz tryb wizyt (online lub w gabinecie). Pacjenci widzą tylko wolne terminy.',
  },
  {
    id: 'services',
    q: 'Jak dodać usługi i ceny?',
    a: 'Usługi i ich ceny konfigurujesz w panelu. Cena widoczna przy usłudze jest tą, którą pacjent zobaczy podczas rezerwacji.',
  },
  {
    id: 'golive',
    q: 'Kiedy mój profil stanie się widoczny?',
    a: 'Po pozytywnej weryfikacji publikujesz profil (go-live). Dopiero opublikowany profil pojawia się w wyszukiwarce.',
  },
  {
    id: 'change-plan',
    q: 'Czy mogę zmienić plan subskrypcji?',
    a: 'Tak. Plan zmienisz w panelu specjalisty — zmiana obowiązuje od kolejnego okresu rozliczeniowego.',
  },
];

/** Pojedynczy element FAQ jako dostępny `<details>`/`<summary>`. */
function FaqItem({ faq }: { faq: Faq }) {
  return (
    <details className="group rounded-xl2 border border-slate-200/70 bg-white p-4 shadow-card">
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
  );
}

interface QuickLink {
  readonly href: string;
  readonly label: string;
  readonly desc: string;
}

const QUICK_LINKS: readonly QuickLink[] = [
  {
    href: '/szukaj',
    label: 'Znajdź specjalistę',
    desc: 'Przejdź do wyszukiwarki i przefiltruj profile.',
  },
  {
    href: '/dla-specjalistow',
    label: 'Dla specjalistów',
    desc: 'Sprawdź, jak dołączyć i prowadzić praktykę.',
  },
  {
    href: '/kontakt',
    label: 'Kontakt',
    desc: 'Nie znalazłeś odpowiedzi? Napisz do nas.',
  },
];

export default function PomocPage() {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      {/* ============================= HERO ============================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-6 shadow-card md:p-8">
        <Dots className="pointer-events-none absolute -right-3 -top-3 hidden h-24 w-24 text-brand-200 md:block" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Centrum pomocy
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Pomoc i najczęstsze pytania
            </h1>
            <p className="max-w-xl text-sm text-ink-muted md:text-base">
              Odpowiedzi na pytania pacjentów i specjalistów. To treści
              demonstracyjne (mock) — serwis działa na zamockowanym backendzie
              (MSW), a dane są wyłącznie poglądowe.
            </p>
          </div>
          <EmptyResults className="hidden h-28 w-28 shrink-0 sm:block lg:h-32 lg:w-32" />
        </div>
      </section>

      {/* ========================= SKRÓTY / LINKI ====================== */}
      <section aria-labelledby="quick-heading" className="flex flex-col gap-3">
        <h2 id="quick-heading" className="sr-only">
          Szybkie odnośniki
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full min-h-[2.75rem] flex-col gap-1 rounded-xl2 border border-slate-200/70 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <span className="text-sm font-semibold text-brand-700">
                  {item.label}
                </span>
                <span className="text-sm text-ink-muted">{item.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ======================== DLA PACJENTÓW ======================== */}
      <section aria-labelledby="patients-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2
            id="patients-heading"
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Dla pacjentów
          </h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Wyszukiwanie specjalisty, rezerwacja terminu i zarządzanie wizytami.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {PATIENT_FAQS.map((faq) => (
            <FaqItem key={faq.id} faq={faq} />
          ))}
        </div>
      </section>

      {/* ======================= DLA SPECJALISTÓW ====================== */}
      <section aria-labelledby="specialists-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2
            id="specialists-heading"
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Dla specjalistów
          </h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Dołączenie, weryfikacja PWZ, subskrypcja i prowadzenie praktyki.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {SPECIALIST_FAQS.map((faq) => (
            <FaqItem key={faq.id} faq={faq} />
          ))}
        </div>
      </section>

      {/* ============================= CTA ============================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 to-surface-muted p-6 md:p-10">
        <div className="flex flex-col gap-4 md:max-w-lg">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Nie znalazłeś odpowiedzi?
          </h2>
          <p className="text-base text-ink-muted">
            Napisz do nas przez formularz kontaktowy albo wróć do wyszukiwarki
            specjalistów.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/kontakt" className={linkPrimary}>
              Przejdź do kontaktu
            </Link>
            <Link href="/szukaj" className={linkOutline}>
              Znajdź specjalistę
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
