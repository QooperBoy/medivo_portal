/**
 * SpecialistResultCard — karta wyniku wyszukiwania (A3) w układzie trzech sekcji.
 *
 *  LEWA   — tożsamość i opis: awatar, imię i nazwisko (link do profilu), tytuł,
 *           badge „PWZ zweryfikowany", ocena + liczba opinii, specjalizacje (max 3),
 *           „od {priceFromPln} zł", wycinek bio, adres, znacznik online oraz CTA.
 *  ŚRODEK — najbliższe wolne terminy INLINE (AvailabilityColumn); klik w termin
 *           prowadzi skrótem do rezerwacji (A5): `/profil/{slug}?slot={id}`.
 *  PRAWA  — stylizowana mapka lokalizacji (MiniMap; ukryta poniżej `lg`).
 *
 * Klik w nazwę/CTA → profil (A4). Komponent prezentacyjny.
 */
import Link from 'next/link';
import type { SpecialistSearchItem } from '@/domain';
import { Avatar, Card, Chip, RatingStars } from '@/components/ui';
import { AvailabilityColumn } from '@/components/patient/AvailabilityColumn';
import { MiniMap } from '@/components/patient/MiniMap';
import { cn } from '@/lib/utils';

const MAX_SPECIALIZATIONS = 3;

/** Kapitalizacja pierwszej litery (specjalizacje/tytuł w danych są małą literą). */
function capitalizeFirst(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Klasy CTA-linku (wariant outline, 44px tap target). */
const ctaClassName = cn(
  'inline-flex h-11 select-none items-center justify-center gap-2 rounded-xl2 border px-4 text-sm font-medium',
  'border-brand-600 bg-white text-brand-700 transition-colors hover:bg-brand-50 active:bg-brand-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
);

export interface SpecialistResultCardProps {
  specialist: SpecialistSearchItem;
}

export function SpecialistResultCard({ specialist }: SpecialistResultCardProps) {
  const {
    slug,
    firstName,
    lastName,
    title,
    specializations,
    bio,
    photoUrl,
    addresses,
    online,
    ratingAvg,
    ratingCount,
    priceFromPln,
    previewSlots,
  } = specialist;

  const fullName = `${firstName} ${lastName}`;
  const profileHref = `/profil/${slug}`;
  const primaryAddress = addresses[0] ?? null;
  const addressText = primaryAddress
    ? primaryAddress.street
      ? `${primaryAddress.street}, ${primaryAddress.city}`
      : primaryAddress.city
    : null;
  const visibleSpecializations = specializations.slice(0, MAX_SPECIALIZATIONS);
  const hiddenCount = specializations.length - visibleSpecializations.length;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-card-hover">
      <div className="grid gap-5 p-5 lg:grid-cols-[1.6fr_1.05fr_0.9fr] lg:gap-6">
        {/* LEWA — tożsamość i opis */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Avatar src={photoUrl} alt={fullName} size={64} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link
                href={profileHref}
                className="w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <h3 className="text-base font-semibold text-ink transition-colors hover:text-brand-800">
                  {fullName}
                </h3>
              </Link>
              <p className="text-sm text-ink-muted">{capitalizeFirst(title)}</p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Chip variant="brand">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheckIcon />
                    PWZ zweryfikowany
                  </span>
                </Chip>
                {online && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700">
                    <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
                    Wizyty online
                  </span>
                )}
              </div>
            </div>
          </div>

          <RatingStars value={ratingAvg} count={ratingCount} size="sm" />

          {visibleSpecializations.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Specjalizacje">
              {visibleSpecializations.map((spec) => (
                <li key={spec}>
                  <Chip variant="outline">{capitalizeFirst(spec)}</Chip>
                </li>
              ))}
              {hiddenCount > 0 && (
                <li>
                  <Chip variant="default">+{hiddenCount}</Chip>
                </li>
              )}
            </ul>
          )}

          {bio && <p className="line-clamp-2 text-sm text-ink-muted">{bio}</p>}

          <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
            {addressText && (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-ink-muted">
                <PinIcon />
                <span className="truncate">{addressText}</span>
              </span>
            )}
            <span className="whitespace-nowrap text-base font-semibold text-ink">
              od {priceFromPln} zł
            </span>
          </div>

          <Link href={profileHref} className={ctaClassName}>
            Zobacz profil
            <ChevronRightIcon />
          </Link>
        </div>

        {/* ŚRODEK — najbliższe wolne terminy (inline) */}
        <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h4 className="text-sm font-semibold text-ink">Najbliższe terminy</h4>
          <AvailabilityColumn slug={slug} slots={previewSlots} />
        </div>

        {/* PRAWA — mapka lokalizacji (ukryta poniżej lg) */}
        <div className="hidden lg:block lg:border-l lg:border-slate-200/70 lg:pl-6">
          {primaryAddress && (
            <MiniMap
              city={primaryAddress.city}
              street={primaryAddress.street}
              lat={primaryAddress.lat}
              lng={primaryAddress.lng}
              className="h-full"
            />
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Ikony inline (dekoracyjne, aria-hidden)
 * ------------------------------------------------------------------ */

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 1.5l6.5 2.3v5c0 4.4-2.9 7.3-6.5 8.7-3.6-1.4-6.5-4.3-6.5-8.7v-5L10 1.5zm3.2 6.2a1 1 0 0 0-1.4-1.4L9 9.1 8.2 8.3a1 1 0 1 0-1.4 1.4l1.5 1.5a1 1 0 0 0 1.4 0l3.5-3.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-ink-subtle"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
