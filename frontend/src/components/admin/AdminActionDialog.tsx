'use client';

/**
 * AdminActionDialog — współdzielony modal potwierdzenia akcji back office (F).
 *
 * Reużywalny w F1 (odrzucenie weryfikacji z powodem), F2 (odrzucenie opinii)
 * i F3 (wybór wyniku sporu). Slot `children` pozwala wstawić pole powodu lub
 * wybór opcji; walidację pól przeprowadza komponent-rodzic w `onConfirm`.
 *
 * Dostępność: role=dialog, aria-modal, zamknięcie klawiszem Esc / kliknięciem
 * w tło / przyciskiem, prosty focus trap (Tab/Shift+Tab), przywrócenie fokusu
 * po zamknięciu. Elementy dotykowe ≥ 44px. W trakcie `loading` zamknięcie
 * i przyciski są zablokowane.
 */

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui';

export interface AdminActionDialogProps {
  /** Czy modal jest otwarty. */
  open: boolean;
  /** Tytuł (nagłówek) modala. */
  title: string;
  /** Opcjonalny opis pod tytułem. */
  description?: string;
  /** Ton przycisku potwierdzenia (`danger` dla akcji nieodwracalnych / odrzuceń). */
  tone?: 'default' | 'danger';
  /** Etykieta przycisku potwierdzenia. */
  confirmLabel: string;
  /** Wywoływane po potwierdzeniu (walidacja pól po stronie rodzica). */
  onConfirm: () => void;
  /** Wywoływane przy zamknięciu (Esc, kliknięcie w tło, „Anuluj”). */
  onClose: () => void;
  /** Blokuje interakcje i pokazuje spinner na przycisku potwierdzenia. */
  loading?: boolean;
  /** Dodatkowa treść (pole powodu / wybór opcji). */
  children?: ReactNode;
}

/**
 * Wrapper montujący modal wyłącznie, gdy `open` — dzięki temu efekt focus trapa
 * ma jasny cykl życia (montaż = otwarcie, demontaż = zamknięcie).
 */
export function AdminActionDialog(props: AdminActionDialogProps) {
  if (!props.open) return null;
  return <DialogInner {...props} />;
}

function DialogInner({
  title,
  description,
  tone = 'default',
  confirmLabel,
  onConfirm,
  onClose,
  loading = false,
  children,
}: AdminActionDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const titleId = useId();
  const descId = useId();

  // Focus trap + Esc + blokada scrolla tła + przywrócenie fokusu (montaż jednorazowy).
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
        if (loadingRef.current) return;
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

    // Fokus początkowy: element z [data-autofocus], inaczej pierwszy focusowalny.
    const autofocus = panel?.querySelector<HTMLElement>('[data-autofocus]');
    (autofocus ?? getFocusable()[0] ?? panel)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (loading) return;
    if (event.target === event.currentTarget) onClose();
  }

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
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="my-0 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-xl2 bg-white shadow-card outline-none sm:my-8 sm:rounded-xl2"
      >
        {/* Nagłówek */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/70 p-5">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Zamknij okno"
            className="-mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:pointer-events-none disabled:opacity-60"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5l-10 10" />
            </svg>
          </button>
        </div>

        {/* Treść (przewijalna) */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-4">
            {description && (
              <p id={descId} className="text-sm text-ink-muted">
                {description}
              </p>
            )}
            {children}
          </div>
        </div>

        {/* Stopka akcji */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200/70 p-5">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
