'use client';

/**
 * (public) /rejestracja — rejestracja pacjenta (EPIC A).
 *
 * Formularz (imię, nazwisko, e-mail, telefon, hasło + wymagane zgody) z walidacją
 * po stronie klienta woła `registerPatient` z AuthProvidera. Po sukcesie kieruje
 * do /moje-wizyty; przy 409 informuje, że konto już istnieje.
 */

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RegisterPatientBody } from '@/domain';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { HeroCalm } from '@/components/illustrations';
import { Sparkle, Squiggle, Leaf } from '@/components/doodles';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'h-11 w-full rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  terms?: string;
  privacy?: string;
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

export default function RejestracjaPage() {
  const router = useRouter();
  const { registerPatient } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (firstName.trim().length < 2) next.firstName = 'Podaj imię (min. 2 znaki).';
    if (lastName.trim().length < 2) next.lastName = 'Podaj nazwisko (min. 2 znaki).';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Podaj poprawny adres e-mail.';
    if (phone.replace(/\D/g, '').length < 9) {
      next.phone = 'Podaj numer telefonu (min. 9 cyfr).';
    }
    if (password.length < 6) next.password = 'Hasło musi mieć min. 6 znaków.';
    if (!acceptTerms) next.terms = 'Zaakceptuj regulamin, aby kontynuować.';
    if (!acceptPrivacy) next.privacy = 'Wymagana zgoda na przetwarzanie danych.';
    return next;
  }

  async function submit() {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const body: RegisterPatientBody = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    };

    setFormError(null);
    setSubmitting(true);
    try {
      const outcome = await registerPatient(body);
      if (outcome.ok) {
        router.push('/moje-wizyty');
        return;
      }
      if (outcome.status === 409) {
        setFormError('Konto z tym adresem e-mail już istnieje. Zaloguj się poniżej.');
      } else {
        setFormError(outcome.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid items-stretch gap-8 lg:grid-cols-2">
        {/* Panel ilustracyjny (desktop) */}
        <section className="relative hidden overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-8 shadow-card lg:flex lg:flex-col lg:justify-between">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Konto pacjenta
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Załóż konto i rezerwuj{' '}
              <span className="relative inline-block whitespace-nowrap text-brand-700">
                wygodniej
                <Squiggle className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full text-brand-400" />
              </span>
            </h1>
            <p className="max-w-sm text-sm text-ink-muted">
              Załóż konto, aby szybciej umawiać wizyty i mieć je w jednym miejscu.
              Rejestracja trafia do zamockowanego backendu i jest widoczna w panelu
              BE Inspector.
            </p>
          </div>
          <div className="relative mt-6 flex justify-center">
            <HeroCalm className="w-full max-w-[260px]" />
            <Leaf className="pointer-events-none absolute -left-1 bottom-0 h-10 w-10" />
          </div>
        </section>

        {/* Panel formularza */}
        <Card className="flex flex-col">
          <CardHeader>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800 lg:hidden">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Konto pacjenta
            </span>
            <CardTitle>Załóż konto pacjenta</CardTitle>
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
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="register-firstName"
                    className="text-sm font-medium text-ink"
                  >
                    Imię
                  </label>
                  <input
                    id="register-firstName"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    aria-invalid={errors.firstName ? true : undefined}
                    aria-describedby={
                      errors.firstName ? 'register-firstName-error' : undefined
                    }
                    className={inputClass}
                  />
                  {errors.firstName && (
                    <p
                      id="register-firstName-error"
                      className="text-xs text-danger-600"
                    >
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="register-lastName"
                    className="text-sm font-medium text-ink"
                  >
                    Nazwisko
                  </label>
                  <input
                    id="register-lastName"
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    aria-invalid={errors.lastName ? true : undefined}
                    aria-describedby={
                      errors.lastName ? 'register-lastName-error' : undefined
                    }
                    className={inputClass}
                  />
                  {errors.lastName && (
                    <p
                      id="register-lastName-error"
                      className="text-xs text-danger-600"
                    >
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-email"
                  className="text-sm font-medium text-ink"
                >
                  Adres e-mail
                </label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? 'register-email-error' : undefined}
                  placeholder="ty@przyklad.pl"
                  className={inputClass}
                />
                {errors.email && (
                  <p id="register-email-error" className="text-xs text-danger-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-phone"
                  className="text-sm font-medium text-ink"
                >
                  Telefon
                </label>
                <input
                  id="register-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? 'register-phone-error' : undefined}
                  placeholder="+48 600 700 800"
                  className={inputClass}
                />
                {errors.phone && (
                  <p id="register-phone-error" className="text-xs text-danger-600">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-password"
                  className="text-sm font-medium text-ink"
                >
                  Hasło
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={
                      errors.password
                        ? 'register-password-error'
                        : 'register-password-hint'
                    }
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
                {errors.password ? (
                  <p id="register-password-error" className="text-xs text-danger-600">
                    {errors.password}
                  </p>
                ) : (
                  <p id="register-password-hint" className="text-xs text-ink-subtle">
                    Minimum 6 znaków.
                  </p>
                )}
              </div>

              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">Wymagane zgody</legend>

                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    aria-invalid={errors.terms ? true : undefined}
                    aria-describedby={errors.terms ? 'register-terms-error' : undefined}
                    className="mt-0.5 h-5 w-5 flex-none rounded border-slate-300 accent-brand-700"
                  />
                  <span className="text-sm text-ink-muted">
                    Akceptuję <span className="font-medium text-ink">regulamin</span>{' '}
                    serwisu.
                  </span>
                </label>
                {errors.terms && (
                  <p id="register-terms-error" className="text-xs text-danger-600">
                    {errors.terms}
                  </p>
                )}

                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(event) => setAcceptPrivacy(event.target.checked)}
                    aria-invalid={errors.privacy ? true : undefined}
                    aria-describedby={
                      errors.privacy ? 'register-privacy-error' : undefined
                    }
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
                  <p id="register-privacy-error" className="text-xs text-danger-600">
                    {errors.privacy}
                  </p>
                )}
              </fieldset>

              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"
                >
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                loading={submitting}
                className="w-full"
              >
                Załóż konto
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
