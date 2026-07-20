'use client';

/**
 * UserMenu — element topbaru reagujący na stan zalogowania.
 *
 *  - niezalogowany: linki „Zaloguj się" i „Załóż konto",
 *  - zalogowany: awatar + imię i rozwijane menu (dropdown) z linkiem zależnym od
 *    roli oraz „Wyloguj".
 *
 * Dropdown jest dostępny: `aria-haspopup`/`aria-expanded`, zamknięcie klawiszem
 * Escape (z powrotem fokusu na przycisk), klikiem poza obszarem i przy utracie
 * fokusu (Tab poza menu). Elementy interaktywne mają ≥44px wysokości.
 */

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/domain';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuth, homePathForRole } from '@/components/auth/AuthProvider';

const signInLinkClass =
  'inline-flex min-h-[2.75rem] items-center justify-center rounded-xl2 px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const signUpLinkClass =
  'inline-flex min-h-[2.75rem] items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800 active:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const triggerClass =
  'inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl2 border border-slate-200 bg-white px-2 pr-3 text-sm transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const menuItemClass =
  'flex min-h-[2.75rem] w-full items-center rounded-lg px-3 text-sm font-medium text-ink transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

const menuItemDangerClass =
  'flex min-h-[2.75rem] w-full items-center rounded-lg px-3 text-left text-sm font-medium text-danger-700 transition-colors hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600';

/** Etykieta linku do „strony domowej" zależna od roli. */
function roleLinkLabel(role: UserRole): string {
  switch (role) {
    case 'specialist':
      return 'Panel';
    case 'admin':
      return 'Back office';
    case 'patient':
    default:
      return 'Moje wizyty';
  }
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function UserMenu() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Zamknięcie klikiem poza obszarem oraz klawiszem Escape (tylko gdy otwarte).
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Szkielet w trakcie odczytu sesji — stabilny między SSR a hydracją.
  if (loading) {
    return (
      <div
        className="h-11 w-28 animate-pulse rounded-xl2 bg-surface-subtle"
        aria-hidden="true"
      />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/logowanie" className={signInLinkClass}>
          Zaloguj się
        </Link>
        <Link href="/rejestracja" className={signUpLinkClass}>
          Załóż konto
        </Link>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/');
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={triggerClass}
      >
        <Avatar src={null} alt={fullName} size={32} />
        <span className="hidden max-w-[10rem] truncate font-medium text-ink sm:inline">
          {user.firstName}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-ink-subtle transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Menu użytkownika"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl2 border border-slate-200/70 bg-white p-1 shadow-card-hover"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
            <p className="truncate text-xs text-ink-subtle">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-slate-100" role="none" />
          <Link
            href={homePathForRole(user.role)}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={menuItemClass}
          >
            {roleLinkLabel(user.role)}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className={menuItemDangerClass}
          >
            Wyloguj
          </button>
        </div>
      )}
    </div>
  );
}
