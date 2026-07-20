'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ChipVariant = 'default' | 'brand' | 'outline';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  /** Gdy podane — renderuje przycisk usuwania (×) z aria-label. */
  onRemove?: () => void;
  /** Etykieta a11y przycisku usuwania (domyślnie „Usuń"). */
  removeLabel?: string;
}

const chipVariants: Record<ChipVariant, string> = {
  default: 'bg-surface-subtle text-ink-muted',
  brand: 'bg-brand-50 text-brand-800',
  outline: 'border border-slate-300 bg-white text-ink-muted',
};

/**
 * Pill do filtrów / tagów specjalizacji. Opcjonalny `onRemove` dokłada przycisk
 * usuwania. Statyczny wariant to zwykły znacznik informacyjny.
 */
export function Chip({
  className,
  variant = 'default',
  onRemove,
  removeLabel = 'Usuń',
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
        chipVariants[variant],
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="-mr-1 ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </span>
  );
}
