'use client';

/**
 * (admin) /admin/uzytkownicy — Zarządzanie kontami (F5).
 *
 * Lista kont z filtrem po roli. Akcje blokady/odblokowania konta idą przez jawne
 * potwierdzenie (inline) — kont administratorów nie da się zablokować (akcja
 * ukryta). Po każdej akcji lista jest odświeżana (refetch). Obsługa stanów:
 * loading / error / empty / refreshing. Dane z zamockowanego backendu (MSW).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { AdminUsersResponse, AdminUserItem, User, UserRole } from '@/domain';
import { Avatar, Button, Chip } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { EmptyResults } from '@/components/illustrations';
import { cn } from '@/lib/utils';

type ListStatus = 'loading' | 'refreshing' | 'ready' | 'error';
type UserAction = 'block' | 'unblock';
type RoleFilter = 'all' | UserRole;

interface PendingConfirm {
  id: string;
  action: UserAction;
}

/** Data dołączenia — dzień, strefa Europe/Warsaw. */
const joinedFmt = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  dateStyle: 'medium',
});

function formatJoined(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? '—' : joinedFmt.format(ms);
}

const ROLE_CHIP: Record<UserRole, { label: string; className: string }> = {
  patient: { label: 'Pacjent', className: 'bg-surface-subtle text-ink-muted' },
  specialist: { label: 'Specjalista', className: 'bg-brand-50 text-brand-800' },
  admin: { label: 'Administrator', className: 'bg-warning-100 text-warning-700' },
};

const ROLE_FILTERS: readonly { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Wszyscy' },
  { value: 'patient', label: 'Pacjenci' },
  { value: 'specialist', label: 'Specjaliści' },
  { value: 'admin', label: 'Administratorzy' },
];

function fullName(user: AdminUserItem): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl2 border border-slate-200/70 bg-white p-4 shadow-card"
        >
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-surface-subtle" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-subtle" />
            <div className="h-3 w-56 animate-pulse rounded bg-surface-subtle" />
          </div>
          <div className="h-6 w-24 animate-pulse rounded-full bg-surface-subtle" />
          <div className="h-11 w-28 animate-pulse rounded-xl2 bg-surface-subtle" />
        </div>
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserItem[] | null>(null);
  const [status, setStatus] = useState<ListStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setStatus(hasDataRef.current ? 'refreshing' : 'loading');

    void (async () => {
      try {
        const res = await apiClient.get<AdminUsersResponse>('/api/admin/users');
        if (cancelled) return;
        if (res.status >= 400) {
          setStatus('error');
          return;
        }
        setItems(res.data.items);
        hasDataRef.current = true;
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const list = useMemo(() => items ?? [], [items]);

  const counts = useMemo<Record<RoleFilter, number>>(
    () => ({
      all: list.length,
      patient: list.filter((u) => u.role === 'patient').length,
      specialist: list.filter((u) => u.role === 'specialist').length,
      admin: list.filter((u) => u.role === 'admin').length,
    }),
    [list],
  );

  const filtered = useMemo(
    () =>
      roleFilter === 'all'
        ? list
        : list.filter((u) => u.role === roleFilter),
    [list, roleFilter],
  );

  async function runAction(id: string, action: UserAction) {
    setPending(true);
    setActionError(null);
    try {
      const path =
        action === 'block'
          ? `/api/admin/users/${id}/block`
          : `/api/admin/users/${id}/unblock`;
      const res = await apiClient.post<User>(path);
      if (res.status >= 400) {
        setActionError(
          res.status === 404
            ? 'Nie znaleziono konta — mogło zostać usunięte.'
            : 'Nie udało się wykonać akcji. Spróbuj ponownie.',
        );
        setPending(false);
        return;
      }
      setConfirm(null);
      setPending(false);
      reload();
    } catch {
      setActionError('Błąd połączenia z zamockowanym backendem.');
      setPending(false);
    }
  }

  function openConfirm(id: string, action: UserAction) {
    setActionError(null);
    setConfirm({ id, action });
  }

  function changeFilter(value: RoleFilter) {
    setRoleFilter(value);
    setConfirm(null);
    setActionError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Zarządzanie kontami · F5
          </span>
          <BeBadge
            endpoint="GET /api/admin/users"
            desc="Lista kont; akcje POST /block i /unblock"
          />
        </div>
        <h2 className="text-xl font-semibold text-ink">Użytkownicy</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          Konta pacjentów, specjalistów i administratorów. Blokada wstrzymuje
          dostęp do platformy — kont administratorów nie można zablokować.
        </p>
      </header>

      {/* Filtr po roli */}
      <div
        role="group"
        aria-label="Filtr po roli"
        className="inline-flex flex-wrap gap-1 self-start rounded-xl2 bg-surface-subtle p-1"
      >
        {ROLE_FILTERS.map((f) => {
          const active = roleFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => changeFilter(f.value)}
              className={cn(
                'inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                active
                  ? 'bg-white text-brand-800 shadow-sm'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {f.label}
              <span
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                  active ? 'bg-brand-50 text-brand-800' : 'bg-white text-ink-subtle',
                )}
              >
                {counts[f.value]}
              </span>
            </button>
          );
        })}
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700"
        >
          {actionError}
        </p>
      )}

      {status === 'loading' && <ListSkeleton />}

      {status === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-5"
        >
          <p className="text-sm font-medium text-danger-700">
            Nie udało się wczytać listy kont z zamockowanego backendu.
          </p>
          <Button type="button" variant="outline" onClick={reload}>
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {(status === 'ready' || status === 'refreshing') && (
        <>
          {status === 'refreshing' && (
            <p role="status" className="text-xs font-medium text-ink-subtle">
              Odświeżanie listy…
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-slate-200 bg-surface-muted px-6 py-12 text-center">
              <EmptyResults className="h-32 w-40" />
              <p className="text-base font-semibold text-ink">Brak kont</p>
              <p className="max-w-sm text-sm text-ink-muted">
                Dla wybranej roli nie ma kont do wyświetlenia.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl2 border border-slate-200/70 bg-white shadow-card">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <caption className="sr-only">
                  Lista kont użytkowników z rolą, statusem i akcjami blokady.
                </caption>
                <thead>
                  <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-ink-subtle">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Użytkownik
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Rola
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Dołączenie
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => {
                    const role = ROLE_CHIP[user.role];
                    const isConfirming = confirm?.id === user.id;
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-slate-100 last:border-0 align-middle"
                      >
                        <th scope="row" className="px-4 py-3 text-left font-normal">
                          <div className="flex items-center gap-3">
                            <Avatar alt={fullName(user)} size={40} />
                            <div className="flex flex-col">
                              <span className="font-medium text-ink">
                                {fullName(user)}
                              </span>
                              <span className="text-xs text-ink-subtle">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </th>
                        <td className="px-4 py-3">
                          <Chip className={role.className}>{role.label}</Chip>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                          {formatJoined(user.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {user.blocked ? (
                            <Chip className="bg-danger-100 text-danger-700">
                              Zablokowane
                            </Chip>
                          ) : (
                            <Chip className="bg-success-100 text-success-700">
                              Aktywne
                            </Chip>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {user.role === 'admin' ? (
                              <span className="text-xs text-ink-subtle">
                                Brak akcji
                              </span>
                            ) : isConfirming && confirm ? (
                              <div className="flex flex-col items-end gap-2">
                                <span className="text-xs font-medium text-ink">
                                  {confirm.action === 'block'
                                    ? 'Zablokować konto?'
                                    : 'Odblokować konto?'}
                                </span>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={
                                      confirm.action === 'block'
                                        ? 'danger'
                                        : 'primary'
                                    }
                                    loading={pending}
                                    onClick={() =>
                                      runAction(user.id, confirm.action)
                                    }
                                  >
                                    {confirm.action === 'block'
                                      ? 'Tak, zablokuj'
                                      : 'Tak, odblokuj'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={pending}
                                    onClick={() => setConfirm(null)}
                                  >
                                    Anuluj
                                  </Button>
                                </div>
                              </div>
                            ) : user.blocked ? (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => openConfirm(user.id, 'unblock')}
                              >
                                Odblokuj
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                className="border-danger-200 text-danger-700 hover:bg-danger-50 active:bg-danger-100"
                                onClick={() => openConfirm(user.id, 'block')}
                              >
                                Zablokuj
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
