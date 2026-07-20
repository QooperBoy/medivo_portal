'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { VerificationState } from '@/domain';
import type {
  ServiceMode,
  Slot,
  SlotsListResponse,
  SpecialistDetailResponse,
} from '@/domain';
import {
  Avatar,
  Button,
  Card,
  CardContent,
  Chip,
  RatingStars,
  SlotGrid,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { ShieldCheck } from '@/components/illustrations';
import { Blob, Sparkle } from '@/components/doodles';
import { BookingDialog } from './BookingDialog';
import { WaitlistJoinCard } from './WaitlistJoinCard';
import { SimilarSpecialists } from './SimilarSpecialists';

export interface ProfileClientProps {
  slug: string;
  /**
   * Id slotu ze skrótu rezerwacji (`/profil/{slug}?slot=...`, karta A3).
   * Gdy pasuje do wolnego slotu — BookingDialog otwiera się automatycznie (raz).
   */
  initialSlotId?: string;
}

type Status = 'loading' | 'error' | 'notFound' | 'success';

/** Liczba najbliższych terminów pokazywanych w nagłówku profilu (skrót rezerwacji). */
const HERO_SLOTS = 6;

const TZ = 'Europe/Warsaw';
const reviewDateFmt = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TZ,
});
const heroDayFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TZ,
});
const heroTimeFmt = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});
const heroAriaDayFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: TZ,
});

function serviceModeLabel(mode: ServiceMode): string {
  switch (mode) {
    case 'online':
      return 'online';
    case 'stacjonarnie':
      return 'stacjonarnie';
    default:
      return 'online lub stacjonarnie';
  }
}

function titleCase(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

/** Prosty szkielet ładowania profilu. */
function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse" aria-hidden="true">
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-24 w-24 shrink-0 rounded-full bg-surface-subtle" />
          <div className="flex flex-1 flex-col gap-3">
            <div className="h-6 w-1/2 rounded bg-surface-subtle" />
            <div className="h-4 w-1/3 rounded bg-surface-subtle" />
            <div className="h-4 w-2/3 rounded bg-surface-subtle" />
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 h-40 rounded-xl2 bg-surface-subtle" />
    </div>
  );
}

/** Komunikat błędu z możliwością ponowienia. */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <h1 className="text-xl font-semibold text-ink">Nie udało się wczytać profilu</h1>
          <p className="text-sm text-ink-muted">
            Wystąpił problem z połączeniem z zamockowanym backendem. Spróbuj ponownie
            za chwilę.
          </p>
          <Button type="button" variant="primary" onClick={onRetry}>
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Uprzejmy komunikat 404 z linkiem do wyszukiwarki. */
function NotFoundState() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <h1 className="text-xl font-semibold text-ink">Nie znaleziono specjalisty</h1>
          <p className="text-sm text-ink-muted">
            Ten profil nie istnieje lub nie jest już publiczny. Wróć do wyszukiwarki
            i wybierz specjalistę z listy.
          </p>
          <Link
            href="/szukaj"
            className="inline-flex h-11 items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            Przejdź do wyszukiwarki
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfileClient({ slug, initialSlotId }: ProfileClientProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState<SpecialistDetailResponse | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Auto-otwarcie rezerwacji ze skrótu `?slot=` wykonujemy najwyżej raz.
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setDetail(null);
    setSlots([]);

    (async () => {
      try {
        const res = await apiClient.get<SpecialistDetailResponse>(
          '/api/specialists/' + encodeURIComponent(slug),
        );
        if (!active) return;
        if (res.status === 404) {
          setStatus('notFound');
          return;
        }
        if (res.status !== 200) {
          setStatus('error');
          return;
        }
        setDetail(res.data);
        setStatus('success');

        // Sloty pobierane osobno (po id specjalisty, nie po slugu).
        const slotsRes = await apiClient.get<SlotsListResponse>(
          '/api/specialists/' + res.data.id + '/slots',
        );
        if (active && slotsRes.status === 200) {
          setSlots(slotsRes.data.items);
        }
      } catch {
        if (active) setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [slug, reloadKey]);

  // Skrót rezerwacji (A5): gdy `?slot=` pasuje do wolnego slotu — otwórz dialog raz.
  useEffect(() => {
    if (autoOpenedRef.current || !initialSlotId || slots.length === 0) return;
    const match = slots.find((s) => s.id === initialSlotId && s.status === 'available');
    if (match) {
      autoOpenedRef.current = true;
      setSelectedSlot(match);
    }
  }, [initialSlotId, slots]);

  function refreshSlots() {
    if (!detail) return;
    void (async () => {
      try {
        const res = await apiClient.get<SlotsListResponse>(
          '/api/specialists/' + detail.id + '/slots',
        );
        if (res.status === 200) setSlots(res.data.items);
      } catch {
        /* sloty opcjonalne — brak odświeżenia nie blokuje widoku */
      }
    })();
  }

  if (status === 'loading') return <ProfileSkeleton />;
  if (status === 'error') return <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />;
  if (status === 'notFound') return <NotFoundState />;
  if (!detail) return null;

  const fullName = `${detail.firstName} ${detail.lastName}`;
  const primaryCity = detail.addresses[0]?.city;
  // A8 (brak terminów): usługa domyślna do waitlisty + specjalizacja do „podobnych".
  const firstServiceId = detail.services[0]?.id;
  const primarySpecialization = detail.specializations[0];
  const verified =
    detail.verificationState === VerificationState.Opublikowany ||
    detail.verificationState === VerificationState.Zweryfikowany;
  const availableSlots = slots.filter((s) => s.status === 'available');
  const nearestSlots = [...availableSlots]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, HERO_SLOTS);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* Nagłówek profilu */}
      <Card className="relative overflow-hidden">
        <Blob className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 text-brand-100/70" />
        <CardContent className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar
            src={detail.photoUrl}
            alt={fullName}
            size={96}
            className="ring-4 ring-brand-50"
          />

          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-ink">{fullName}</h1>
              <p className="text-sm font-medium text-brand-800">{titleCase(detail.title)}</p>
            </div>

            {verified && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                <ShieldCheck className="h-4 w-4" />
                Zweryfikowany — {detail.registry} · nr PWZ {detail.pwzNumber}
              </span>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
              <RatingStars value={detail.ratingAvg} count={detail.ratingCount} />
              {primaryCity && (
                <span className="inline-flex items-center gap-1">
                  <Sparkle className="h-3.5 w-3.5 text-brand-400" />
                  {primaryCity}
                </span>
              )}
              <span className="font-semibold text-ink">od {detail.priceFromPln} zł</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-subtle">Języki:</span>
              {detail.languages.map((lang) => (
                <Chip key={lang} variant="outline">
                  {lang}
                </Chip>
              ))}
            </div>

            {nearestSlots.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl2 border border-brand-100 bg-brand-50/60 p-3">
                <span className="text-xs font-semibold text-ink">Najbliższe wolne terminy</span>
                <div className="flex flex-wrap gap-2">
                  {nearestSlots.map((slot) => {
                    const date = new Date(slot.startsAt);
                    const mode = slot.mode === 'online' ? 'online' : 'stacjonarnie';
                    const ariaLabel = `${heroAriaDayFmt.format(date)}, ${heroTimeFmt.format(date)}, ${mode}`;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        aria-label={`Zarezerwuj termin: ${ariaLabel}`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl2 border border-brand-200 bg-white px-3 py-1 text-sm text-brand-800 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        <span className="font-medium capitalize">{heroDayFmt.format(date)}</span>
                        <span className="font-semibold tabular-nums">{heroTimeFmt.format(date)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-1">
              <BeBadge
                endpoint="GET /api/specialists/:slug"
                desc="Profil specjalisty pobrany z zamockowanego backendu (MSW)."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sekcje profilu */}
      <Tabs defaultValue="terminy">
        <TabsList aria-label="Sekcje profilu specjalisty" className="flex-wrap">
          <TabsTrigger value="terminy">Terminy</TabsTrigger>
          <TabsTrigger value="o-mnie">O mnie</TabsTrigger>
          <TabsTrigger value="uslugi">Usługi</TabsTrigger>
          <TabsTrigger value="opinie">Opinie</TabsTrigger>
        </TabsList>

        {/* Terminy */}
        <TabsContent value="terminy">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-ink">Wybierz termin</h2>
                <BeBadge
                  endpoint="GET /api/specialists/:id/slots"
                  desc="Grafik obsługiwany przez silnik G5-slot-lock (nagłówek x-engine)."
                />
              </div>

              {availableSlots.length === 0 ? (
                <WaitlistJoinCard
                  specialistId={detail.id}
                  specialistName={fullName}
                  serviceId={firstServiceId}
                />
              ) : (
                <>
                  <p className="text-sm text-ink-muted">
                    Kliknij wolny termin, aby rozpocząć rezerwację. Wybór terminu
                    zablokuje go dla Ciebie na 10 minut.
                  </p>
                  <SlotGrid slots={slots} onSelect={(slot) => setSelectedSlot(slot)} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* O mnie */}
        <TabsContent value="o-mnie">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-ink">O mnie</h2>
              <p className="text-sm leading-relaxed text-ink-muted">{detail.bio}</p>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-ink">Specjalizacje</h3>
                <div className="flex flex-wrap gap-2">
                  {detail.specializations.map((spec) => (
                    <Chip key={spec} variant="brand">
                      {spec}
                    </Chip>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usługi */}
        <TabsContent value="uslugi">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-ink">Usługi</h2>
              <ul className="flex flex-col divide-y divide-slate-200/70">
                {detail.services.map((service) => (
                  <li
                    key={service.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-ink">{service.name}</span>
                      <span className="text-xs text-ink-subtle">
                        {service.durationMin} min · {serviceModeLabel(service.mode)}
                      </span>
                      {service.description && (
                        <span className="mt-1 text-xs text-ink-muted">
                          {service.description}
                        </span>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-ink">
                      {service.pricePln} zł
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Opinie */}
        <TabsContent value="opinie">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-ink">Opinie</h2>
                <p className="text-xs text-ink-subtle">
                  Opinie są przykładowe (dane demonstracyjne) — nie pochodzą od
                  rzeczywistych pacjentów.
                </p>
              </div>

              {detail.reviews.length === 0 ? (
                <p className="text-sm text-ink-muted">Brak opinii do wyświetlenia.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {detail.reviews.map((review) => (
                    <li
                      key={review.id}
                      className="flex flex-col gap-1.5 rounded-xl2 border border-slate-200/70 bg-surface-muted p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <RatingStars value={review.rating} size="sm" />
                        <span className="text-xs text-ink-subtle">
                          {reviewDateFmt.format(new Date(review.createdAt))}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-ink">{review.authorName}</p>
                      <p className="text-sm text-ink-muted">{review.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* A8: podobni specjaliści (zawsze pod profilem/opiniami). */}
      <SimilarSpecialists
        specialization={primarySpecialization}
        excludeSlug={detail.slug}
        city={primaryCity}
      />

      {selectedSlot && detail && (
        <BookingDialog
          specialist={detail}
          services={detail.services}
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onBooked={() => refreshSlots()}
        />
      )}
    </div>
  );
}
