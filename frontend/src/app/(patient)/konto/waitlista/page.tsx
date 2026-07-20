'use client';

/**
 * (patient) /konto/waitlista — lista oczekujących pacjenta (B4).
 *
 * Źródło danych: GET /api/patients/waitlist?email= (silnik G6). Dla każdego
 * wpisu pokazujemy specjalistę, status (Chip w kolorze zależnym od statusu),
 * datę zapisania (Intl, Europe/Warsaw) oraz link do profilu specjalisty.
 * Pusta lista → ilustracja i wyjaśnienie z odnośnikiem do wyszukiwarki.
 *
 * Uwaga: `WaitlistEntry` niesie `specialistId` i `specialistName`, ale nie slug
 * profilu, a trasa profilu to /profil/[slug]. Slug seedowany jest jako
 * slugify(imię nazwisko), więc link budujemy przez ten sam slugify z nazwy.
 *
 * Guard i nawigacja konta pochodzą z layoutu grupy (patient) — tu renderujemy
 * wyłącznie treść.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiClient } from '@/lib/api-client';
import type { WaitlistEntry, WaitlistResponse, WaitlistStatus } from '@/domain';
import { Avatar, Button, Card, CardContent, Chip } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { EmptyResults } from '@/components/illustrations';

const WAITLIST_PATH = '/api/patients/waitlist';

/** Etykieta i kolor Chipa dla statusu wpisu na waitliście (G6). */
const STATUS_META: Record<WaitlistStatus, { label: string; className: string }> = {
  active: { label: 'Oczekuje', className: 'bg-brand-50 text-brand-800' },
  offered: { label: 'Zaproponowano termin', className: 'bg-warning-100 text-warning-700' },
  booked: { label: 'Zarezerwowano', className: 'bg-success-600 text-white' },
  expired: { label: 'Wygasł', className: 'bg-surface-subtle text-ink-subtle' },
};

const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Warsaw',
});
const timeFmt = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Warsaw',
});

function formatJoinedAt(iso: string): string {
  const date = new Date(iso);
  return `${dateFmt.format(date)}, godz. ${timeFmt.format(date)}`;
}

/** Mapa polskich znaków diakrytycznych → ASCII (dla slugów; spójna z domeną). */
const PL_DIACRITICS: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

/** kebab-case slug z polskiego tekstu (mirror slugify z warstwy mocka). */
function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => PL_DIACRITICS[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: WaitlistEntry[] };

export default function WaitlistaPage() {
  const { user } = useAuth();
  // Guard i nawigacja są w layoucie grupy (patient); tu user jest pacjentem.
  if (!user) return null;
  return <WaitlistSection email={user.email} />;
}

function WaitlistSection({ email }: { email: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void (async () => {
      try {
        const res = await apiClient.get<WaitlistResponse>(
          `${WAITLIST_PATH}?email=${encodeURIComponent(email)}`,
        );
        if (!active) return;
        if (res.status === 200) {
          setState({ status: 'ready', items: res.data.items });
        } else {
          setState({ status: 'error' });
        }
      } catch {
        if (active) setState({ status: 'error' });
      }
    })();
    return () => {
      active = false;
    };
  }, [email, reloadKey]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-ink">Lista oczekujących</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          Twoje zapisy „daj znać o wolnym terminie”. Gdy u specjalisty zwolni się
          termin, powiadomimy Cię o nim (silnik G6).
        </p>
        <BeBadge
          endpoint="GET /api/patients/waitlist"
          desc="Wpisy pacjenta na liście oczekujących (silnik G6). Dane z zamockowanego backendu (MSW)."
          className="self-start"
        />
      </header>

      {state.status === 'loading' && <WaitlistSkeleton />}

      {state.status === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-xl2 border border-danger-200 bg-danger-50 p-8 text-center"
        >
          <p className="text-sm text-danger-700">
            Nie udało się wczytać listy oczekujących.
          </p>
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {state.status === 'ready' &&
        (state.items.length === 0 ? (
          <EmptyWaitlist />
        ) : (
          <ul className="flex flex-col gap-3">
            {state.items.map((entry) => (
              <li key={entry.id}>
                <WaitlistRow entry={entry} />
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

function WaitlistRow({ entry }: { entry: WaitlistEntry }) {
  const meta = STATUS_META[entry.status];
  const profileHref = `/profil/${slugifyName(entry.specialistName)}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar alt={entry.specialistName} size={48} />
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-ink">
                {entry.specialistName}
              </span>
              <Chip className={meta.className}>{meta.label}</Chip>
            </div>
            <span className="text-sm text-ink-subtle">
              Zapisano: {formatJoinedAt(entry.createdAt)}
            </span>
            {entry.serviceId && (
              <span className="text-xs text-ink-subtle">
                Dotyczy wybranej usługi.
              </span>
            )}
          </div>
        </div>

        <Link href={profileHref} className="shrink-0 self-start sm:self-center">
          <Button variant="outline">Zobacz profil</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function EmptyWaitlist() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl2 border border-slate-200/70 bg-white p-10 text-center shadow-card">
      <EmptyResults className="h-32 w-32" />
      <div className="flex max-w-xl flex-col gap-2">
        <h3 role="status" className="text-lg font-semibold text-ink">
          Nie jesteś na żadnej liście oczekujących
        </h3>
        <p className="text-sm text-ink-muted">
          Gdy specjalista nie ma wolnych terminów, możesz zapisać się na jego
          profilu — powiadomimy Cię o zwolnionym terminie (silnik G6).
        </p>
      </div>
      <Link href="/szukaj">
        <Button variant="primary" size="lg">
          Znajdź specjalistę
        </Button>
      </Link>
    </div>
  );
}

function WaitlistSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Wczytuję listę oczekujących…</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-24 animate-pulse rounded-xl2 bg-surface-subtle"
        />
      ))}
    </div>
  );
}
