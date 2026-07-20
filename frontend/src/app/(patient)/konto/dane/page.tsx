'use client';

/**
 * (patient) /konto/dane — dane konta i samoobsługa RODO (B9).
 *
 *  - Dane konta (imię, nazwisko, e-mail, telefon) pochodzą z sesji (useAuth).
 *  - Eksport danych (RODO, silnik G11): POST /api/patients/rodo/export?email= →
 *    z odpowiedzi budujemy plik `moje-dane.json` (Blob + URL.createObjectURL,
 *    programowe kliknięcie <a download>).
 *  - Usunięcie danych (RODO, silnik G11): POST /api/patients/rodo/erase?email=
 *    po potwierdzeniu w oknie modalnym (operacja nieodwracalna w demo).
 *
 * A11y: okno potwierdzenia to role="dialog"/aria-modal z obsługą Esc, pułapką
 * fokusu i blokadą scrolla tła; fokus startowy na bezpiecznej akcji (Anuluj).
 * Guard i nawigacja konta pochodzą z layoutu grupy (patient).
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiClient } from '@/lib/api-client';
import type { RodoExport, User } from '@/domain';
import { Button, Card, CardContent } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { ShieldCheck } from '@/components/illustrations';

const EXPORT_PATH = '/api/patients/rodo/export';
const ERASE_PATH = '/api/patients/rodo/erase';

/** Komunikat statusowy z tonem (sukces/błąd). */
interface StatusMsg {
  tone: 'success' | 'error';
  text: string;
}

export default function DanePage() {
  const { user } = useAuth();
  // Guard i nawigacja są w layoucie grupy (patient); tu user jest pacjentem.
  if (!user) return null;
  return <DataSection user={user} />;
}

function DataSection({ user }: { user: User }) {
  const accountRows: readonly { label: string; value: string }[] = [
    { label: 'Imię', value: user.firstName },
    { label: 'Nazwisko', value: user.lastName },
    { label: 'E-mail', value: user.email },
    { label: 'Telefon', value: user.phone ?? '—' },
  ];

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-ink">Moje dane</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          Podgląd danych konta oraz samoobsługa RODO — eksport i usunięcie
          danych obsługiwane przez rejestr zgód (silnik G11).
        </p>
        <BeBadge
          endpoint="POST /api/patients/rodo/*"
          desc="Eksport i usunięcie danych pacjenta (silnik G11). Dane z zamockowanego backendu (MSW)."
          className="self-start"
        />
      </header>

      {/* Dane konta */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-ink">Dane konta</h3>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {accountRows.map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  {row.label}
                </dt>
                <dd className="text-sm text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <ExportCard email={user.email} />
      <EraseCard email={user.email} />
      <PrivacyInfoCard />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Eksport danych (RODO)
 * ------------------------------------------------------------------ */

function ExportCard({ email }: { email: string }) {
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<StatusMsg | null>(null);

  async function handleExport() {
    setExporting(true);
    setMsg(null);
    try {
      const res = await apiClient.post<RodoExport>(
        `${EXPORT_PATH}?email=${encodeURIComponent(email)}`,
      );
      if (res.status === 200) {
        // Budujemy plik do pobrania z JSON-a odpowiedzi.
        const json = JSON.stringify(res.data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'moje-dane.json';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);

        const { bookings, reviews, waitlist } = res.data;
        setMsg({
          tone: 'success',
          text: `Pobrano plik moje-dane.json (${bookings.length} rezerwacji, ${reviews.length} opinii, ${waitlist.length} wpisów na liście oczekujących).`,
        });
      } else {
        setMsg({
          tone: 'error',
          text: `Nie udało się przygotować eksportu (kod ${res.status}).`,
        });
      }
    } catch {
      setMsg({
        tone: 'error',
        text: 'Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.',
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-ink">Eksport danych (RODO)</h3>
          <p className="max-w-2xl text-sm text-ink-muted">
            Pobierz kopię swoich danych z platformy — rezerwacje, opinie oraz
            wpisy na liście oczekujących — w formacie JSON.
          </p>
        </div>

        <div>
          <Button variant="primary" loading={exporting} onClick={() => void handleExport()}>
            Pobierz moje dane (JSON)
          </Button>
        </div>

        {msg && (
          <p
            role="status"
            aria-live="polite"
            className={
              msg.tone === 'success'
                ? 'rounded-xl2 border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800'
                : 'rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700'
            }
          >
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Usunięcie danych (RODO) + okno potwierdzenia
 * ------------------------------------------------------------------ */

function EraseCard({ email }: { email: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [erased, setErased] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleErase() {
    setErasing(true);
    setError(null);
    try {
      const res = await apiClient.post<{ ok: boolean }>(
        `${ERASE_PATH}?email=${encodeURIComponent(email)}`,
      );
      if (res.status === 200) {
        setConfirmOpen(false);
        setErased(true);
      } else {
        setConfirmOpen(false);
        setError(`Nie udało się zlecić usunięcia danych (kod ${res.status}).`);
      }
    } catch {
      setConfirmOpen(false);
      setError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setErasing(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-ink">Usunięcie danych (RODO)</h3>
          <p className="max-w-2xl text-sm text-ink-muted">
            Zlecenie usunięcia danych osobowych z Twojego konta. W wersji demo
            operacja jest nieodwracalna — dane w rezerwacjach zostaną
            zanonimizowane.
          </p>
        </div>

        {erased ? (
          <p
            role="status"
            className="rounded-xl2 border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
          >
            Zlecono usunięcie danych (rejestr zgód/RODO, silnik G11).
          </p>
        ) : (
          <>
            <div>
              <Button
                variant="danger"
                onClick={() => {
                  setError(null);
                  setConfirmOpen(true);
                }}
              >
                Usuń moje dane
              </Button>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
              >
                {error}
              </p>
            )}
          </>
        )}
      </CardContent>

      {confirmOpen && (
        <ConfirmEraseDialog
          erasing={erasing}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void handleErase()}
        />
      )}
    </Card>
  );
}

interface ConfirmEraseDialogProps {
  erasing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmEraseDialog({ erasing, onCancel, onConfirm }: ConfirmEraseDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const erasingRef = useRef(erasing);
  erasingRef.current = erasing;
  const titleId = useId();
  const descId = useId();

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
        if (erasingRef.current) return;
        event.preventDefault();
        onCancelRef.current();
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
    cancelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !erasing) onCancel();
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
        className="my-0 flex w-full max-w-md flex-col gap-5 rounded-t-xl2 bg-white p-5 shadow-card sm:my-8 sm:rounded-xl2"
      >
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            Usunąć Twoje dane?
          </h2>
          <p id={descId} className="text-sm text-ink-muted">
            Zlecisz usunięcie danych osobowych z konta. Tej operacji nie można
            cofnąć w wersji demo — dane w Twoich rezerwacjach zostaną
            zanonimizowane.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button ref={cancelRef} type="button" variant="ghost" onClick={onCancel} disabled={erasing}>
            Anuluj
          </Button>
          <Button type="button" variant="danger" loading={erasing} onClick={onConfirm}>
            Usuń moje dane
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sekcja informacyjna o ochronie danych
 * ------------------------------------------------------------------ */

function PrivacyInfoCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <ShieldCheck className="h-20 w-20 shrink-0" />
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <h3 className="text-base font-semibold text-ink">Ochrona danych</h3>
          <p className="max-w-2xl text-sm text-ink-muted">
            Przetwarzamy dane zgodnie z RODO i zasadą minimalizacji — zbieramy
            tylko to, co niezbędne do obsługi wizyt. Masz prawo do wglądu,
            eksportu oraz usunięcia swoich danych. Zgody (w tym marketingowe)
            możesz wycofać w każdej chwili.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
