'use client';

/**
 * WaitlistJoinCard — ścieżka „brak terminów" (A8): zapis na listę oczekujących
 * (B4/G6) prezentowany w stanie „brak wolnych terminów" na profilu specjalisty.
 *
 * Karta pokazuje komunikat o braku terminów i formularz zapisu (imię i nazwisko,
 * e-mail — prefill z sesji zalogowanego pacjenta). Submit woła `POST /api/waitlist`
 * (silnik G6-waitlist). Po sukcesie prezentujemy potwierdzenie z linkiem do listy
 * oczekujących w koncie pacjenta. Każde żądanie loguje się w BE Inspectorze.
 */

import { useEffect, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { JoinWaitlistBody, WaitlistEntry } from '@/domain';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button, Card, CardContent } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { EmptySlots } from '@/components/illustrations';
import { Leaf } from '@/components/doodles';

export interface WaitlistJoinCardProps {
  specialistId: string;
  specialistName: string;
  /** Usługa, której dotyczy oczekiwanie (opcjonalnie). */
  serviceId?: string;
}

interface FormErrors {
  name?: string;
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Wspólne klasy pól formularza (44px wysokości — dotykowo). */
const inputClass =
  'h-11 rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

function validate(name: string, email: string): FormErrors {
  const errors: FormErrors = {};
  if (name.trim().length < 2) {
    errors.name = 'Podaj imię i nazwisko.';
  }
  if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Podaj poprawny adres e-mail.';
  }
  return errors;
}

/** Dekoracyjny listek w rogu karty (akcent marki). */
function CornerLeaf() {
  return (
    <Leaf className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rotate-12 opacity-70" />
  );
}

export function WaitlistJoinCard({
  specialistId,
  specialistName,
  serviceId,
}: WaitlistJoinCardProps) {
  const { user } = useAuth();
  const fieldId = useId();
  const nameId = `${fieldId}-name`;
  const emailId = `${fieldId}-email`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);

  // Prefill danych zalogowanego pacjenta (sesja wczytuje się po zamontowaniu).
  // Uzupełniamy tylko puste pola, by nie nadpisać tego, co pacjent już wpisał.
  useEffect(() => {
    if (!user) return;
    setName((prev) => (prev.trim() ? prev : `${user.firstName} ${user.lastName}`.trim()));
    setEmail((prev) => (prev.trim() ? prev : user.email));
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(name, email);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const body: JoinWaitlistBody = {
      specialistId,
      patientName: name.trim(),
      patientEmail: email.trim(),
      ...(serviceId ? { serviceId } : {}),
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiClient.post<WaitlistEntry>('/api/waitlist', body);
      if (res.status === 201) {
        setEntry(res.data);
      } else {
        setSubmitError('Nie udało się zapisać na listę oczekujących. Spróbuj ponownie.');
      }
    } catch {
      setSubmitError('Błąd połączenia z serwerem. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  }

  // Stan po sukcesie — potwierdzenie z linkiem do listy oczekujących (konto B4).
  if (entry) {
    return (
      <Card className="relative overflow-hidden border-brand-100 bg-brand-50/40">
        <CornerLeaf />
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center sm:items-start sm:text-left">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <h3 className="text-base font-semibold text-ink">Zapisano na listę oczekujących</h3>
          <p className="max-w-prose text-sm text-ink-muted">
            Powiadomimy Cię e-mailem, gdy u {specialistName} zwolni się termin
            (silnik G6). Swój wpis znajdziesz w koncie pacjenta.
          </p>
          <Link
            href="/konto/waitlista"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Zobacz listę oczekujących
          </Link>
          <BeBadge
            endpoint="POST /api/waitlist"
            desc="Zapis na listę oczekujących obsłużony przez silnik G6-waitlist (nagłówek x-engine)."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-brand-100 bg-brand-50/40">
      <CornerLeaf />
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
          <EmptySlots className="h-24 w-24 shrink-0" />
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold text-ink">
              Brak wolnych terminów u {specialistName}
            </h3>
            <p className="text-sm text-ink-muted">
              Zapisz się na listę oczekujących — powiadomimy Cię o zwolnionym
              terminie (silnik G6).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className="text-sm font-medium text-ink">
                Imię i nazwisko
              </label>
              <input
                id={nameId}
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${nameId}-error` : undefined}
                className={inputClass}
              />
              {errors.name && (
                <p id={`${nameId}-error`} className="text-xs text-danger-600">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={emailId} className="text-sm font-medium text-ink">
                Adres e-mail
              </label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? `${emailId}-error` : undefined}
                className={inputClass}
              />
              {errors.email && (
                <p id={`${emailId}-error`} className="text-xs text-danger-600">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"
            >
              {submitError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <BeBadge
              endpoint="POST /api/waitlist"
              desc="Zapis na listę oczekujących obsługuje silnik G6-waitlist (nagłówek x-engine)."
            />
            <Button type="submit" variant="primary" loading={submitting}>
              Zapisz się na listę
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
