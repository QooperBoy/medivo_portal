import { cn } from '@/lib/utils';

const STAR_PATH =
  'M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.74.99-5.79-4.21-4.1 5.82-.85z';

export interface RatingStarsProps {
  /** Ocena w skali 0–5 (obsługa połówek). */
  value: number;
  /** Liczba opinii (opcjonalnie) — wyświetlana w nawiasie. */
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

function Star({ fill, sizeClass }: { fill: number; sizeClass: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fill)) * 100);
  return (
    <span className={cn('relative inline-block', sizeClass)} aria-hidden="true">
      <svg
        viewBox="0 0 20 20"
        className={cn('absolute inset-0 text-slate-300', sizeClass)}
        fill="currentColor"
      >
        <path d={STAR_PATH} />
      </svg>
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        <svg
          viewBox="0 0 20 20"
          className={cn('block text-warning-500', sizeClass)}
          fill="currentColor"
        >
          <path d={STAR_PATH} />
        </svg>
      </span>
    </span>
  );
}

/**
 * Prezentacja oceny gwiazdkami (0–5, połówki). Informacyjnie pokazuje liczbę
 * opinii. Nie eksponuje rankingu/superlatywów — wyłącznie średnią i wolumen.
 */
export function RatingStars({
  value,
  count,
  size = 'md',
  className,
}: RatingStarsProps) {
  const clamped = Math.max(0, Math.min(5, value));
  const formatted = clamped.toFixed(1).replace('.', ',');
  const label = `ocena ${formatted} na 5${count != null ? `, na podstawie ${count} opinii` : ''}`;
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      role="img"
      aria-label={label}
    >
      <span className="inline-flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} fill={clamped - i} sizeClass={sizeClass} />
        ))}
      </span>
      <span className={cn('font-semibold text-ink', textClass)} aria-hidden="true">
        {formatted}
      </span>
      {count != null && (
        <span className={cn('text-ink-subtle', textClass)} aria-hidden="true">
          ({count})
        </span>
      )}
    </span>
  );
}
