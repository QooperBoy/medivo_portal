/**
 * MiniMap — autorska, samodzielna „mapka" lokalizacji specjalisty (prawa
 * kolumna karty A3). W 100% inline-SVG: BEZ zewnętrznych kafli/API/obrazów.
 *
 * To schemat, a nie realna geografia — pinezka jest umieszczana deterministycznie
 * na podstawie lat/lng (modulo → offset), więc ten sam adres zawsze wygląda tak
 * samo, ale układ „ulic" jest czysto dekoracyjny. Dyskretna etykieta
 * „Podgląd lokalizacji" oraz aria-label z przedrostkiem „Przybliżona" jasno
 * komunikują, że to podgląd. Komponent prezentacyjny (może być server component).
 */
import { cn } from '@/lib/utils';

export interface MiniMapProps {
  city: string;
  street: string;
  /** Szerokość geograficzna (opcjonalna) — deterministyczny offset pinezki. */
  lat?: number;
  /** Długość geograficzna (opcjonalna) — deterministyczny offset pinezki. */
  lng?: number;
  className?: string;
}

/** Prosty, stabilny hash tekstu (fallback offsetu, gdy brak lat/lng). */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministyczny, czysto dekoracyjny offset pinezki względem środka mapki.
 * NIE odwzorowuje realnej geografii — jedynie różnicuje pozycję między adresami.
 */
function pinOffset(lat: number | undefined, lng: number | undefined, seedText: string): { dx: number; dy: number } {
  const seed =
    lat != null && lng != null
      ? Math.abs(Math.round(lat * 7919 + lng * 104729))
      : hashString(seedText);
  const dx = (seed % 41) - 20; // -20..20
  const dy = (Math.floor(seed / 41) % 31) - 15; // -15..15
  return { dx, dy };
}

/** Pinezka (glif) do etykiety adresu. Dekoracyjna. */
function PinGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-brand-700"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2a7 7 0 0 0-7 7c0 4.7 7 13 7 13s7-8.3 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

/**
 * Stylizowana mapka lokalizacji (schemat). Tło zieleni/szarości ustawia
 * gradient warstwy (Tailwind), a inline-SVG dorysowuje siatkę, abstrakcyjne
 * „ulice", zieleń i pinezkę. Brak `id` w SVG — bezpieczne przy wielu kartach.
 */
export function MiniMap({ city, street, lat, lng, className }: MiniMapProps) {
  const { dx, dy } = pinOffset(lat, lng, `${street}|${city}`);
  const cx = 160 + dx;
  const cy = 90 + dy;

  return (
    <div
      role="img"
      aria-label={`Przybliżona lokalizacja: ${street}, ${city}`}
      className={cn(
        'relative min-h-[180px] overflow-hidden rounded-xl2 border border-slate-200/70',
        'bg-gradient-to-br from-brand-50 via-surface-muted to-brand-100',
        className,
      )}
    >
      <svg
        viewBox="0 0 320 200"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        {/* Delikatna siatka */}
        <g stroke="#a7f3d0" strokeWidth="1" opacity="0.5">
          <path d="M40 0V200M80 0V200M120 0V200M160 0V200M200 0V200M240 0V200M280 0V200" />
          <path d="M0 40H320M0 80H320M0 120H320M0 160H320" />
        </g>

        {/* Zieleń / park (dekoracyjny obszar) */}
        <rect x="238" y="26" width="66" height="58" rx="10" fill="#a7f3d0" opacity="0.7" />
        <rect x="18" y="128" width="58" height="52" rx="10" fill="#a7f3d0" opacity="0.55" />

        {/* Abstrakcyjne „ulice" */}
        <g stroke="#ffffff" strokeLinecap="round" fill="none">
          <path d="M-10 120H330" strokeWidth="14" opacity="0.9" />
          <path d="M120 -10V210" strokeWidth="12" opacity="0.9" />
          <path d="M-10 24C90 60 150 40 330 96" strokeWidth="9" opacity="0.75" />
          <path d="M236 -10V210" strokeWidth="7" opacity="0.7" />
        </g>

        {/* Osie jezdni (delikatne przerywane linie) */}
        <g stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="6 7" opacity="0.6" fill="none">
          <path d="M-10 120H330" />
          <path d="M120 -10V210" />
        </g>

        {/* Kwartały zabudowy (jasne prostokąty) */}
        <g fill="#ffffff" opacity="0.55">
          <rect x="150" y="54" width="34" height="26" rx="4" />
          <rect x="170" y="140" width="30" height="28" rx="4" />
          <rect x="40" y="46" width="26" height="24" rx="4" />
        </g>

        {/* Pinezka brand (schemat pozycji) */}
        <g transform={`translate(${cx} ${cy})`}>
          <ellipse cx="0" cy="26" rx="11" ry="3.5" fill="#064e3b" opacity="0.18" />
          <path
            d="M0 -24C-10 -24 -18 -16 -18 -6 -18 8 0 26 0 26 0 26 18 8 18 -6 18 -16 10 -24 0 -24Z"
            fill="#047857"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="-6" r="6" fill="#ffffff" />
        </g>
      </svg>

      {/* Etykieta trybu podglądu (dyskretna) */}
      <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-medium text-ink-subtle shadow-sm">
        Podgląd lokalizacji
      </span>

      {/* Nakładka z adresem */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-white/95 via-white/80 to-transparent px-3 pb-2.5 pt-8">
        <PinGlyph />
        <span className="min-w-0 truncate text-xs font-medium text-ink">
          {street}
          <span className="text-ink-subtle">, {city}</span>
        </span>
      </div>
    </div>
  );
}
