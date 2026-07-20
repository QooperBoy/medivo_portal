import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Pokazuje spinner i blokuje interakcję. */
  loading?: boolean;
}

const base = cn(
  'inline-flex select-none items-center justify-center gap-2 rounded-xl2 font-medium',
  'transition-colors focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'disabled:pointer-events-none disabled:opacity-60',
);

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900',
  secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100 active:bg-brand-200',
  outline:
    'border border-brand-600 bg-white text-brand-700 hover:bg-brand-50 active:bg-brand-100',
  ghost: 'text-ink-muted hover:bg-surface-subtle hover:text-ink active:bg-brand-50',
  danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-700 active:bg-danger-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm', // 44px — dotykowo
  lg: 'h-12 px-6 text-base', // 48px
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

/**
 * Bazowy przycisk design systemu. Warianty i rozmiary sterowane przez propsy;
 * `loading` dokłada spinner i ustawia aria-busy. md/lg spełniają 44px tap target.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    type,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
