'use client';

/**
 * AddSlotForm (E2) — dodanie pojedynczego terminu do grafiku.
 *
 * Data + godzina są interpretowane w strefie `Europe/Warsaw` i składane w
 * poprawny instant UTC (ISO 8601), niezależnie od strefy przeglądarki. Koniec
 * slotu = początek + wybrana długość. Po sukcesie czyści pola i woła `onAdded`.
 */

import { useId, useMemo, useState, type FormEvent } from 'react';
import type { AddSlotBody, Slot, SlotMode } from '@/domain';
import { apiClient } from '@/lib/api-client';
import { Button, Card, CardContent } from '@/components/ui';

export interface AddSlotFormProps {
  specialistId: string;
  /** Wołane po dodaniu terminu (odświeżenie grafiku w rodzicu). */
  onAdded: () => void;
}

const TZ = 'Europe/Warsaw';

/** Długości terminu do wyboru (minuty). */
const DURATIONS = [30, 45, 50, 60, 90] as const;

const FIELD_CLASS =
  'h-11 w-full rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

/** Offset strefy (ms) dla podanego instantu UTC w strefie IANA. */
function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') map[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour,
    map.minute,
    map.second,
  );
  return asUtc - utcMs;
}

/** Zamienia ścianę zegara (data + godzina) w danej strefie na instant UTC (ms). */
function zonedWallTimeToUtcMs(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offset = timeZoneOffsetMs(guess, timeZone);
  return guess - offset;
}

/** Bezpieczne zawężenie wartości selecta do trybu slotu. */
function parseSlotMode(value: string): SlotMode {
  return value === 'stacjonarnie' ? 'stacjonarnie' : 'online';
}

export function AddSlotForm({ specialistId, onAdded }: AddSlotFormProps) {
  const dateId = useId();
  const timeId = useId();
  const durationId = useId();
  const modeId = useId();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMin, setDurationMin] = useState<number>(50);
  const [mode, setMode] = useState<SlotMode>('online');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Dolna granica pola daty = dzisiaj wg strefy Europe/Warsaw (YYYY-MM-DD).
  const todayIso = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: TZ,
      }).format(new Date()),
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!date || !time) {
      setError('Podaj datę i godzinę terminu.');
      return;
    }

    const startsMs = zonedWallTimeToUtcMs(date, time, TZ);
    if (!Number.isFinite(startsMs)) {
      setError('Nieprawidłowa data lub godzina.');
      return;
    }
    if (startsMs <= Date.now()) {
      setError('Wybierz termin w przyszłości.');
      return;
    }

    const body: AddSlotBody = {
      startsAt: new Date(startsMs).toISOString(),
      endsAt: new Date(startsMs + durationMin * 60 * 1000).toISOString(),
      mode,
    };

    setSubmitting(true);
    try {
      const res = await apiClient.post<Slot>(
        `/api/specialists/${specialistId}/slots`,
        body,
      );
      if (res.status === 201 || res.status === 200) {
        setDate('');
        setTime('');
        setDurationMin(50);
        setMode('online');
        onAdded();
      } else {
        setError(`Nie udało się dodać terminu (kod ${res.status}).`);
      }
    } catch {
      setError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">Dodaj termin</h2>
          <p className="text-sm text-ink-muted">
            Nowy termin pojawi się w grafiku jako wolny — pacjenci będą mogli go
            zarezerwować.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={dateId} className="text-sm font-medium text-ink">
                Data
              </label>
              <input
                id={dateId}
                type="date"
                min={todayIso}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={timeId} className="text-sm font-medium text-ink">
                Godzina
              </label>
              <input
                id={timeId}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={durationId} className="text-sm font-medium text-ink">
                Długość
              </label>
              <select
                id={durationId}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className={FIELD_CLASS}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={modeId} className="text-sm font-medium text-ink">
                Tryb
              </label>
              <select
                id={modeId}
                value={mode}
                onChange={(e) => setMode(parseSlotMode(e.target.value))}
                className={FIELD_CLASS}
              >
                <option value="online">Online</option>
                <option value="stacjonarnie">Stacjonarnie</option>
              </select>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={submitting}>
              Dodaj termin
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
