'use client';

/**
 * Nagłówek panelu specjalisty — pokazuje „zalogowanego" specjalistę (mock).
 */

import { Avatar } from '@/components/ui';
import { useCurrentSpecialist } from './PanelProvider';

export function PanelHeader() {
  const { specialist, loading } = useCurrentSpecialist();

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-surface-subtle" />
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-40 animate-pulse rounded bg-surface-subtle" />
          <div className="h-3 w-24 animate-pulse rounded bg-surface-subtle" />
        </div>
      </div>
    );
  }

  if (!specialist) return null;

  const fullName = `${specialist.firstName} ${specialist.lastName}`;

  return (
    <div className="flex items-center gap-3">
      <Avatar src={specialist.photoUrl} alt={fullName} size={48} />
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
          Panel specjalisty
        </span>
        <span className="text-lg font-semibold text-ink">{fullName}</span>
      </div>
      <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
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
          <path d="M12 2l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V5z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        Zweryfikowany · {specialist.registry}
      </span>
    </div>
  );
}
