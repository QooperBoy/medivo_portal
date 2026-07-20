'use client';

/**
 * Powłoka back office (grupa F). Wymaga zalogowania jako admin; inaczej pokazuje
 * zachętę do logowania (demo quick-login na /logowanie). Wspólny nagłówek + nawigacja.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui';

const TABS: readonly { href: string; label: string; exact?: boolean }[] = [
  { href: '/admin', label: 'Pulpit', exact: true },
  { href: '/admin/weryfikacje', label: 'Weryfikacje PWZ' },
  { href: '/admin/opinie', label: 'Opinie' },
  { href: '/admin/spory', label: 'Spory' },
  { href: '/admin/uzytkownicy', label: 'Użytkownicy' },
  { href: '/admin/naduzycia', label: 'Nadużycia' },
  { href: '/admin/audyt', label: 'Audyt' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-7 w-56 animate-pulse rounded bg-surface-subtle" />
        <div className="h-10 w-full max-w-2xl animate-pulse rounded-xl2 bg-surface-subtle" />
        <div className="h-64 w-full animate-pulse rounded-xl2 bg-surface-subtle" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg rounded-xl2 border border-brand-100 bg-white p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-ink">Back office — dostęp dla administratora</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Ta sekcja wymaga logowania jako administrator platformy. W wersji demo
          użyj szybkiego logowania („Admin&rdquo;) na ekranie logowania.
        </p>
        <div className="mt-5">
          <Link href="/logowanie">
            <Button size="lg">Przejdź do logowania</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
          Back office
        </span>
        <h1 className="text-2xl font-semibold text-ink">Panel administratora</h1>
      </div>

      <nav
        aria-label="Nawigacja back office"
        className="-mx-1 flex items-center gap-1 overflow-x-auto rounded-xl2 bg-surface-subtle p-1"
      >
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                active
                  ? 'bg-white text-brand-800 shadow-sm'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
