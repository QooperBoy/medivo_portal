/**
 * Globalny 404 (App Router) — renderowany wewnątrz AppShell.
 *
 * Server component: estetyczny pusty stan z ilustracją, nagłówkiem oraz
 * odnośnikami powrotu na stronę główną i do wyszukiwarki specjalistów.
 */
import Link from 'next/link';
import { EmptyResults } from '@/components/illustrations';
import { Dots, Sparkle } from '@/components/doodles';

const linkPrimary =
  'inline-flex min-h-[2.75rem] w-fit items-center justify-center gap-2 rounded-xl2 bg-brand-700 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800 active:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const linkOutline =
  'inline-flex min-h-[2.75rem] w-fit items-center justify-center gap-2 rounded-xl2 border border-brand-600 bg-white px-5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 active:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

export default function NotFound() {
  return (
    <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-6 shadow-card md:p-12">
      <Dots className="pointer-events-none absolute right-6 top-6 hidden h-16 w-16 text-brand-200 md:block" />

      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <EmptyResults className="w-full max-w-xs" />

        <div className="flex flex-col items-center gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            <Sparkle className="h-3.5 w-3.5 text-brand-600" />
            Błąd 404
          </span>

          <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Nie znaleziono strony
          </h1>

          <p className="max-w-md text-base text-ink-muted">
            Strona, której szukasz, nie istnieje lub została przeniesiona. Wróć na
            stronę główną albo poszukaj specjalisty w wyszukiwarce.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={linkPrimary}>
            Wróć na stronę główną
          </Link>
          <Link href="/szukaj" className={linkOutline}>
            Szukaj specjalisty
          </Link>
        </div>
      </div>
    </section>
  );
}
