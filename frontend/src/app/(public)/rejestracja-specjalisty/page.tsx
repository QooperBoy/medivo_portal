'use client';

/**
 * (public) /rejestracja-specjalisty — rejestracja specjalisty (C3 → D1).
 *
 * Formularz (imię, nazwisko, e-mail, telefon, hasło, numer PWZ, rejestr KRL/KIF,
 * tytuł zawodowy + wymagane zgody) z walidacją po stronie klienta woła
 * `POST /api/auth/register/specialist`. Po sukcesie (201) pobiera stan
 * weryfikacji z `GET /api/specialists/{id}/verification` i pokazuje ekran
 * „Konto założone — trwa weryfikacja PWZ" (stan początkowy: `weryfikacja_auto`).
 *
 * 409 → informacja, że konto istnieje, + link do logowania. 400 → komunikat
 * walidacji. Żądania są widoczne w panelu BE Inspector (mock MSW).
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  AUTH_ENDPOINTS,
  ONBOARDING_ENDPOINTS,
  ProfessionalRegistry,
  VerificationState,
  type RegisterSpecialistBody,
  type Session,
  type SpecialistTitle,
  type Verification,
} from '@/domain';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { ShieldCheck, BookingSuccess } from '@/components/illustrations';
import { Sparkle, Squiggle, Leaf } from '@/components/doodles';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Stałe / helpery
 * ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Format numeru PWZ: ciąg 5–9 cyfr (walidacja poglądowa, mock nie sprawdza formatu). */
const PWZ_RE = /^\d{5,9}$/;

const inputClass =
  'h-11 w-full rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

const selectClass = cn(inputClass, 'cursor-pointer appearance-none pr-9');

const ctaBase =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl2 px-6 text-base font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const ctaVariant: Record<'primary' | 'outline', string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  outline:
    'border border-brand-600 bg-white text-brand-700 hover:bg-brand-50 active:bg-brand-100',
};

/** Etykiety rejestrów zawodowych (KRL/KIF). */
const REGISTRY_LABELS: Record<ProfessionalRegistry, string> = {
  [ProfessionalRegistry.KRL]: 'KRL — Krajowy Rejestr Logopedów',
  [ProfessionalRegistry.KIF]: 'KIF — Krajowa Izba Fizjoterapeutów',
};

const REGISTRY_OPTIONS: readonly ProfessionalRegistry[] = [
  ProfessionalRegistry.KRL,
  ProfessionalRegistry.KIF,
];

const TITLE_OPTIONS: readonly { value: SpecialistTitle; label: string }[] = [
  { value: 'psycholog', label: 'Psycholog' },
  { value: 'psychoterapeuta', label: 'Psychoterapeuta' },
  { value: 'psychotraumatolog', label: 'Psychotraumatolog' },
];

/** Czytelne etykiety stanów weryfikacji (do ekranu sukcesu). */
const VERIFICATION_LABELS: Record<VerificationState, string> = {
  [VerificationState.Zarejestrowany]: 'Zarejestrowany',
  [VerificationState.WeryfikacjaAuto]: 'Weryfikacja automatyczna',
  [VerificationState.WeryfikacjaReczna]: 'Weryfikacja ręczna',
  [VerificationState.Zweryfikowany]: 'Zweryfikowany',
  [VerificationState.Odrzucony]: 'Odrzucony',
  [VerificationState.Opublikowany]: 'Opublikowany',
};

/** Ścieżka odczytu weryfikacji dla danego specjalisty. */
function verificationPath(specialistId: string): string {
  return ONBOARDING_ENDPOINTS.getVerification.path.replace(':id', specialistId);
}

/** Wyłuskuje `specialistId` z odpowiedzi sesji (null gdy niepoprawna). */
function readSpecialistId(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const user = (data as { user?: unknown }).user;
  if (typeof user !== 'object' || user === null) return null;
  const id = (user as { specialistId?: unknown }).specialistId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** Type guard: minimalny kształt rekordu weryfikacji. */
function isVerification(data: unknown): data is Verification {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as { state?: unknown }).state === 'string'
  );
}

/** Komunikat błędu z ciała odpowiedzi (z fallbackiem). */
function messageFrom(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null) {
    const m = (data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim().length > 0) return m;
  }
  return fallback;
}

/** Format daty/godziny w PL (ekran sukcesu renderuje się tylko po stronie klienta). */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

/** Strzałka „w prawo" dla CTA (dekoracyjna). */
function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Chevron selecta (dekoracyjny, nie przechwytuje kliknięć). */
function SelectChevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
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

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

/** Wspólny wrapper pola: label + treść + komunikat błędu/podpowiedzi. */
function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** `aria-describedby` pola: id błędu, potem podpowiedzi. */
function describedBy(id: string, hasError: boolean, hasHint: boolean): string | undefined {
  if (hasError) return `${id}-error`;
  if (hasHint) return `${id}-hint`;
  return undefined;
}

/* ------------------------------------------------------------------ *
 * Typy stanu
 * ------------------------------------------------------------------ */

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  pwzNumber?: string;
  registry?: string;
  title?: string;
  terms?: string;
  privacy?: string;
}

/** Błąd formularza: zajęty e-mail (z linkiem) albo zwykły komunikat. */
type FormError = { kind: 'emailTaken' } | { kind: 'message'; text: string };

/** Ekran: formularz albo sukces (z rekordem weryfikacji). */
type Screen =
  | { kind: 'form' }
  | { kind: 'success'; verification: Verification; stale: boolean };

/* ------------------------------------------------------------------ *
 * Ekran sukcesu — „Konto założone, trwa weryfikacja PWZ"
 * ------------------------------------------------------------------ */

function SuccessScreen({
  verification,
  stale,
}: {
  verification: Verification;
  stale: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <CardContent className="flex flex-col items-center gap-6 p-6 text-center sm:p-8">
          <div className="relative">
            <BookingSuccess className="h-32 w-32" />
            <Leaf className="pointer-events-none absolute -right-2 bottom-0 h-8 w-8" />
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800">
            <span
              className="h-2 w-2 rounded-full bg-brand-500"
              aria-hidden="true"
            />
            {VERIFICATION_LABELS[verification.state]}
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Konto założone — trwa weryfikacja PWZ
            </h1>
            <p className="mx-auto max-w-lg text-sm text-ink-muted">
              Automat sprawdza Twój numer PWZ w rejestrze {verification.registry}.
              Jeśli nie znajdzie dopasowania, zgłoszenie trafia do kolejki ręcznej —
              rozpatrujemy je w czasie do 24 godzin roboczych.
            </p>
          </div>

          {stale && (
            <p className="w-full rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700">
              Nie udało się pobrać aktualnego statusu z serwera — pokazujemy stan
              początkowy zgłoszenia.
            </p>
          )}

          <dl className="grid w-full grid-cols-1 gap-x-6 gap-y-3 rounded-xl2 border border-slate-200/70 bg-surface-muted p-4 text-left sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                Numer PWZ
              </dt>
              <dd className="text-sm text-ink">{verification.pwzNumber}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                Rejestr
              </dt>
              <dd className="text-sm text-ink">
                {REGISTRY_LABELS[verification.registry]}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                Zgłoszono
              </dt>
              <dd className="text-sm text-ink">
                {formatDateTime(verification.submittedAt)}
              </dd>
            </div>
            {verification.slaDeadline && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  Termin weryfikacji (SLA)
                </dt>
                <dd className="text-sm text-ink">
                  {formatDateTime(verification.slaDeadline)}
                </dd>
              </div>
            )}
          </dl>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/panel" className={cn(ctaBase, ctaVariant.primary)}>
              Przejdź do panelu
              <ChevronRight />
            </Link>
            <Link href="/logowanie" className={cn(ctaBase, ctaVariant.outline)}>
              Zaloguj się
            </Link>
          </div>

          <p className="max-w-lg text-xs text-ink-subtle">
            Uwaga: w tej wersji demonstracyjnej panel specjalisty pokazuje konto
            pokazowe — to ograniczenie zamockowanego backendu (MSW).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-4">
            <BeBadge
              endpoint="POST /api/auth/register/specialist"
              desc="Rejestracja specjalisty w zamockowanym backendzie (MSW)."
            />
            <BeBadge
              endpoint="GET /api/specialists/:id/verification"
              desc="Stan weryfikacji PWZ pobrany z zamockowanego backendu (MSW) i logowany w panelu BE Inspector."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Strona
 * ------------------------------------------------------------------ */

export default function RejestracjaSpecjalistyPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwzNumber, setPwzNumber] = useState('');
  const [registry, setRegistry] = useState<ProfessionalRegistry | ''>('');
  const [title, setTitle] = useState<SpecialistTitle | ''>('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: 'form' });

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (firstName.trim().length < 2) next.firstName = 'Podaj imię (min. 2 znaki).';
    if (lastName.trim().length < 2) next.lastName = 'Podaj nazwisko (min. 2 znaki).';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Podaj poprawny adres e-mail.';
    if (phone.replace(/\D/g, '').length < 9) {
      next.phone = 'Podaj numer telefonu (min. 9 cyfr).';
    }
    if (password.length < 6) next.password = 'Hasło musi mieć min. 6 znaków.';

    const pwz = pwzNumber.trim();
    if (pwz.length === 0) next.pwzNumber = 'Podaj numer PWZ.';
    else if (!PWZ_RE.test(pwz)) next.pwzNumber = 'Numer PWZ to ciąg 5–9 cyfr.';

    if (registry === '') next.registry = 'Wybierz rejestr zawodowy.';
    if (title === '') next.title = 'Wybierz tytuł zawodowy.';
    if (!acceptTerms) next.terms = 'Zaakceptuj regulamin, aby kontynuować.';
    if (!acceptPrivacy) next.privacy = 'Wymagana zgoda na przetwarzanie danych.';
    return next;
  }

  /** Po rejestracji: pobierz stan weryfikacji; przy błędzie pokaż stan początkowy. */
  async function resolveVerification(
    specialistId: string | null,
    body: RegisterSpecialistBody,
  ): Promise<{ verification: Verification; stale: boolean }> {
    if (specialistId) {
      try {
        const res = await apiClient.get<Verification>(verificationPath(specialistId));
        if (res.status === 200 && isVerification(res.data)) {
          return { verification: res.data, stale: false };
        }
      } catch {
        // Rejestracja się powiodła — pokażemy stan początkowy poniżej.
      }
    }
    const fallback: Verification = {
      specialistId: specialistId ?? '',
      pwzNumber: body.pwzNumber,
      registry: body.registry,
      state: VerificationState.WeryfikacjaAuto,
      submittedAt: new Date().toISOString(),
    };
    return { verification: fallback, stale: true };
  }

  async function submit() {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    // Zawężenie typów (już zapewnione przez validate).
    if (registry === '' || title === '') return;

    const body: RegisterSpecialistBody = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      pwzNumber: pwzNumber.trim(),
      registry,
      title,
    };

    setFormError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post<Session>(
        AUTH_ENDPOINTS.registerSpecialist.path,
        body,
      );

      if (res.status === 201) {
        const specialistId = readSpecialistId(res.data);
        const { verification, stale } = await resolveVerification(specialistId, body);
        setScreen({ kind: 'success', verification, stale });
        return;
      }
      if (res.status === 409) {
        setFormError({ kind: 'emailTaken' });
        return;
      }
      if (res.status === 400) {
        setFormError({
          kind: 'message',
          text: messageFrom(res.data, 'Sprawdź poprawność danych i spróbuj ponownie.'),
        });
        return;
      }
      setFormError({
        kind: 'message',
        text: 'Nie udało się utworzyć konta. Spróbuj ponownie.',
      });
    } catch {
      setFormError({
        kind: 'message',
        text: 'Błąd połączenia z serwerem. Spróbuj ponownie.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  if (screen.kind === 'success') {
    return <SuccessScreen verification={screen.verification} stale={screen.stale} />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid items-stretch gap-8 lg:grid-cols-2">
        {/* Panel ilustracyjny (desktop) */}
        <section className="relative hidden overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-8 shadow-card lg:flex lg:flex-col lg:justify-between">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Konto specjalisty
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Dołącz jako{' '}
              <span className="relative inline-block whitespace-nowrap text-brand-700">
                specjalista
                <Squiggle className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full text-brand-400" />
              </span>
            </h1>
            <p className="max-w-sm text-sm text-ink-muted">
              Załóż konto i podaj numer PWZ. Po weryfikacji uprawnień w rejestrze
              KRL/KIF opublikujesz profil i zaczniesz przyjmować rezerwacje.
            </p>
          </div>
          <div className="relative mt-6 flex justify-center">
            <ShieldCheck className="w-full max-w-[220px]" />
            <Leaf className="pointer-events-none absolute -left-1 bottom-2 h-10 w-10" />
          </div>
        </section>

        {/* Panel formularza */}
        <Card className="flex flex-col">
          <CardHeader>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800 lg:hidden">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Konto specjalisty
            </span>
            <CardTitle>Załóż konto specjalisty</CardTitle>
            <p className="text-sm text-ink-muted">
              Masz już konto?{' '}
              <Link
                href="/logowanie"
                className="font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Zaloguj się
              </Link>
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="reg-firstName" label="Imię" error={errors.firstName}>
                  <input
                    id="reg-firstName"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    aria-invalid={errors.firstName ? true : undefined}
                    aria-describedby={describedBy('reg-firstName', !!errors.firstName, false)}
                    className={inputClass}
                  />
                </Field>

                <Field id="reg-lastName" label="Nazwisko" error={errors.lastName}>
                  <input
                    id="reg-lastName"
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    aria-invalid={errors.lastName ? true : undefined}
                    aria-describedby={describedBy('reg-lastName', !!errors.lastName, false)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field id="reg-email" label="Adres e-mail" error={errors.email}>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={describedBy('reg-email', !!errors.email, false)}
                  placeholder="ty@przyklad.pl"
                  className={inputClass}
                />
              </Field>

              <Field id="reg-phone" label="Telefon" error={errors.phone}>
                <input
                  id="reg-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={describedBy('reg-phone', !!errors.phone, false)}
                  placeholder="+48 600 700 800"
                  className={inputClass}
                />
              </Field>

              <Field
                id="reg-password"
                label="Hasło"
                error={errors.password}
                hint="Minimum 6 znaków."
              >
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={describedBy('reg-password', !!errors.password, true)}
                    className={cn(inputClass, 'pr-12')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    className="absolute right-1 top-1/2 inline-flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </Field>

              <Field
                id="reg-pwz"
                label="Numer PWZ"
                error={errors.pwzNumber}
                hint="Sam ciąg cyfr, np. 1234567 (5–9 znaków)."
              >
                <input
                  id="reg-pwz"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pwzNumber}
                  onChange={(event) => setPwzNumber(event.target.value)}
                  aria-invalid={errors.pwzNumber ? true : undefined}
                  aria-describedby={describedBy('reg-pwz', !!errors.pwzNumber, true)}
                  placeholder="1234567"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="reg-registry" label="Rejestr zawodowy" error={errors.registry}>
                  <div className="relative">
                    <select
                      id="reg-registry"
                      value={registry}
                      onChange={(event) =>
                        setRegistry(event.target.value as ProfessionalRegistry | '')
                      }
                      aria-invalid={errors.registry ? true : undefined}
                      aria-describedby={describedBy('reg-registry', !!errors.registry, false)}
                      className={selectClass}
                    >
                      <option value="" disabled>
                        Wybierz rejestr
                      </option>
                      {REGISTRY_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {REGISTRY_LABELS[value]}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                </Field>

                <Field id="reg-title" label="Tytuł zawodowy" error={errors.title}>
                  <div className="relative">
                    <select
                      id="reg-title"
                      value={title}
                      onChange={(event) =>
                        setTitle(event.target.value as SpecialistTitle | '')
                      }
                      aria-invalid={errors.title ? true : undefined}
                      aria-describedby={describedBy('reg-title', !!errors.title, false)}
                      className={selectClass}
                    >
                      <option value="" disabled>
                        Wybierz tytuł
                      </option>
                      {TITLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                </Field>
              </div>

              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">Wymagane zgody</legend>

                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    aria-invalid={errors.terms ? true : undefined}
                    aria-describedby={errors.terms ? 'reg-terms-error' : undefined}
                    className="mt-0.5 h-5 w-5 flex-none rounded border-slate-300 accent-brand-700"
                  />
                  <span className="text-sm text-ink-muted">
                    Akceptuję <span className="font-medium text-ink">regulamin</span>{' '}
                    serwisu dla specjalistów.
                  </span>
                </label>
                {errors.terms && (
                  <p id="reg-terms-error" className="text-xs text-danger-600">
                    {errors.terms}
                  </p>
                )}

                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(event) => setAcceptPrivacy(event.target.checked)}
                    aria-invalid={errors.privacy ? true : undefined}
                    aria-describedby={errors.privacy ? 'reg-privacy-error' : undefined}
                    className="mt-0.5 h-5 w-5 flex-none rounded border-slate-300 accent-brand-700"
                  />
                  <span className="text-sm text-ink-muted">
                    Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z{' '}
                    <span className="font-medium text-ink">
                      polityką prywatności (RODO)
                    </span>
                    .
                  </span>
                </label>
                {errors.privacy && (
                  <p id="reg-privacy-error" className="text-xs text-danger-600">
                    {errors.privacy}
                  </p>
                )}
              </fieldset>

              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"
                >
                  {formError.kind === 'emailTaken' ? (
                    <>
                      Konto z tym adresem e-mail już istnieje.{' '}
                      <Link
                        href="/logowanie"
                        className="font-medium underline underline-offset-2"
                      >
                        Zaloguj się
                      </Link>
                      .
                    </>
                  ) : (
                    formError.text
                  )}
                </div>
              )}

              <Button type="submit" size="lg" loading={submitting} className="w-full">
                Załóż konto specjalisty
              </Button>

              <p className="text-xs text-ink-subtle">
                Rejestracja startuje weryfikację PWZ. Żądanie jest zamockowane (MSW)
                i widoczne w panelu BE Inspector.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
