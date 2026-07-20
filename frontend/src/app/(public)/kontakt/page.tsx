/**
 * (public) /kontakt — dane kontaktowe i statyczny formularz (A9).
 *
 * Server component: przykładowe dane kontaktowe (adres e-mail demo, godziny
 * wsparcia) oraz statyczny formularz (imię / e-mail / wiadomość). Przycisk NIE
 * wysyła danych — to makieta (mock) bez realnej wysyłki i bez JS klienta.
 */
import type { Metadata } from 'next';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { CalmScene } from '@/components/illustrations';
import { Dots, Sparkle } from '@/components/doodles';

export const metadata: Metadata = {
  title: 'Kontakt — ZnanyPsycholog (demo)',
  description:
    'Skontaktuj się z demonstracyjnym serwisem ZnanyPsycholog. Przykładowe dane kontaktowe i statyczny formularz (mock) — bez realnej wysyłki.',
};

/* Wspólny styl pól formularza (wysokość 44px — dotykowo). */
const fieldClass =
  'h-11 w-full rounded-xl2 border border-slate-200 bg-surface-muted px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

interface SupportHours {
  readonly id: string;
  readonly days: string;
  readonly hours: string;
}

const SUPPORT_HOURS: readonly SupportHours[] = [
  { id: 'weekdays', days: 'Poniedziałek – piątek', hours: '9:00 – 17:00' },
  { id: 'saturday', days: 'Sobota', hours: '10:00 – 14:00' },
  { id: 'sunday', days: 'Niedziela', hours: 'nieczynne' },
];

export default function KontaktPage() {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      {/* ============================= HERO ============================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-6 shadow-card md:p-8">
        <Dots className="pointer-events-none absolute -right-3 -top-3 hidden h-24 w-24 text-brand-200 md:block" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Kontakt
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Skontaktuj się z nami
            </h1>
            <p className="max-w-xl text-sm text-ink-muted md:text-base">
              Masz pytanie o działanie makiety? Skorzystaj z przykładowych danych
              kontaktowych lub wypełnij formularz poniżej.
            </p>
          </div>
          <CalmScene className="hidden h-28 w-28 shrink-0 sm:block lg:h-32 lg:w-32" />
        </div>
      </section>

      {/* ==================== NOTA: FORMULARZ DEMO ===================== */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl2 border border-warning-200 bg-warning-50 p-4"
      >
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-5 w-5 flex-none text-warning-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" />
        </svg>
        <p className="text-sm text-warning-700">
          <span className="font-semibold">Formularz demonstracyjny.</span>{' '}
          ZnanyPsycholog to makieta (mock) na zamockowanym backendzie (MSW). Dane
          kontaktowe są przykładowe, a wiadomość z formularza nie zostanie wysłana.
        </p>
      </div>

      {/* ==================== DANE KONTAKTOWE + FORMULARZ ============== */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* --- Kolumna: dane kontaktowe i godziny --- */}
        <section aria-labelledby="contact-info-heading" className="flex flex-col gap-6">
          <h2 id="contact-info-heading" className="sr-only">
            Dane kontaktowe
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>Dane kontaktowe (przykładowe)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                  E-mail
                </span>
                <span className="text-sm text-ink">kontakt@znanypsycholog.example</span>
                <span className="text-xs text-ink-subtle">
                  Adres w domenie .example — służy wyłącznie prezentacji.
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                  Adres (demo)
                </span>
                <span className="text-sm text-ink">
                  ul. Przykładowa 1, 00-001 Miasto
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Godziny wsparcia</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="flex flex-col divide-y divide-slate-100">
                {SUPPORT_HOURS.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                  >
                    <dt className="text-sm text-ink-muted">{row.days}</dt>
                    <dd className="text-sm font-medium text-ink">{row.hours}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </section>

        {/* --- Kolumna: formularz statyczny --- */}
        <section aria-labelledby="contact-form-heading">
          <Card>
            <CardHeader>
              <CardTitle id="contact-form-heading">Formularz kontaktowy</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                aria-label="Formularz kontaktowy (demonstracyjny)"
                aria-describedby="form-demo-hint"
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-name" className="text-sm font-medium text-ink">
                    Imię
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Twoje imię"
                    className={fieldClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-email" className="text-sm font-medium text-ink">
                    E-mail
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="adres@przyklad.pl"
                    className={fieldClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-message"
                    className="text-sm font-medium text-ink"
                  >
                    Wiadomość
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    placeholder="W czym możemy pomóc?"
                    className="w-full rounded-xl2 border border-slate-200 bg-surface-muted px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  />
                </div>

                <Button type="button" size="lg" className="w-full">
                  Wyślij wiadomość
                </Button>

                <p id="form-demo-hint" className="text-xs text-ink-subtle">
                  To formularz demonstracyjny — po kliknięciu wiadomość nie zostanie
                  wysłana ani nigdzie zapisana.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
