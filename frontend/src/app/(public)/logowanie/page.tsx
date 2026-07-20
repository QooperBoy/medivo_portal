'use client';

/**
 * (public) /logowanie — ekran logowania (EPIC A).
 *
 * Formularz e-mail + hasło woła `login` z AuthProvidera (żądanie widoczne w BE
 * Inspectorze). Po sukcesie przekierowuje wg roli (pacjent → /moje-wizyty,
 * specjalista → /panel, admin → /admin). Dodatkowo „szybkie logowanie demo"
 * — trzy przyciski uzupełniające i logujące konta pokazowe.
 */

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/domain';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ShieldCheck } from '@/components/illustrations';
import { Sparkle, Squiggle, Leaf } from '@/components/doodles';
import { cn } from '@/lib/utils';
import { useAuth, homePathForRole } from '@/components/auth/AuthProvider';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hasło do kont demo — w mocku dowolne, ustawione dla wygody prezentacji. */
const DEMO_PASSWORD = 'demo1234';

interface DemoAccount {
  readonly role: UserRole;
  readonly label: string;
  readonly email: string;
}

const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { role: 'patient', label: 'Pacjent', email: 'pacjent@demo.pl' },
  { role: 'specialist', label: 'Specjalista', email: 'anna.kowalska@demo.pl' },
  { role: 'admin', label: 'Admin', email: 'admin@demo.pl' },
];

/** Znacznik trwającej akcji — formularz lub konkretne konto demo. */
type Pending = 'form' | UserRole | null;

const inputClass =
  'h-11 w-full rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

interface FieldErrors {
  email?: string;
  password?: string;
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

export default function LogowaniePage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const busy = pending !== null;

  async function runLogin(
    emailValue: string,
    passwordValue: string,
    action: Exclude<Pending, null>,
  ) {
    setFormError(null);
    setPending(action);
    try {
      const outcome = await login(emailValue, passwordValue);
      if (outcome.ok) {
        router.push(homePathForRole(outcome.user.role));
        return;
      }
      setFormError(outcome.message);
    } finally {
      setPending(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!EMAIL_RE.test(email.trim())) {
      nextErrors.email = 'Podaj poprawny adres e-mail.';
    }
    if (password.length < 1) {
      nextErrors.password = 'Podaj hasło.';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    void runLogin(email.trim(), password, 'form');
  }

  function handleDemo(account: DemoAccount) {
    setFieldErrors({});
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    void runLogin(account.email, DEMO_PASSWORD, account.role);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid items-stretch gap-8 lg:grid-cols-2">
        {/* Panel ilustracyjny (desktop) */}
        <section className="relative hidden overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-8 shadow-card lg:flex lg:flex-col lg:justify-between">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Bezpieczne logowanie
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Wróć do{' '}
              <span className="relative inline-block whitespace-nowrap text-brand-700">
                swojego konta
                <Squiggle className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full text-brand-400" />
              </span>
            </h1>
            <p className="max-w-sm text-sm text-ink-muted">
              Zaloguj się, aby zarządzać wizytami i profilem. Każde żądanie trafia
              do zamockowanego backendu i jest widoczne w panelu BE Inspector.
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
              Bezpieczne logowanie
            </span>
            <CardTitle>Zaloguj się</CardTitle>
            <p className="text-sm text-ink-muted">
              Nie masz konta?{' '}
              <Link
                href="/rejestracja"
                className="font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Załóż konto pacjenta
              </Link>
            </p>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-sm font-medium text-ink">
                  Adres e-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                  placeholder="ty@przyklad.pl"
                  className={inputClass}
                />
                {fieldErrors.email && (
                  <p id="login-email-error" className="text-xs text-danger-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-ink"
                >
                  Hasło
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={fieldErrors.password ? true : undefined}
                    aria-describedby={
                      fieldErrors.password ? 'login-password-error' : undefined
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
                {fieldErrors.password && (
                  <p id="login-password-error" className="text-xs text-danger-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

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
                loading={pending === 'form'}
                disabled={busy}
                className="w-full"
              >
                Zaloguj się
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                lub
              </span>
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink">
                Szybkie logowanie (demo)
              </p>
              <p className="text-xs text-ink-subtle">
                Konta pokazowe do prezentacji — hasło jest dowolne (mock).
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.role}
                    type="button"
                    variant="secondary"
                    loading={pending === account.role}
                    disabled={busy}
                    onClick={() => handleDemo(account)}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
