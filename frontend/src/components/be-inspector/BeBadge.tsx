import { cn } from '@/lib/utils';

export interface BeBadgeProps {
  /** Etykieta endpointu, np. „GET /api/specialists". */
  endpoint: string;
  /** Dłuższy opis (tooltip / title). */
  desc?: string;
  className?: string;
}

/**
 * Inline-badge sygnalizujący, że dane pochodzą z zamockowanego backendu (MSW).
 * Statyczny i informacyjny; `desc` trafia do atrybutu title (tooltip).
 */
export function BeBadge({ endpoint, desc, className }: BeBadgeProps) {
  return (
    <span
      title={desc}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="7" rx="2" />
        <rect x="3" y="13" width="18" height="7" rx="2" />
        <path d="M7 7.5h.01M7 16.5h.01" />
      </svg>
      <span>mock BE · {endpoint}</span>
    </span>
  );
}
