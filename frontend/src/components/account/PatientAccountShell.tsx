'use client';

/**
 * Powłoka konta pacjenta (grupa B). Wymaga zalogowania jako pacjent; inaczej
 * pokazuje zachętę do logowania (z demo quick-login na /logowanie). Dostarcza
 * wspólny nagłówek i nawigację pod-ekranów konta.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui';

const TABS: readonly { href: string; label: string }[] = [
  { href: '/moje-wizyty', label: 'Moje wizyty' },
  { href: '/konto/powiadomienia', label: 'Powiadomienia' },
  { href: '/konto/dane', label: 'Moje dane' },
  { href: '/konto/waitlista', label: 'Lista oczekujących' },
];

export function PatientAccountShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-7 w-48 animate-pulse rounded bg-surface-subtle" />
        <div className="h-10 w-full max-w-md animate-pulse rounded-xl2 bg-surface-subtle" />
        <div className="h-64 w-full animate-pulse rounded-xl2 bg-surface-subtle" />
      </div>
    );
  }

  if (!user || user.role !== 'patient') {
    return (
      <div className="mx-auto max-w-lg rounded-xl2 border border-brand-100 bg-white p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-ink">Ta sekcja wymaga logowania</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Zaloguj się jako pacjent, aby zarządzać wizytami, powiadomieniami
          i swoimi danymi. W wersji demo możesz użyć szybkiego logowania.
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
          Konto pacjenta
        </span>
        <h1 className="text-2xl font-semibold text-ink">
          {user.firstName} {user.lastName}
        </h1>
      </div>

      <nav
        aria-label="Nawigacja konta pacjenta"
        className="-mx-1 flex items-center gap-1 overflow-x-auto rounded-xl2 bg-surface-subtle p-1"
      >
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
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
