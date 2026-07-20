/**
 * (public) /prywatnosc — polityka prywatności / RODO (A9).
 *
 * Server component: placeholder polityki prywatności (administrator danych,
 * zakres i cele, podstawy prawne, odbiorcy, retencja, prawa użytkownika z
 * odesłaniem do „Dane konta", cookies, kontakt). Treść demonstracyjna (mock).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from '@/components/illustrations';
import { Dots, Sparkle } from '@/components/doodles';

export const metadata: Metadata = {
  title: 'Polityka prywatności (przykładowa) — ZnanyPsycholog (demo)',
  description:
    'Przykładowa polityka prywatności i informacja RODO demonstracyjnego serwisu ZnanyPsycholog. Dokument poglądowy (mock) — dane wyłącznie przykładowe.',
};

/* ------------------------------------------------------------------ *
 * Sekcje czysto tekstowe (placeholder — sensowne akapity PL).
 * ------------------------------------------------------------------ */
interface Section {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
}

const TEXT_SECTIONS: readonly Section[] = [
  {
    id: 'administrator',
    title: '1. Administrator danych',
    paragraphs: [
      'Administratorem danych w tej makiecie jest przykładowy operator serwisu ZnanyPsycholog (dane kontaktowe podano na stronie kontaktu). W realnym wdrożeniu w tym miejscu wskazano by pełną nazwę, adres oraz dane rejestrowe administratora.',
      'Serwis ma charakter demonstracyjny i działa na zamockowanym backendzie (MSW), dlatego przedstawione dane są wyłącznie poglądowe.',
    ],
  },
  {
    id: 'scope',
    title: '2. Jakie dane przetwarzamy',
    paragraphs: [
      'W zależności od roli użytkownika mogą to być: dane konta (np. imię, adres e-mail), dane niezbędne do rezerwacji wizyty, a w przypadku specjalistów — numer prawa wykonywania zawodu (PWZ) i rejestr zawodowy.',
      'Serwis może przetwarzać także dane techniczne związane z korzystaniem z makiety, w zakresie niezbędnym do jej działania i prezentacji.',
    ],
  },
  {
    id: 'purpose',
    title: '3. Cele i podstawy prawne',
    paragraphs: [
      'Dane przetwarzane byłyby w celu świadczenia usług (np. założenie konta, rezerwacja wizyty), na podstawie umowy o świadczenie usług drogą elektroniczną, a także w celu realizacji obowiązków prawnych oraz w oparciu o uzasadniony interes administratora.',
      'Tam, gdzie wymagana jest zgoda (np. wybrane działania marketingowe), przetwarzanie odbywałoby się na jej podstawie, a zgodę można w każdej chwili cofnąć.',
    ],
  },
  {
    id: 'recipients',
    title: '4. Odbiorcy danych',
    paragraphs: [
      'Dane mogłyby być udostępniane podmiotom wspierającym działanie serwisu (np. dostawcom infrastruktury) na podstawie umów powierzenia przetwarzania. W makiecie dane nie są realnie przekazywane żadnym podmiotom.',
    ],
  },
  {
    id: 'retention',
    title: '5. Okres przechowywania (retencja)',
    paragraphs: [
      'Dane przechowywane byłyby przez okres niezbędny do realizacji celów, dla których je zebrano, a następnie przez czas wynikający z przepisów prawa lub do czasu skutecznego wniesienia sprzeciwu bądź usunięcia konta.',
      'Ponieważ jest to makieta, dane wprowadzane w interfejsie nie są trwale utrwalane po stronie realnego serwera.',
    ],
  },
];

export default function PrywatnoscPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* ============================= HERO ============================= */}
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-6 shadow-card md:p-8">
        <Dots className="pointer-events-none absolute -right-3 -top-3 hidden h-24 w-24 text-brand-200 md:block" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5 text-brand-600" />
              Prywatność i RODO
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Polityka prywatności
            </h1>
            <p className="max-w-xl text-sm text-ink-muted md:text-base">
              Przykładowy opis zasad przetwarzania danych osobowych w serwisie
              pośredniczącym w rezerwacji wizyt. Wersja poglądowa (demo).
            </p>
          </div>
          <ShieldCheck className="hidden h-28 w-28 shrink-0 sm:block lg:h-32 lg:w-32" />
        </div>
      </section>

      {/* ==================== NOTA: DOKUMENT PRZYKŁADOWY ================ */}
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
          <span className="font-semibold">
            Dokument przykładowy (demo) — nie stanowi wiążącej polityki prywatności.
          </span>{' '}
          Treść przygotowano do prezentacji makiety ZnanyPsycholog działającej na
          zamockowanym backendzie (MSW). Dane są wyłącznie poglądowe.
        </p>
      </div>

      {/* ========================= SEKCJE TEKSTOWE ===================== */}
      <div className="flex flex-col gap-8">
        {TEXT_SECTIONS.map((section) => (
          <section
            key={section.id}
            aria-labelledby={`${section.id}-title`}
            className="flex flex-col gap-3"
          >
            <h2
              id={`${section.id}-title`}
              className="text-xl font-semibold text-ink"
            >
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph, index) => (
              <p
                key={`${section.id}-p${index}`}
                className="max-w-3xl text-sm leading-relaxed text-ink-muted"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        {/* -------------------- TWOJE PRAWA (z odesłaniem) ------------- */}
        <section aria-labelledby="rights-title" className="flex flex-col gap-3">
          <h2 id="rights-title" className="text-xl font-semibold text-ink">
            6. Twoje prawa
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
            W zakresie danych osobowych przysługiwałyby Ci prawa wynikające z RODO,
            w tym:
          </p>
          <ul className="ml-1 flex max-w-3xl flex-col gap-2">
            {[
              'prawo dostępu do danych oraz uzyskania ich kopii,',
              'prawo do sprostowania (poprawienia) danych,',
              'prawo do usunięcia danych („prawo do bycia zapomnianym”),',
              'prawo do ograniczenia przetwarzania,',
              'prawo do przenoszenia danych (eksport),',
              'prawo do sprzeciwu oraz do cofnięcia zgody,',
              'prawo wniesienia skargi do organu nadzorczego (PUODO).',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink-muted">
                <span
                  className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex flex-col gap-2 rounded-xl2 border border-brand-100 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">
              Dostęp do danych, ich eksport oraz wniosek o usunięcie konta obsłużysz
              w sekcji „Dane konta”.
            </p>
            <Link
              href="/konto/dane"
              className="inline-flex min-h-[2.75rem] w-fit items-center justify-center gap-2 rounded-xl2 bg-brand-700 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800 active:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Przejdź do „Dane konta”
            </Link>
          </div>
        </section>

        {/* -------------------------- COOKIES ------------------------- */}
        <section aria-labelledby="cookies-title" className="flex flex-col gap-3">
          <h2 id="cookies-title" className="text-xl font-semibold text-ink">
            7. Pliki cookies
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
            Serwis mógłby korzystać z plików cookies oraz zbliżonych technologii w
            celu zapewnienia poprawnego działania i zapamiętania preferencji.
            Zakresem cookies użytkownik zarządzałby w ustawieniach przeglądarki lub
            w panelu zgód. W tej makiecie cookies nie są wykorzystywane do śledzenia.
          </p>
        </section>

        {/* -------------------------- KONTAKT ------------------------- */}
        <section aria-labelledby="contact-title" className="flex flex-col gap-3">
          <h2 id="contact-title" className="text-xl font-semibold text-ink">
            8. Kontakt w sprawie danych
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
            Pytania dotyczące przetwarzania danych możesz kierować przez{' '}
            <Link
              href="/kontakt"
              className="font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              formularz kontaktowy
            </Link>
            . Zasady korzystania z serwisu opisano w{' '}
            <Link
              href="/regulamin"
              className="font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              regulaminie
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
