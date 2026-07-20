'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { Booking } from '@/domain';
import { Card, CardContent } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { BookingSuccess } from '@/components/illustrations';
import { BookingStateBadge } from './BookingStateBadge';

export interface ConfirmationClientProps {
  id: string;
}

type Status = 'loading' | 'error' | 'notFound' | 'success';

const TZ = 'Europe/Warsaw';
const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TZ,
});
const timeFmt = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${dateFmt.format(date)}, godz. ${timeFmt.format(date)}`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-ink-subtle">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

export function ConfirmationClient({ id }: ConfirmationClientProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    (async () => {
      try {
        const res = await apiClient.get<Booking>('/api/bookings/' + encodeURIComponent(id));
        if (!active) return;
        if (res.status === 404) {
          setStatus('notFound');
          return;
        }
        if (res.status !== 200) {
          setStatus('error');
          return;
        }
        setBooking(res.data);
        setStatus('success');
      } catch {
        if (active) setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-xl animate-pulse" aria-hidden="true">
        <div className="h-64 rounded-xl2 bg-surface-subtle" />
      </div>
    );
  }

  if (status === 'notFound') {
    return (
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h1 className="text-xl font-semibold text-ink">Nie znaleziono rezerwacji</h1>
            <p className="text-sm text-ink-muted">
              Nie znaleziono rezerwacji o podanym identyfikatorze. Dane mocka resetują
              się przy odświeżeniu strony — wróć do profilu i umów wizytę ponownie.
            </p>
            <Link
              href="/szukaj"
              className="inline-flex h-11 items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              Wróć do wyszukiwarki
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error' || !booking) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h1 className="text-xl font-semibold text-ink">Nie udało się wczytać rezerwacji</h1>
            <p className="text-sm text-ink-muted">
              Wystąpił problem z połączeniem z zamockowanym backendem. Spróbuj ponownie
              za chwilę.
            </p>
            <Link
              href="/szukaj"
              className="inline-flex h-11 items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              Wróć do wyszukiwarki
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <BookingSuccess className="h-32 w-32" />
            <h1 className="text-2xl font-bold text-ink">Rezerwacja potwierdzona</h1>
            <BookingStateBadge state={booking.state} />
            <p className="text-sm text-ink-muted">
              Dziękujemy. Wizyta została umówiona — szczegóły znajdziesz poniżej.
            </p>
          </div>

          <div className="flex flex-col divide-y divide-slate-200/70 rounded-xl2 border border-slate-200/70 bg-surface-muted px-4">
            <SummaryRow label="Pacjent" value={booking.patientName} />
            <SummaryRow label="Termin" value={formatDateTime(booking.startsAt)} />
            <SummaryRow label="Cena" value={`${booking.pricePln} zł`} />
            <SummaryRow label="Numer rezerwacji" value={booking.id} />
          </div>

          <div className="rounded-xl2 border border-brand-200 bg-brand-50/60 p-4">
            <h2 className="text-sm font-semibold text-brand-800">Zarządzanie wizytą</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Wizytą zarządzasz samodzielnie — potwierdzenie i przypomnienie
              otrzymasz na podany adres e-mail. Odwołanie lub zmianę terminu
              znajdziesz w panelu „Moje wizyty&rdquo;.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="text-ink-subtle">
                Odwołaj wizytę <span className="italic">(wkrótce)</span>
              </span>
              <span className="text-ink-subtle">
                Zmień termin <span className="italic">(wkrótce)</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <BeBadge
              endpoint="GET /api/bookings/:id"
              desc="Rezerwacja odczytana z zamockowanego backendu (MSW)."
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/moje-wizyty"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              Moje wizyty
            </Link>
            <Link
              href="/szukaj"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl2 border border-brand-600 bg-white px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              Szukaj dalej
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
