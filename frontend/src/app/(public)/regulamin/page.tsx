/**
 * (public) /regulamin — przykładowy regulamin serwisu (A9).
 *
 * Server component: placeholder regulaminu w formie paragrafów (§ 1..§ N) z
 * sensownymi akapitami PL. Na górze wyraźna nota, że dokument jest przykładowy
 * (demo) i NIE stanowi wiążącego regulaminu.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Regulamin (przykładowy) — ZnanyPsycholog (demo)',
  description:
    'Przykładowy regulamin demonstracyjnego serwisu ZnanyPsycholog. Dokument poglądowy (mock) — nie stanowi wiążącego regulaminu.',
};

/* ------------------------------------------------------------------ *
 * Treść paragrafów (placeholder — sensowne akapity PL).
 * ------------------------------------------------------------------ */
interface Section {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
}

const SECTIONS: readonly Section[] = [
  {
    id: 's1',
    title: '§ 1. Postanowienia ogólne',
    paragraphs: [
      'Niniejszy dokument jest przykładowym regulaminem przygotowanym na potrzeby makiety serwisu ZnanyPsycholog. Opisuje w sposób poglądowy zasady, na jakich mógłby działać serwis pośredniczący w rezerwacji wizyt u psychologów i psychoterapeutów.',
      'Serwis ma charakter demonstracyjny i działa na zamockowanym backendzie. Zapisy poniżej służą wyłącznie prezentacji układu dokumentu i nie tworzą żadnych praw ani obowiązków po stronie użytkownika lub operatora.',
    ],
  },
  {
    id: 's2',
    title: '§ 2. Definicje',
    paragraphs: [
      'Serwis — demonstracyjna platforma internetowa umożliwiająca wyszukiwanie specjalistów oraz rezerwację terminów wizyt. Użytkownik — osoba korzystająca z serwisu, w tym Pacjent oraz Specjalista.',
      'Pacjent — użytkownik szukający specjalisty i rezerwujący wizytę. Specjalista — psycholog lub psychoterapeuta prezentujący profil oraz udostępniający terminy. Konto — zbiór danych i uprawnień przypisanych użytkownikowi.',
    ],
  },
  {
    id: 's3',
    title: '§ 3. Rodzaje i zakres usług',
    paragraphs: [
      'W ramach serwisu Pacjent może przeglądać profile specjalistów, filtrować wyniki oraz rezerwować dostępne terminy wizyt online lub w gabinecie. Serwis pełni rolę pośrednika technicznego i nie świadczy usług o charakterze medycznym ani terapeutycznym.',
      'Zakres i warunki poszczególnych usług, w tym ceny wizyt, ustala Specjalista i prezentuje je w swoim profilu. Serwis nie ingeruje w treść i przebieg wizyty.',
    ],
  },
  {
    id: 's4',
    title: '§ 4. Rejestracja i konto',
    paragraphs: [
      'Korzystanie z wybranych funkcji serwisu wymaga założenia konta. Podczas rejestracji użytkownik podaje dane niezbędne do korzystania z serwisu oraz akceptuje niniejszy dokument.',
      'Użytkownik zobowiązuje się do podawania danych zgodnych ze stanem faktycznym oraz do zabezpieczenia dostępu do konta. Konto ma charakter osobisty i nie powinno być udostępniane osobom trzecim.',
    ],
  },
  {
    id: 's5',
    title: '§ 5. Weryfikacja specjalistów',
    paragraphs: [
      'Przed publikacją profilu Specjalista podaje numer prawa wykonywania zawodu (PWZ) oraz rejestr zawodowy. Serwis przeprowadza weryfikację uprawnień, a w razie potrzeby kieruje zgłoszenie do weryfikacji ręcznej.',
      'Profil Specjalisty staje się widoczny dla Pacjentów dopiero po pozytywnej weryfikacji i jego publikacji. Serwis może wstrzymać publikację profilu w przypadku wątpliwości co do podanych danych.',
    ],
  },
  {
    id: 's6',
    title: '§ 6. Rezerwacja wizyt',
    paragraphs: [
      'Rezerwacja polega na wyborze przez Pacjenta wolnego terminu z kalendarza Specjalisty i potwierdzeniu wizyty. Po dokonaniu rezerwacji Pacjent oraz Specjalista otrzymują potwierdzenie, a przed terminem — przypomnienie.',
      'Dostępność terminów zależy od grafiku ustawionego przez Specjalistę. Serwis nie gwarantuje dostępności konkretnego terminu ani konkretnego Specjalisty.',
    ],
  },
  {
    id: 's7',
    title: '§ 7. Odwołanie i zmiana terminu',
    paragraphs: [
      'Pacjent może zarządzać swoimi wizytami w odpowiedniej sekcji konta, zgodnie z zasadami i terminami wskazanymi przy danej wizycie. Warunki odwołania lub zmiany terminu mogą zależeć od ustawień Specjalisty.',
      'Serwis udostępnia jedynie techniczną możliwość zarządzania rezerwacją i nie jest stroną ustaleń dotyczących przebiegu wizyty pomiędzy Pacjentem a Specjalistą.',
    ],
  },
  {
    id: 's8',
    title: '§ 8. Płatności i subskrypcja',
    paragraphs: [
      'Model rozliczeń Specjalisty opiera się na subskrypcji — stałej opłacie za wybrany okres rozliczeniowy. Serwis nie pobiera prowizji od pojedynczych wizyt.',
      'Zmiana planu subskrypcji obowiązuje od kolejnego okresu rozliczeniowego. W makiecie płatności nie są realnie przetwarzane, a przedstawione ceny mają charakter poglądowy.',
    ],
  },
  {
    id: 's9',
    title: '§ 9. Odpowiedzialność i reklamacje',
    paragraphs: [
      'Serwis dokłada starań, aby funkcje działały poprawnie, jednak jako makieta demonstracyjna może zawierać uproszczenia i dane przykładowe. Serwis nie ponosi odpowiedzialności za decyzje podejmowane na podstawie treści poglądowych.',
      'Ewentualne uwagi dotyczące działania makiety można zgłaszać przez formularz kontaktowy. Zgłoszenia rozpatrywane są w charakterze informacji zwrotnej o prezentacji, a nie formalnej reklamacji.',
    ],
  },
  {
    id: 's10',
    title: '§ 10. Dane osobowe',
    paragraphs: [
      'Zasady przetwarzania danych osobowych opisano odrębnie w polityce prywatności. Dokument ten wskazuje m.in. administratora danych, cele i podstawy przetwarzania, okresy przechowywania oraz prawa użytkownika.',
      'W zakresie ochrony danych osobowych pierwszeństwo mają zapisy polityki prywatności serwisu.',
    ],
  },
  {
    id: 's11',
    title: '§ 11. Postanowienia końcowe',
    paragraphs: [
      'Operator może aktualizować przykładowy regulamin w celu prezentacji kolejnych funkcji makiety. O istotnych zmianach informuje w widoczny sposób w serwisie.',
      'W sprawach nieuregulowanych niniejszym dokumentem stosuje się powszechnie obowiązujące przepisy prawa. Dokument ma charakter poglądowy i nie stanowi wiążącego regulaminu.',
    ],
  },
];

export default function RegulaminPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* ============================ NAGŁÓWEK ========================== */}
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Regulamin
        </h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          Przykładowy układ regulaminu serwisu pośredniczącego w rezerwacji wizyt.
          Wersja poglądowa (demo).
        </p>
      </header>

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
            Dokument przykładowy (demo) — nie stanowi wiążącego regulaminu.
          </span>{' '}
          Treść przygotowano wyłącznie do prezentacji makiety serwisu ZnanyPsycholog
          działającej na zamockowanym backendzie (MSW). Zapisy nie tworzą praw ani
          obowiązków.
        </p>
      </div>

      {/* ============================ SPIS TREŚCI ====================== */}
      <nav aria-label="Spis treści regulaminu">
        <ol className="grid gap-1 rounded-xl2 border border-slate-200/70 bg-white p-4 shadow-card sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex min-h-[2.75rem] items-center rounded-md text-sm text-brand-700 transition-colors hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ============================ PARAGRAFY ======================== */}
      <div className="flex flex-col gap-8">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="scroll-mt-24 flex flex-col gap-3"
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
      </div>

      {/* ======================= ODESŁANIE / STOPKA ==================== */}
      <p className="max-w-3xl text-sm text-ink-muted">
        Zasady przetwarzania danych osobowych opisano w{' '}
        <Link
          href="/prywatnosc"
          className="font-medium text-brand-700 underline-offset-2 hover:underline"
        >
          polityce prywatności
        </Link>
        . Pytania możesz zadać przez{' '}
        <Link
          href="/kontakt"
          className="font-medium text-brand-700 underline-offset-2 hover:underline"
        >
          formularz kontaktowy
        </Link>
        .
      </p>
    </div>
  );
}
