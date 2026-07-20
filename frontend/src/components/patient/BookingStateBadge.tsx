import { BookingState } from '@/domain';
import { cn } from '@/lib/utils';

export interface BookingStateBadgeProps {
  /** Kanoniczny stan rezerwacji. */
  state: BookingState;
  className?: string;
}

/** Polskie etykiety stanów kanonicznych rezerwacji. */
const STATE_LABELS: Record<BookingState, string> = {
  [BookingState.Draft]: 'Szkic',
  [BookingState.Locked]: 'Zablokowany (10 min)',
  [BookingState.PendingPayment]: 'Oczekuje na płatność',
  [BookingState.PendingApproval]: 'Oczekuje na akceptację',
  [BookingState.Confirmed]: 'Potwierdzona',
  [BookingState.Completed]: 'Odbyta',
  [BookingState.CancelledByPatient]: 'Odwołana przez pacjenta',
  [BookingState.CancelledBySpecialist]: 'Odwołana przez specjalistę',
  [BookingState.NoShow]: 'Nieobecność',
  [BookingState.Disputed]: 'Spór',
};

type BadgeTone = 'brand' | 'warning' | 'danger' | 'neutral';

/**
 * Ton kolorystyczny per stan:
 *  - potwierdzona/odbyta → brand (sukces),
 *  - zablokowany/oczekujące/spór → warning,
 *  - odwołania/nieobecność → danger,
 *  - szkic → neutral.
 */
const STATE_TONES: Record<BookingState, BadgeTone> = {
  [BookingState.Draft]: 'neutral',
  [BookingState.Locked]: 'warning',
  [BookingState.PendingPayment]: 'warning',
  [BookingState.PendingApproval]: 'warning',
  [BookingState.Confirmed]: 'brand',
  [BookingState.Completed]: 'brand',
  [BookingState.CancelledByPatient]: 'danger',
  [BookingState.CancelledBySpecialist]: 'danger',
  [BookingState.NoShow]: 'danger',
  [BookingState.Disputed]: 'warning',
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  brand: 'border-brand-200 bg-brand-50 text-brand-800',
  warning: 'border-warning-200 bg-warning-50 text-warning-700',
  danger: 'border-danger-200 bg-danger-50 text-danger-700',
  neutral: 'border-slate-200 bg-surface-subtle text-ink-muted',
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  brand: 'bg-brand-600',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  neutral: 'bg-slate-400',
};

/**
 * Kolorowa pill z polską etykietą stanu rezerwacji. Kropka statusu jest czysto
 * dekoracyjna (aria-hidden) — znaczenie niesie tekst etykiety.
 */
export function BookingStateBadge({ state, className }: BookingStateBadgeProps) {
  const tone = STATE_TONES[state];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', DOT_CLASSES[tone])}
      />
      {STATE_LABELS[state]}
    </span>
  );
}
