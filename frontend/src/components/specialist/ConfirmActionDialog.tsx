'use client';

/**
 * ConfirmActionDialog — proste, dostępne okno potwierdzenia akcji panelu
 * specjalisty (wymóg E7: nieobecność, odrzucenie, odwołanie przechodzą przez
 * jawne potwierdzenie). A11y: role="dialog", aria-modal, Esc, focus na
 * przycisku potwierdzenia, focus trap (Tab), zamykanie tłem / przyciskiem X,
 * blokada scrolla tła. W trakcie `loading` zamykanie jest zablokowane.
 */

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui';

export interface ConfirmActionDialogProps {
  /** Czy okno jest otwarte (gdy false — nic nie renderujemy). */
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Ton przycisku potwierdzenia — `danger` dla akcji destrukcyjnych. */
  tone?: 'default' | 'danger';
  /** Trwa żądanie — spinner na przycisku, zamykanie zablokowane. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Wewnętrzny panel — montowany dopiero gdy `open === true`, dzięki czemu efekty
 * montażu (focus, blokada scrolla, restore focus) uruchamiają się przy każdym
 * otwarciu.
 */
function ConfirmActionDialogInner({
  title,
  description,
  confirmLabel,
  tone = 'default',
  loading = false,
  onConfirm,
  onClose,
}: Omit<ConfirmActionDialogProps, 'open'>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (loadingRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !loading) onClose();
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
        aria-describedby={descId}
        className="my-0 flex w-full max-w-md flex-col gap-4 rounded-t-xl2 bg-white p-5 shadow-card sm:my-8 sm:rounded-xl2"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Zamknij okno potwierdzenia"
            className="-mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:pointer-events-none disabled:opacity-50"
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

        <div id={descId} className="text-sm text-ink-muted">
          {description}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Anuluj
          </Button>
          <Button
            ref={confirmRef}
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

export function ConfirmActionDialog(props: ConfirmActionDialogProps) {
  const { open, ...rest } = props;
  if (!open) return null;
  return <ConfirmActionDialogInner {...rest} />;
}
