'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { BookingState } from '@/domain';
import type {
  Booking,
  CreateBookingBody,
  ScoringInfo,
  Service,
  ServiceMode,
  Slot,
  Specialist,
} from '@/domain';
import { Avatar, Button, Chip } from '@/components/ui';
import { BookingSuccess } from '@/components/illustrations';
import { BookingStateBadge } from './BookingStateBadge';

export interface BookingDialogProps {
  specialist: Specialist;
  services: Service[];
  slot: Slot;
  onClose: () => void;
  /** Wywoływane po potwierdzeniu rezerwacji (stan `confirmed`). */
  onBooked?: (booking: Booking) => void;
}

/**
 * Kroki checkoutu:
 *  - `form`          — formularz danych pacjenta (A5);
 *  - `locked`        — slot zablokowany; po pobraniu scoringu (G7) rozgałęzienie bramki;
 *  - `payment`       — symulowany ekran płatności (bramka `payment`, po `pending_payment`);
 *  - `approval_sent` — prośba o akceptację wysłana (bramka `approval`, `pending_approval`);
 *  - `confirmed`     — sukces: wizyta umówiona (`confirmed`).
 */
type Step = 'form' | 'locked' | 'payment' | 'approval_sent' | 'confirmed';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

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

function formatPln(pln: number): string {
  return `${pln} zł`;
}

function serviceModeLabel(mode: ServiceMode): string {
  switch (mode) {
    case 'online':
      return 'online';
    case 'stacjonarnie':
      return 'stacjonarnie';
    default:
      return 'online lub stacjonarnie';
  }
}

/** Fallback scoringu, gdy `GET /api/patients/scoring` zawiedzie — nie blokujemy checkoutu. */
const FALLBACK_SCORING: ScoringInfo = {
  noShowCount: 0,
  gate: 'none',
  reason: 'Nie udało się pobrać scoringu — checkout w trybie standardowym.',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(name: string, email: string, phone: string): FormErrors {
  const errors: FormErrors = {};
  if (name.trim().length < 2) {
    errors.name = 'Podaj imię i nazwisko.';
  }
  if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Podaj poprawny adres e-mail.';
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) {
    errors.phone = 'Podaj numer telefonu (min. 9 cyfr).';
  }
  return errors;
}

/** Pojedynczy wiersz podsumowania (etykieta + wartość). */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-ink-subtle">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

/** Mały panel prezentujący przechwycony nagłówek przejścia stanu. */
function TransitionHint({ transition }: { transition: string }) {
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/70 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
        Nagłówek odpowiedzi (BE Inspector)
      </p>
      <p className="mt-0.5 font-mono text-xs text-brand-800">
        x-state-transition: {transition}
      </p>
    </div>
  );
}

/** Ostrzegawczy komunikat bramki scoringu (G7) — tytuł + uzasadnienie. */
function GateNotice({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl2 border border-warning-200 bg-warning-50 px-4 py-3">
      <p className="text-sm font-semibold text-warning-700">{title}</p>
      <p className="text-xs text-warning-700">{reason}</p>
    </div>
  );
}

/**
 * Modal checkoutu (A5/A6): formularz → lock slotu (draft→locked) → bramka scoringu (G7):
 *  - `none`     → potwierdzenie wprost (locked→confirmed);
 *  - `approval` → prośba o akceptację specjalisty (locked→pending_approval);
 *  - `payment`  → przedpłata online (locked→pending_payment → confirmed).
 * Dostępny (role=dialog, aria-modal, Esc, prosty focus trap), treść przewijalna,
 * layout niełamliwy (fixed inset-0).
 */
export function BookingDialog({
  specialist,
  services,
  slot,
  onClose,
  onBooked,
}: BookingDialogProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const titleId = 'booking-dialog-title';

  const [step, setStep] = useState<Step>('form');

  // Domyślna usługa: przypisana do slotu lub pierwsza z listy.
  const defaultServiceId = useMemo(() => {
    const fromSlot = slot.serviceId
      ? services.find((s) => s.id === slot.serviceId)
      : undefined;
    return (fromSlot ?? services[0])?.id ?? '';
  }, [services, slot.serviceId]);

  const [serviceId, setServiceId] = useState(defaultServiceId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [scoring, setScoring] = useState<ScoringInfo | null>(null);
  const [scoringLoading, setScoringLoading] = useState(false);

  // Przechwycone przejścia stanu (widoczne też w BE Inspectorze).
  const [lockTransition, setLockTransition] = useState<string | null>(null);
  const [gateTransition, setGateTransition] = useState<string | null>(null);
  const [confirmTransition, setConfirmTransition] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? services[0],
    [services, serviceId],
  );

  // Uporządkowany przebieg przejść (do „chipsów" na ekranie sukcesu).
  const journeyChips = useMemo(
    () =>
      [lockTransition, gateTransition, confirmTransition].filter(
        (t): t is string => Boolean(t),
      ),
    [lockTransition, gateTransition, confirmTransition],
  );

  // Focus trap + Esc + blokada scrolla tła (montaż jednorazowy).
  useEffect(() => {
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  // Po zmianie kroku przenieś fokus na nagłówek nowego widoku.
  useEffect(() => {
    const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
    target?.focus();
  }, [step]);

  /** Pobiera scoring pacjenta (G7); przy błędzie stosuje fallback `none`. */
  async function loadScoring(patientEmail: string): Promise<void> {
    setScoringLoading(true);
    try {
      const res = await apiClient.get<ScoringInfo>(
        '/api/patients/scoring?email=' + encodeURIComponent(patientEmail),
      );
      if (res.status === 200 && res.data && typeof res.data.gate === 'string') {
        setScoring(res.data);
      } else {
        setScoring(FALLBACK_SCORING);
      }
    } catch {
      setScoring(FALLBACK_SCORING);
    } finally {
      setScoringLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService) return;

    const nextErrors = validate(name, email, phone);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const body: CreateBookingBody = {
      specialistId: specialist.id,
      serviceId: selectedService.id,
      slotId: slot.id,
      patientName: name.trim(),
      patientEmail: email.trim(),
      patientPhone: phone.trim(),
      startsAt: slot.startsAt,
      pricePln: selectedService.pricePln,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiClient.post<Booking>('/api/bookings', body);
      if (res.status === 201) {
        setBooking(res.data);
        setLockTransition(res.stateTransition ?? 'draft→locked');
        setScoring(null);
        setGateTransition(null);
        setConfirmTransition(null);
        setStep('locked');
        // Bramka scoringu (G7): pobieramy PO zablokowaniu, dla e-maila z formularza.
        void loadScoring(body.patientEmail);
      } else if (res.status === 409) {
        setSubmitError(
          'Ten termin został właśnie zajęty przez kogoś innego. Wróć i wybierz inny termin.',
        );
      } else {
        setSubmitError('Nie udało się zablokować terminu. Spróbuj ponownie.');
      }
    } catch {
      setSubmitError('Błąd połączenia z serwerem. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Wspólna obsługa przejścia stanu rezerwacji (`POST .../transition`).
   * Przechwytuje `x-state-transition`, obsługuje 409/błąd sieci; przy sukcesie
   * woła `onOk(zaktualizowana rezerwacja, etykieta przejścia)`.
   */
  async function doTransition(
    to: BookingState,
    onOk: (updated: Booking, transition: string) => void,
  ): Promise<void> {
    if (!booking) return;
    const fromState = booking.state;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiClient.post<Booking>(
        '/api/bookings/' + booking.id + '/transition',
        { to },
      );
      if (res.status === 200) {
        const label = res.stateTransition ?? `${fromState}→${to}`;
        setBooking(res.data);
        onOk(res.data, label);
      } else if (res.status === 409) {
        setSubmitError(
          'Stan rezerwacji zmienił się w międzyczasie (409). Odśwież stronę i spróbuj ponownie.',
        );
      } else {
        setSubmitError('Nie udało się wykonać operacji. Spróbuj ponownie.');
      }
    } catch {
      setSubmitError('Błąd połączenia z serwerem. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  }

  /** Bramka `none` oraz finał płatności: przejście do `confirmed` → ekran sukcesu. */
  const handleConfirmVisit = () =>
    doTransition(BookingState.Confirmed, (updated, label) => {
      setConfirmTransition(label);
      setStep('confirmed');
      onBooked?.(updated);
    });

  /** Bramka `approval`: locked→pending_approval → ekran „prośba wysłana". */
  const handleRequestApproval = () =>
    doTransition(BookingState.PendingApproval, (_updated, label) => {
      setGateTransition(label);
      setStep('approval_sent');
    });

  /** Bramka `payment`: locked→pending_payment → symulowany ekran płatności. */
  const handleGoToPayment = () =>
    doTransition(BookingState.PendingPayment, (_updated, label) => {
      setGateTransition(label);
      setStep('payment');
    });

  /** Anulowanie płatności: pending_payment→cancelled_by_patient → zamknięcie modala. */
  const handleCancelPayment = () =>
    doTransition(BookingState.CancelledByPatient, () => {
      onClose();
    });

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  const priceText = selectedService ? formatPln(selectedService.pricePln) : '—';
  const termText = formatDateTime(slot.startsAt);

  const headerTitle =
    step === 'confirmed'
      ? 'Rezerwacja potwierdzona'
      : step === 'approval_sent'
        ? 'Prośba wysłana'
        : step === 'payment'
          ? 'Płatność online (symulacja)'
          : step === 'locked'
            ? 'Potwierdź rezerwację'
            : 'Rezerwacja wizyty';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="my-0 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl2 bg-white shadow-card sm:my-8 sm:rounded-xl2"
      >
        {/* Nagłówek modala */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/70 p-5">
          <div className="flex items-center gap-3">
            <Avatar src={specialist.photoUrl} alt={`${specialist.firstName} ${specialist.lastName}`} size={44} />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-ink">
                {headerTitle}
              </h2>
              <p className="text-sm text-ink-subtle">
                {specialist.firstName} {specialist.lastName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij okno rezerwacji"
            className="-mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5l-10 10" />
            </svg>
          </button>
        </div>

        {/* Treść (przewijalna) */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'form' && (
            <form onSubmit={handleCreate} className="flex flex-col gap-5" noValidate>
              <h3 data-autofocus tabIndex={-1} className="sr-only">
                Formularz rezerwacji
              </h3>

              {/* Podsumowanie terminu */}
              <div className="flex flex-col gap-2 rounded-xl2 border border-slate-200/70 bg-surface-muted p-4">
                <SummaryRow label="Termin" value={termText} />
                <SummaryRow
                  label="Forma wizyty"
                  value={slot.mode === 'online' ? 'online' : 'stacjonarnie'}
                />
                <SummaryRow label="Cena" value={priceText} />
              </div>

              {/* Wybór usługi */}
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-semibold text-ink">Wybierz usługę</legend>
                <div className="flex flex-col gap-2">
                  {services.map((service) => {
                    const active = service.id === serviceId;
                    return (
                      <label
                        key={service.id}
                        className={
                          'flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl2 border px-4 py-3 transition-colors ' +
                          (active
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-slate-200 bg-white hover:border-brand-300')
                        }
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="service"
                            value={service.id}
                            checked={active}
                            onChange={() => setServiceId(service.id)}
                            className="h-4 w-4 accent-brand-700"
                          />
                          <span className="flex flex-col">
                            <span className="text-sm font-medium text-ink">{service.name}</span>
                            <span className="text-xs text-ink-subtle">
                              {service.durationMin} min · {serviceModeLabel(service.mode)}
                            </span>
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-sm font-semibold text-ink">
                          {formatPln(service.pricePln)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Dane pacjenta */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="patient-name" className="text-sm font-medium text-ink">
                    Imię i nazwisko
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? 'patient-name-error' : undefined}
                    className="h-11 rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  />
                  {errors.name && (
                    <p id="patient-name-error" className="text-xs text-danger-600">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="patient-email" className="text-sm font-medium text-ink">
                    Adres e-mail
                  </label>
                  <input
                    id="patient-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? 'patient-email-error' : undefined}
                    className="h-11 rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  />
                  {errors.email && (
                    <p id="patient-email-error" className="text-xs text-danger-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="patient-phone" className="text-sm font-medium text-ink">
                    Telefon
                  </label>
                  <input
                    id="patient-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby={errors.phone ? 'patient-phone-error' : undefined}
                    className="h-11 rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  />
                  {errors.phone && (
                    <p id="patient-phone-error" className="text-xs text-danger-600">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="patient-notes" className="text-sm font-medium text-ink">
                    Uwagi <span className="font-normal text-ink-subtle">(opcjonalnie)</span>
                  </label>
                  <textarea
                    id="patient-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-y rounded-xl2 border border-slate-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  />
                </div>
              </div>

              {submitError && (
                <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  {submitError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Anuluj
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  Zablokuj termin
                </Button>
              </div>
            </form>
          )}

          {step === 'locked' && booking && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <h3 data-autofocus tabIndex={-1} className="text-lg font-semibold text-ink">
                  Termin zablokowany na 10 minut
                </h3>
                <BookingStateBadge state={booking.state} className="self-start" />
                <p className="text-sm text-ink-muted">
                  Zablokowaliśmy ten termin wyłącznie dla Ciebie na 10 minut (silnik
                  G5-slot-lock, TTL 10 min). W tym czasie dokończ rezerwację —
                  po upływie czasu termin wróci do puli wolnych.
                </p>
              </div>

              {lockTransition && <TransitionHint transition={lockTransition} />}

              <div className="flex flex-col gap-2 rounded-xl2 border border-slate-200/70 bg-surface-muted p-4">
                <SummaryRow label="Usługa" value={selectedService?.name ?? '—'} />
                <SummaryRow label="Termin" value={termText} />
                <SummaryRow label="Cena" value={priceText} />
                <SummaryRow label="Numer rezerwacji" value={booking.id} />
              </div>

              {/* Bramka scoringu (G7) */}
              {scoring === null ? (
                <p role="status" aria-live="polite" className="text-sm text-ink-subtle">
                  Sprawdzamy scoring pacjenta (G7)…
                </p>
              ) : scoring.gate === 'approval' ? (
                <GateNotice
                  title="Masz w historii nieobecność (scoring G7) — ta rezerwacja wymaga akceptacji specjalisty."
                  reason={scoring.reason}
                />
              ) : scoring.gate === 'payment' ? (
                <GateNotice
                  title="Wymagana przedpłata online (historia nieobecności, scoring G7)."
                  reason={scoring.reason}
                />
              ) : (
                <p className="text-sm text-ink-muted">{scoring.reason}</p>
              )}

              {submitError && (
                <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  {submitError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Zamknij
                </Button>
                {scoring !== null && scoring.gate === 'approval' && (
                  <Button
                    type="button"
                    variant="primary"
                    loading={submitting}
                    onClick={handleRequestApproval}
                  >
                    Wyślij prośbę o akceptację
                  </Button>
                )}
                {scoring !== null && scoring.gate === 'payment' && (
                  <Button
                    type="button"
                    variant="primary"
                    loading={submitting}
                    onClick={handleGoToPayment}
                  >
                    Przejdź do płatności
                  </Button>
                )}
                {scoring !== null && scoring.gate === 'none' && (
                  <Button
                    type="button"
                    variant="primary"
                    loading={submitting}
                    onClick={handleConfirmVisit}
                  >
                    Potwierdź rezerwację
                  </Button>
                )}
                {scoring === null && (
                  <Button type="button" variant="primary" loading disabled>
                    Potwierdź rezerwację
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 'payment' && booking && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <h3 data-autofocus tabIndex={-1} className="text-lg font-semibold text-ink">
                  Płatność online (symulacja)
                </h3>
                <BookingStateBadge state={booking.state} className="self-start" />
                <p className="text-sm text-ink-muted">
                  Ze względu na historię nieobecności (scoring G7) ta rezerwacja
                  wymaga przedpłaty online. Rezerwacja czeka teraz na płatność
                  (okno ~30 min), po opłaceniu zostanie potwierdzona.
                </p>
              </div>

              {gateTransition && <TransitionHint transition={gateTransition} />}

              <div className="flex flex-col gap-3 rounded-xl2 border border-slate-200/70 bg-surface-muted p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-ink-subtle">Do zapłaty</span>
                  <span className="text-right text-xl font-semibold text-ink">
                    {formatPln(booking.pricePln)}
                  </span>
                </div>
                <SummaryRow label="Usługa" value={selectedService?.name ?? '—'} />
                <SummaryRow label="Termin" value={termText} />
                <p className="text-xs text-ink-subtle">
                  To symulacja — brak realnej płatności. „Zapłać (symulacja)” od razu
                  potwierdzi rezerwację (pending_payment→confirmed).
                </p>
              </div>

              {submitError && (
                <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  {submitError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  loading={submitting}
                  onClick={handleCancelPayment}
                >
                  Anuluj płatność
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={submitting}
                  onClick={handleConfirmVisit}
                >
                  Zapłać (symulacja)
                </Button>
              </div>
            </div>
          )}

          {step === 'approval_sent' && booking && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <h3 data-autofocus tabIndex={-1} className="text-lg font-semibold text-ink">
                  Prośba wysłana — specjalista potwierdzi w panelu (E4)
                </h3>
                <BookingStateBadge state={booking.state} className="self-start" />
                <p className="text-sm text-ink-muted">
                  Ze względu na historię nieobecności (scoring G7) ta rezerwacja
                  wymaga akceptacji specjalisty. Prośba trafiła do panelu specjalisty —
                  otrzymasz potwierdzenie po jej zaakceptowaniu. Rezerwacji nie
                  potwierdzasz samodzielnie.
                </p>
              </div>

              {gateTransition && <TransitionHint transition={gateTransition} />}

              <div className="flex flex-col gap-2 rounded-xl2 border border-slate-200/70 bg-surface-muted p-4">
                <SummaryRow label="Usługa" value={selectedService?.name ?? '—'} />
                <SummaryRow label="Termin" value={termText} />
                <SummaryRow label="Cena" value={priceText} />
                <SummaryRow label="Numer rezerwacji" value={booking.id} />
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Zamknij
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => router.push('/rezerwacja/' + booking.id)}
                >
                  Zobacz potwierdzenie
                </Button>
              </div>
            </div>
          )}

          {step === 'confirmed' && booking && (
            <div className="flex flex-col items-center gap-5 text-center">
              <BookingSuccess className="h-32 w-32" />
              <div className="flex flex-col items-center gap-3">
                <h3 data-autofocus tabIndex={-1} className="text-lg font-semibold text-ink">
                  Wizyta umówiona
                </h3>
                <BookingStateBadge state={booking.state} />
                <p className="text-sm text-ink-muted">
                  Rezerwacja została potwierdzona. Pełen przebieg przejść stanu tej
                  rezerwacji zobaczysz w panelu BE Inspector w prawym dolnym rogu.
                </p>
              </div>

              {confirmTransition && (
                <div className="w-full">
                  <TransitionHint transition={confirmTransition} />
                </div>
              )}

              {journeyChips.length > 0 && (
                <div className="flex w-full flex-wrap items-center gap-2">
                  {journeyChips.map((t) => (
                    <Chip key={t} variant="brand">
                      {t.replace('→', ' → ')}
                    </Chip>
                  ))}
                </div>
              )}

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Zamknij
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => router.push('/rezerwacja/' + booking.id)}
                >
                  Zobacz potwierdzenie
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
