'use client';

/**
 * Pod-nawigacja panelu specjalisty (E1 pulpit / E4 rezerwacje / E2 grafik /
 * E3 usługi). Aktywna zakładka wyliczana z `usePathname`.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PanelTab {
  href: string;
  label: string;
  /** true = dopasowanie dokładne (pulpit); inaczej prefiksowe. */
  exact?: boolean;
}

const TABS: readonly PanelTab[] = [
  { href: '/panel', label: 'Pulpit', exact: true },
  { href: '/panel/rezerwacje', label: 'Rezerwacje' },
  { href: '/panel/grafik', label: 'Grafik' },
  { href: '/panel/uslugi', label: 'Usługi i ceny' },
  { href: '/panel/statystyki', label: 'Statystyki' },
  { href: '/panel/urlop', label: 'Urlop' },
  { href: '/panel/subskrypcja', label: 'Subskrypcja' },
  { href: '/panel/ustawienia', label: 'Ustawienia' },
  { href: '/panel/weryfikacja', label: 'Weryfikacja' },
];

export function PanelNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Nawigacja panelu specjalisty"
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
  );
}
