import Link from 'next/link';
import type { ReactNode } from 'react';
import { UserMenu } from '@/components/auth/UserMenu';

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: readonly NavLink[] = [
  { href: '/szukaj', label: 'Szukaj' },
  { href: '/moje-wizyty', label: 'Moje wizyty' },
  { href: '/panel', label: 'Panel specjalisty' },
  { href: '/admin', label: 'Back office' },
];

interface FooterLink {
  href: string;
  label: string;
}

interface FooterColumn {
  heading: string;
  links: readonly FooterLink[];
}

/** Kolumny linków w stopce (grupy tras). Etykiety PL, ścieżki z prefiksem „/". */
const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'Pacjent',
    links: [
      { href: '/szukaj', label: 'Szukaj' },
      { href: '/moje-wizyty', label: 'Moje wizyty' },
      { href: '/pomoc', label: 'Pomoc' },
    ],
  },
  {
    heading: 'Specjalista',
    links: [
      { href: '/dla-specjalistow', label: 'Dla specjalistów' },
      { href: '/rejestracja-specjalisty', label: 'Załóż konto' },
      { href: '/panel', label: 'Panel' },
    ],
  },
  {
    heading: 'Platforma',
    links: [
      { href: '/o-nas', label: 'O nas' },
      { href: '/kontakt', label: 'Kontakt' },
      { href: '/admin', label: 'Back office' },
    ],
  },
  {
    heading: 'Prawne',
    links: [
      { href: '/regulamin', label: 'Regulamin' },
      { href: '/prywatnosc', label: 'Prywatność' },
    ],
  },
];

function Logo() {
  return (
    <Link
      href="/"
      aria-label="ZnanyPsycholog — strona główna"
      className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl2 bg-brand-700 text-white"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4.4 3.3A1 1 0 0 1 3 19.5V6a2 2 0 0 1 2-2z" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-brand-700">
        ZnanyPsycholog
      </span>
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

/**
 * Powłoka aplikacji (search-first): sticky top-bar z logo, globalną
 * wyszukiwarką (form GET → /szukaj) i nawigacją do grup tras. Poniżej treść
 * strony i prosta stopka. Server component — bez JS do działania wyszukiwarki.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center justify-between">
            <Logo />
          </div>

          <form
            action="/szukaj"
            role="search"
            className="relative order-3 w-full flex-1 lg:order-2"
          >
            <label htmlFor="global-search" className="sr-only">
              Szukaj psychologa, specjalizacji, miasta
            </label>
            <SearchIcon />
            <input
              id="global-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Szukaj psychologa, specjalizacji, miasta…"
              className="h-11 w-full rounded-xl2 border border-slate-200 bg-surface-muted pl-10 pr-4 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500"
            />
          </form>

          <nav
            aria-label="Nawigacja główna"
            className="order-2 -mx-1 flex items-center gap-1 overflow-x-auto px-1 lg:order-3 lg:mx-0 lg:overflow-visible lg:px-0"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Menu użytkownika (klient) — stan zalogowania / logowanie / rejestracja */}
          <div className="order-1 flex items-center justify-end lg:order-4">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <nav
            aria-label="Stopka"
            className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4"
          >
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading} className="flex flex-col">
                <h2 className="text-sm font-semibold text-ink">
                  {column.heading}
                </h2>
                <ul className="mt-1 flex flex-col">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-[2.75rem] items-center rounded-md text-sm text-ink-muted transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-8 border-t border-slate-100 pt-6 text-sm text-ink-subtle">
            <p>
              ZnanyPsycholog — demo front-endu na zamockowanym backendzie (MSW).
              Dane wyłącznie poglądowe.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
