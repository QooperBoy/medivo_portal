'use client';

/**
 * (specialist) /panel/weryfikacja — Weryfikacja specjalisty (C3 → D1 → D3).
 *
 * Renderuje wyłącznie treść sekcji (layout panelu dostarcza nagłówek i
 * nawigację). Kontekst „obecnego specjalisty" pochodzi z PanelProvider.
 *
 * Ekran pokazuje wizualny pipeline weryfikacji (stepper) oraz panel akcji
 * zależny od stanu: oczekiwanie (weryfikacja auto/ręczna), publikacja profilu
 * (go-live), stan opublikowany oraz ponowne zgłoszenie po odrzuceniu.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { ProfessionalRegistry, VerificationState } from '@/domain';
import type { Verification } from '@/domain';
import { useCurrentSpecialist } from '@/components/specialist/PanelProvider';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Chip,
} from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { BookingSuccess, ShieldCheck } from '@/components/illustrations';
import { Arrow, Sparkle } from '@/components/doodles';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Formatowanie dat — strefa Europe/Warsaw (spójnie w całym panelu)
 * ------------------------------------------------------------------ */

const TZ = 'Europe/Warsaw';
const dateTimeFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

/** Formatuje ISO 8601 do czytelnej daty (Europe/Warsaw); `null` gdy brak/nieprawidłowa. */
function formatWarsaw(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return dateTimeFmt.format(date);
}

/* ------------------------------------------------------------------ *
 * Słowniki prezentacyjne
 * ------------------------------------------------------------------ */

const REGISTRY_LABEL: Record<ProfessionalRegistry, string> = {
  [ProfessionalRegistry.KRL]: 'KRL — Krajowy Rejestr Logopedów',
  [ProfessionalRegistry.KIF]: 'KIF — Krajowa Izba Fizjoterapeutów',
};

interface StepDef {
  key: string;
  title: string;
  desc: string;
}

/** Główna oś pipeline'u (gałąź „weryfikacja ręczna" renderowana pod krokiem auto). */
const STEPS: readonly StepDef[] = [
  {
    key: 'zarejestrowany',
    title: 'Zarejestrowany',
    desc: 'Konto założone, numer PWZ w poprawnym formacie.',
  },
  {
    key: 'weryfikacja-auto',
    title: 'Weryfikacja automatyczna',
    desc: 'Sprawdzenie numeru PWZ w rejestrze KRL/KIF.',
  },
  {
    key: 'zweryfikowany',
    title: 'Zweryfikowany',
    desc: 'PWZ potwierdzony — profil roboczy z pełną edycją (D2).',
  },
  {
    key: 'opublikowany',
    title: 'Opublikowany',
    desc: 'Profil widoczny w wyszukiwarce i dostępny publicznie.',
  },
];

/** Indeks kroku na osi głównej dla danego stanu weryfikacji. */
const STATE_STEP_INDEX: Record<VerificationState, number> = {
  [VerificationState.Zarejestrowany]: 0,
  [VerificationState.WeryfikacjaAuto]: 1,
  [VerificationState.WeryfikacjaReczna]: 1,
  [VerificationState.Odrzucony]: 1,
  [VerificationState.Zweryfikowany]: 2,
  [VerificationState.Opublikowany]: 3,
};

type StepVisual = 'done' | 'active' | 'upcoming' | 'rejected';

const STEP_STATUS_A11Y: Record<StepVisual, string> = {
  done: 'ukończono',
  active: 'w toku',
  upcoming: 'oczekuje',
  rejected: 'odrzucono',
};

/** Wizualny status kroku `stepIndex` przy bieżącym `state`. */
function stepVisual(stepIndex: number, state: VerificationState): StepVisual {
  if (state === VerificationState.Opublikowany) return 'done';
  if (state === VerificationState.Odrzucony) {
    if (stepIndex === 0) return 'done';
    if (stepIndex === 1) return 'rejected';
    return 'upcoming';
  }
  const current = STATE_STEP_INDEX[state];
  if (stepIndex < current) return 'done';
  if (stepIndex === current) return 'active';
  return 'upcoming';
}

interface StateChipInfo {
  label: string;
  className: string;
}

/** Etykieta i kolory „pigułki" bieżącego stanu w nagłówku pipeline'u. */
function stateChipInfo(state: VerificationState): StateChipInfo {
  switch (state) {
    case VerificationState.Zarejestrowany:
      return { label: 'Zarejestrowany', className: 'bg-surface-subtle text-ink-muted' };
    case VerificationState.WeryfikacjaAuto:
      return { label: 'Weryfikacja automatyczna', className: 'bg-warning-50 text-warning-700' };
    case VerificationState.WeryfikacjaReczna:
      return { label: 'Weryfikacja ręczna', className: 'bg-warning-50 text-warning-700' };
    case VerificationState.Zweryfikowany:
      return { label: 'Zweryfikowany', className: 'bg-brand-50 text-brand-800' };
    case VerificationState.Opublikowany:
      return { label: 'Opublikowany', className: 'bg-brand-100 text-brand-800' };
    case VerificationState.Odrzucony:
      return { label: 'Odrzucony', className: 'bg-danger-50 text-danger-700' };
  }
}

/* ------------------------------------------------------------------ *
 * Ikony (dekoracyjne)
 * ------------------------------------------------------------------ */

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Stepper (wizualny pipeline C3 → D1 → D3)
 * ------------------------------------------------------------------ */

const MARKER_CLASSES: Record<StepVisual, string> = {
  done: 'border-brand-700 bg-brand-700 text-white',
  active: 'border-brand-600 bg-white text-brand-700',
  upcoming: 'border-slate-200 bg-surface-subtle text-ink-subtle',
  rejected: 'border-danger-600 bg-danger-600 text-white',
};

interface StepperProps {
  state: VerificationState;
}

function VerificationStepper({ state }: StepperProps) {
  return (
    <ol className="flex flex-col" aria-label="Etapy weryfikacji profilu">
      {STEPS.map((step, index) => {
        const visual = stepVisual(index, state);
        const isLast = index === STEPS.length - 1;
        const showBranch = step.key === 'weryfikacja-auto';
        const lineColor = visual === 'done' ? 'bg-brand-300' : 'bg-slate-200';

        return (
          <li
            key={step.key}
            className="flex gap-4"
            aria-current={visual === 'active' || visual === 'rejected' ? 'step' : undefined}
          >
            {/* Kolumna znacznika + łącznik (rozciąga się na wysokość treści) */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  MARKER_CLASSES[visual],
                )}
              >
                {visual === 'done' && <CheckIcon />}
                {visual === 'rejected' && <CrossIcon />}
                {visual === 'active' && (
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-600" aria-hidden="true" />
                )}
                {visual === 'upcoming' && <span aria-hidden="true">{index + 1}</span>}
              </span>
              {!isLast && (
                <span aria-hidden="true" className={cn('mt-1 w-0.5 flex-1 rounded-full', lineColor)} />
              )}
            </div>

            {/* Treść kroku */}
            <div className={cn('flex-1', isLast ? 'pb-0' : 'pb-6')}>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={cn(
                    'text-sm font-semibold',
                    visual === 'done' && 'text-ink',
                    visual === 'active' && 'text-brand-800',
                    visual === 'rejected' && 'text-danger-700',
                    visual === 'upcoming' && 'text-ink-subtle',
                  )}
                >
                  {step.title}
                </h3>
                <span className="sr-only">({STEP_STATUS_A11Y[visual]})</span>
                {visual === 'active' && (
                  <Chip className="bg-brand-50 text-brand-800">W toku</Chip>
                )}
              </div>
              <p
                className={cn(
                  'mt-0.5 text-sm',
                  visual === 'upcoming' ? 'text-ink-subtle' : 'text-ink-muted',
                )}
              >
                {step.desc}
              </p>

              {showBranch && <ManualBranch state={state} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Gałąź „weryfikacja ręczna — kolejka F1" pod krokiem weryfikacji automatycznej. */
function ManualBranch({ state }: { state: VerificationState }) {
  const isActive = state === VerificationState.WeryfikacjaReczna;
  const isRejected = state === VerificationState.Odrzucony;

  const tone = isActive
    ? 'border-warning-200 bg-warning-50 text-warning-700'
    : isRejected
      ? 'border-danger-200 bg-danger-50 text-danger-700'
      : 'border-slate-200 bg-surface-muted text-ink-subtle';

  return (
    <div className={cn('mt-3 flex gap-2 rounded-xl2 border border-dashed px-3 py-2 text-xs', tone)}>
      <span aria-hidden="true" className="mt-px font-semibold">
        ↳
      </span>
      <p>
        <span className="font-semibold">Weryfikacja ręczna — kolejka F1.</span>{' '}
        {isActive
          ? 'Zgłoszenie jest sprawdzane ręcznie przez administratora. SLA do 24 h roboczych.'
          : isRejected
            ? 'Zgłoszenie zostało rozpatrzone i odrzucone. Popraw dane i zgłoś ponownie.'
            : 'Gałąź awaryjna automatu — gdy automat nie potwierdzi PWZ, zgłoszenie trafia tu z SLA do 24 h roboczych.'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Wspólne style linków (tap target ≥ 44px, widoczny focus)
 * ------------------------------------------------------------------ */

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const primaryLinkCls = cn(
  'inline-flex min-h-[44px] select-none items-center justify-center gap-2 rounded-xl2 px-6 text-base font-medium',
  'bg-brand-700 text-white shadow-sm transition-colors hover:bg-brand-800 active:bg-brand-900',
  FOCUS_RING,
);

const outlineLinkCls = cn(
  'inline-flex min-h-[44px] select-none items-center justify-center gap-2 rounded-xl2 px-4 text-sm font-medium',
  'border border-brand-600 bg-white text-brand-700 transition-colors hover:bg-brand-50 active:bg-brand-100',
  FOCUS_RING,
);

/* ------------------------------------------------------------------ *
 * Panel „w toku" — definicja szczegółów PWZ / SLA
 * ------------------------------------------------------------------ */

function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="min-w-[9rem] text-sm text-ink-subtle">{term}</dt>
      <dd className="text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Ekran
 * ------------------------------------------------------------------ */

export default function WeryfikacjaPage() {
  const { specialist, loading: specialistLoading, error: specialistError } =
    useCurrentSpecialist();
  const specialistId = specialist?.id;
  const specialistSlug = specialist?.slug;

  const [verification, setVerification] = useState<Verification | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadVerification = useCallback(async () => {
    if (!specialistId) return;
    setLoadState('loading');
    setLoadError(null);
    try {
      const res = await apiClient.get<Verification>(
        `/api/specialists/${specialistId}/verification`,
      );
      if (res.status === 200) {
        setVerification(res.data);
        setLoadState('ready');
      } else if (res.status === 404) {
        setLoadError('Nie znaleziono danych weryfikacji dla tego profilu.');
        setLoadState('error');
      } else {
        setLoadError(`Nie udało się wczytać stanu weryfikacji (kod ${res.status}).`);
        setLoadState('error');
      }
    } catch {
      setLoadError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
      setLoadState('error');
    }
  }, [specialistId]);

  useEffect(() => {
    if (!specialistId) return;
    void loadVerification();
  }, [specialistId, loadVerification]);

  async function handleGoLive() {
    if (!specialistId) return;
    setActionPending(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await apiClient.post<Verification>(
        `/api/specialists/${specialistId}/go-live`,
      );
      if (res.status === 200) {
        setVerification(res.data);
        setActionNotice('Profil został opublikowany.');
      } else if (res.status === 409) {
        // Idempotencja: profil był już opublikowany — synchronizujemy stan.
        setActionNotice('Profil już opublikowany.');
        await loadVerification();
      } else if (res.status === 404) {
        setActionError('Nie znaleziono danych weryfikacji dla tego profilu.');
      } else {
        setActionError(`Nie udało się opublikować profilu (kod ${res.status}).`);
      }
    } catch {
      setActionError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setActionPending(false);
    }
  }

  async function handleResubmit() {
    if (!specialistId) return;
    setActionPending(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await apiClient.post<Verification>(
        `/api/specialists/${specialistId}/verification/resubmit`,
      );
      if (res.status === 200) {
        setVerification(res.data);
        setActionNotice('Zgłoszenie zostało ponownie przekazane do weryfikacji.');
      } else if (res.status === 409) {
        setActionNotice('Zgłoszenie jest już w toku weryfikacji.');
        await loadVerification();
      } else if (res.status === 404) {
        setActionError('Nie znaleziono danych weryfikacji dla tego profilu.');
      } else {
        setActionError(`Nie udało się ponowić zgłoszenia (kod ${res.status}).`);
      }
    } catch {
      setActionError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setActionPending(false);
    }
  }

  const showSkeleton = specialistLoading || (loadState === 'loading' && !verification);
  const pageError = specialistError ?? (loadState === 'error' ? loadError : null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink">Weryfikacja specjalisty</h1>
          <p className="max-w-2xl text-sm text-ink-muted">
            Śledź status weryfikacji numeru PWZ i opublikuj profil, gdy dane
            zostaną potwierdzone.
          </p>
        </div>
        <BeBadge
          endpoint="GET /api/specialists/:id/verification"
          desc="Stan weryfikacji, publikacja (go-live) i ponowne zgłoszenie pochodzą z zamockowanego backendu (MSW): silniki D1-verification i D3-golive."
          className="self-start"
        />
      </header>

      {showSkeleton && <PanelSkeleton />}

      {!showSkeleton && pageError && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          <span>{pageError}</span>
          {loadState === 'error' && !specialistError && (
            <Button variant="outline" size="sm" onClick={() => void loadVerification()}>
              Spróbuj ponownie
            </Button>
          )}
        </div>
      )}

      {!showSkeleton && !pageError && verification && specialistSlug && (
        <div className="flex flex-col gap-6">
          <PipelineCard state={verification.state} />

          <ActionCard
            verification={verification}
            specialistSlug={specialistSlug}
            actionPending={actionPending}
            actionError={actionError}
            actionNotice={actionNotice}
            onGoLive={handleGoLive}
            onResubmit={handleResubmit}
          />

          {verification.state !== VerificationState.Opublikowany && <DraftHintCard />}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Karta pipeline'u
 * ------------------------------------------------------------------ */

function PipelineCard({ state }: { state: VerificationState }) {
  const chip = stateChipInfo(state);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>Status weryfikacji</CardTitle>
            <p className="text-sm text-ink-muted">
              Ścieżka od rejestracji (C3), przez weryfikację PWZ (D1), po
              publikację profilu (D3).
            </p>
          </div>
          <ShieldCheck className="hidden h-16 w-16 shrink-0 sm:block" />
        </div>
        <div className="mt-1">
          <Chip className={chip.className}>Bieżący stan: {chip.label}</Chip>
        </div>
      </CardHeader>
      <CardContent>
        <VerificationStepper state={state} />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Karta akcji (zależna od stanu)
 * ------------------------------------------------------------------ */

interface ActionCardProps {
  verification: Verification;
  specialistSlug: string;
  actionPending: boolean;
  actionError: string | null;
  actionNotice: string | null;
  onGoLive: () => void;
  onResubmit: () => void;
}

function ActionCard({
  verification,
  specialistSlug,
  actionPending,
  actionError,
  actionNotice,
  onGoLive,
  onResubmit,
}: ActionCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <ActionBody
          verification={verification}
          specialistSlug={specialistSlug}
          actionPending={actionPending}
          onGoLive={onGoLive}
          onResubmit={onResubmit}
        />

        {actionNotice && (
          <p
            role="status"
            className="rounded-xl2 border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
          >
            {actionNotice}
          </p>
        )}
        {actionError && (
          <p
            role="alert"
            className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
          >
            {actionError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ActionBodyProps {
  verification: Verification;
  specialistSlug: string;
  actionPending: boolean;
  onGoLive: () => void;
  onResubmit: () => void;
}

function ActionBody({
  verification,
  specialistSlug,
  actionPending,
  onGoLive,
  onResubmit,
}: ActionBodyProps) {
  const { state } = verification;

  if (
    state === VerificationState.WeryfikacjaAuto ||
    state === VerificationState.WeryfikacjaReczna
  ) {
    return <InProgressBody verification={verification} />;
  }

  if (state === VerificationState.Zweryfikowany) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkle className="h-4 w-4 text-brand-500" />
          <h2 className="text-base font-semibold text-ink">Profil gotowy do publikacji</h2>
        </div>
        <p className="max-w-2xl text-sm text-ink-muted">
          Numer PWZ ({verification.pwzNumber}) został potwierdzony. Opublikuj
          profil, aby był widoczny w wyszukiwarce i dostępny publicznie.
        </p>
        <div className="flex items-center gap-2">
          <Button size="lg" loading={actionPending} onClick={onGoLive}>
            Opublikuj profil (go-live)
          </Button>
          <Arrow className="hidden h-6 w-10 text-brand-400 sm:block" />
        </div>
      </div>
    );
  }

  if (state === VerificationState.Opublikowany) {
    return (
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <BookingSuccess className="h-24 w-24 shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ink">Profil jest publiczny</h2>
            <Sparkle className="h-4 w-4 text-brand-500" />
          </div>
          <p className="max-w-2xl text-sm text-ink-muted">
            Twój profil jest widoczny w wyszukiwarce i dostępny pod publicznym
            adresem.
          </p>
          <div className="flex items-center gap-2">
            <Link href={`/profil/${specialistSlug}`} className={primaryLinkCls}>
              Zobacz profil publiczny
            </Link>
            <Arrow className="hidden h-6 w-10 text-brand-400 sm:block" />
          </div>
        </div>
      </div>
    );
  }

  if (state === VerificationState.Odrzucony) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">Weryfikacja odrzucona</h2>
        <div className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3">
          <p className="text-sm font-medium text-danger-700">Powód odrzucenia</p>
          <p className="mt-1 text-sm text-danger-700">
            {verification.rejectionReason ??
              'Nie podano szczegółowego powodu. Sprawdź poprawność numeru PWZ i danych profilu.'}
          </p>
        </div>
        <p className="max-w-2xl text-sm text-ink-muted">
          Popraw dane i zgłoś numer PWZ ponownie — zgłoszenie wróci do
          weryfikacji automatycznej.
        </p>
        <div>
          <Button size="lg" loading={actionPending} onClick={onResubmit}>
            Zgłoś ponownie
          </Button>
        </div>
      </div>
    );
  }

  // Stan `zarejestrowany` — weryfikacja jeszcze się nie rozpoczęła.
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-ink">Konto zarejestrowane</h2>
      <p className="max-w-2xl text-sm text-ink-muted">
        Weryfikacja numeru PWZ ({verification.pwzNumber}) rozpocznie się
        automatycznie. Odśwież stronę, aby zobaczyć aktualny status.
      </p>
    </div>
  );
}

function InProgressBody({ verification }: { verification: Verification }) {
  const isManual = verification.state === VerificationState.WeryfikacjaReczna;
  const slaDeadline = formatWarsaw(verification.slaDeadline);
  const submittedAt = formatWarsaw(verification.submittedAt);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-ink">Weryfikacja w toku</h2>
      <p className="max-w-2xl text-sm text-ink-muted">
        Trwa weryfikacja numeru PWZ {verification.pwzNumber} (
        {verification.registry}). SLA do 24 h roboczych.
        {isManual
          ? ' Zgłoszenie jest w ręcznej kolejce administratora (F1).'
          : ''}
      </p>

      <dl className="flex flex-col gap-2 rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-3">
        <DetailRow term="Numer PWZ">{verification.pwzNumber}</DetailRow>
        <DetailRow term="Rejestr">{REGISTRY_LABEL[verification.registry]}</DetailRow>
        {submittedAt && <DetailRow term="Zgłoszono">{submittedAt}</DetailRow>}
        {slaDeadline && <DetailRow term="Termin SLA">{slaDeadline}</DetailRow>}
      </dl>

      <p className="text-sm text-ink-subtle">
        Na tym etapie nie jest wymagane żadne działanie — czekaj na wynik
        weryfikacji.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sekcja D2 — co można robić w trakcie weryfikacji
 * ------------------------------------------------------------------ */

function DraftHintCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Co możesz robić w trakcie weryfikacji</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="max-w-2xl text-sm text-ink-muted">
          Nie musisz czekać z pustym profilem. Wersja robocza jest w pełni
          edytowalna (D2) — dodaj usługi i ustaw grafik, aby profil był gotowy
          w chwili publikacji.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/panel/uslugi" className={outlineLinkCls}>
            Usługi i ceny (E3)
          </Link>
          <Link href="/panel/grafik" className={outlineLinkCls}>
            Grafik i dostępność (E2)
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Skeleton ładowania
 * ------------------------------------------------------------------ */

function PanelSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Wczytuję stan weryfikacji…</span>
      <div aria-hidden="true" className="h-56 animate-pulse rounded-xl2 bg-surface-subtle" />
      <div aria-hidden="true" className="h-32 animate-pulse rounded-xl2 bg-surface-subtle" />
    </div>
  );
}
