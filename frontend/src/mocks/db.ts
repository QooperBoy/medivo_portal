/**
 * In-memory "baza danych" mocka — seed specjalistów (psycholodzy /
 * psychoterapeuci / psychotraumatolodzy) wraz z usługami, grafikiem, opiniami
 * oraz operacje zapytań/mutacji używane przez handlery MSW.
 *
 * WAŻNE (ograniczenie prawne demo): OPINIE poniżej to dane PRZYKŁADOWE /
 * placeholdery na potrzeby prezentacji front-endu — NIE są prawdziwymi
 * wypowiedziami pacjentów. Teksty celowo neutralne: bez superlatywów,
 * rankingów i sformułowań typu "najlepszy" / "nr 1" / "lider".
 *
 * Dane są generowane raz przy inicjalizacji modułu. Sloty (grafik) liczone są
 * względem `new Date()` w momencie ładowania, więc terminy są zawsze "świeże".
 */

import {
  BookingState,
  ProfessionalRegistry,
  VerificationState,
  assertTransition,
  assertVerificationTransition,
} from '@/domain';
import type {
  AbuseFlag,
  AdminDisputeItem,
  AdminReviewItem,
  AdminUserItem,
  AdminVerificationItem,
  AuditEntry,
  Address,
  AddServiceBody,
  AddSlotBody,
  Booking,
  BookingListItem,
  BookingScope,
  CreateBookingBody,
  CreateReviewBody,
  CreateVacationBody,
  JoinWaitlistBody,
  LoginBody,
  NotificationPrefs,
  PatientBookingItem,
  RegisterPatientBody,
  RegisterSpecialistBody,
  Review,
  RodoExport,
  ScoringGate,
  ScoringInfo,
  Service,
  ServiceCatalogItem,
  ServiceMode,
  Session,
  SessionResponse,
  Slot,
  SlotMode,
  SlotStatus,
  Specialist,
  SpecialistTitle,
  SpecialistSearchItem,
  SpecialistsListResponse,
  SpecialistsQuery,
  SpecialistStats,
  Subscription,
  SubscriptionPlan,
  UpdateServiceBody,
  UpdateSpecialistBody,
  User,
  VacationBlock,
  Verification,
  WaitlistEntry,
} from '@/domain';

/* ------------------------------------------------------------------ *
 * Błędy domenowe warstwy mocka (mapowane w handlerach na kody HTTP)
 * ------------------------------------------------------------------ */

/** Slot niedostępny (już zarezerwowany) — handler mapuje na 409. */
export class SlotUnavailableError extends Error {
  readonly slotId: string;
  constructor(slotId: string) {
    super(`Termin ${slotId} jest już zajęty.`);
    this.name = 'SlotUnavailableError';
    this.slotId = slotId;
  }
}

/** Rezerwacja nie istnieje — handler mapuje na 404. */
export class BookingNotFoundError extends Error {
  readonly bookingId: string;
  constructor(bookingId: string) {
    super(`Nie znaleziono rezerwacji ${bookingId}.`);
    this.name = 'BookingNotFoundError';
    this.bookingId = bookingId;
  }
}

/** Termin (slot) nie istnieje — handler mapuje na 404. */
export class SlotNotFoundError extends Error {
  readonly slotId: string;
  constructor(slotId: string) {
    super(`Nie znaleziono terminu ${slotId}.`);
    this.name = 'SlotNotFoundError';
    this.slotId = slotId;
  }
}

/** Termin w statusie uniemożliwiającym blokadę (booked/locked) — handler mapuje na 409. */
export class SlotNotBlockableError extends Error {
  readonly slotId: string;
  readonly status: SlotStatus;
  constructor(slotId: string, status: SlotStatus) {
    super(`Nie można zablokować terminu ${slotId} (status: ${status}).`);
    this.name = 'SlotNotBlockableError';
    this.slotId = slotId;
    this.status = status;
  }
}

/** Usługa nie istnieje — handler mapuje na 404. */
export class ServiceNotFoundError extends Error {
  readonly serviceId: string;
  constructor(serviceId: string) {
    super(`Nie znaleziono usługi ${serviceId}.`);
    this.name = 'ServiceNotFoundError';
    this.serviceId = serviceId;
  }
}

/** Nazwa usługi spoza słownika wertykalu (F8) — handler mapuje na 400. */
export class CatalogServiceInvalidError extends Error {
  readonly catalogName: string;
  constructor(catalogName: string) {
    super(`Usługa „${catalogName}" jest spoza słownika (F8).`);
    this.name = 'CatalogServiceInvalidError';
    this.catalogName = catalogName;
  }
}

/** Rezerwacja nie pozwala na wystawienie opinii (stan ≠ completed) — handler mapuje na 409. */
export class ReviewNotAllowedError extends Error {
  readonly bookingId: string;
  readonly state: BookingState;
  constructor(bookingId: string, state: BookingState) {
    super(`Nie można wystawić opinii dla rezerwacji ${bookingId} (stan: ${state}).`);
    this.name = 'ReviewNotAllowedError';
    this.bookingId = bookingId;
    this.state = state;
  }
}

/** Opinia dla rezerwacji już istnieje (B5) — handler mapuje na 409. */
export class ReviewAlreadyExistsError extends Error {
  readonly bookingId: string;
  constructor(bookingId: string) {
    super(`Opinia dla rezerwacji ${bookingId} została już wystawiona.`);
    this.name = 'ReviewAlreadyExistsError';
    this.bookingId = bookingId;
  }
}

/* ------------------------------------------------------------------ *
 * Tablice stanu (in-memory). Eksportowane do inspekcji/testów.
 * ------------------------------------------------------------------ */

export const specialists: Specialist[] = [];
export const services: Service[] = [];
export const slots: Slot[] = [];
export const reviews: Review[] = [];
export const bookings: Booking[] = [];
export const verifications: Verification[] = [];

let bookingSeq = 0;
/** Sekwencja id usług dodawanych ręcznie w panelu (E3). */
let serviceSeq = 0;
/** Sekwencja id terminów dodawanych ręcznie w panelu (E2). */
let slotManualSeq = 0;
/** Sekwencja id opinii wystawianych przez pacjentów (B5). */
let reviewSeq = 0;
/** Sekwencja id wpisów na waitliście (grupa B, silnik G6). */
let waitlistSeq = 0;

/** Id specjalisty „zalogowanego" w panelu demo (Anna Kowalska). */
export const DEMO_SPECIALIST_ID = 'spec_1';

/** E-mail pacjenta DEMO (grupa B) — tożsamość identyfikowana po e-mailu. */
export const DEMO_PATIENT_EMAIL = 'pacjent@demo.pl';
/** Imię i nazwisko pacjenta DEMO (spójne z kontem `user_p1`). */
const DEMO_PATIENT_NAME = 'Jan Kowalczyk';
/** Telefon pacjenta DEMO (spójny z kontem `user_p1`). */
const DEMO_PATIENT_PHONE = '+48 600 100 200';

/**
 * Wskaźnik nieobecności pacjenta (scoring G7), kluczowany e-mailem. Seedowany
 * w `seedPanelBookings`; używany w `listSpecialistBookings` do wzbogacenia pozycji.
 */
export const patientNoShowByEmail: Record<string, number> = {};

/* ------------------------------------------------------------------ *
 * Narzędzia pomocnicze (deterministyczny PRNG, slug, formatowanie)
 * ------------------------------------------------------------------ */

/** Deterministyczny generator liczb (mulberry32) — stabilny seed między odświeżeniami. */
function makePrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mapa polskich znaków diakrytycznych → ASCII (dla slugów). */
const PL_DIACRITICS: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

/** kebab-case slug z polskiego tekstu (bez diakrytyków). */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => PL_DIACRITICS[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* ------------------------------------------------------------------ *
 * Definicje seedu specjalistów
 * ------------------------------------------------------------------ */

/** Przybliżone współrzędne centrów miast — do pinezki na stylizowanej mapce (A3/A4). */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Warszawa: { lat: 52.2297, lng: 21.0122 },
  Kraków: { lat: 50.0647, lng: 19.945 },
  Wrocław: { lat: 51.1079, lng: 17.0385 },
  Poznań: { lat: 52.4064, lng: 16.9252 },
  Gdańsk: { lat: 54.352, lng: 18.6466 },
  Łódź: { lat: 51.7592, lng: 19.456 },
};

interface ServiceSeed {
  name: string;
  durationMin: number;
  pricePln: number;
  mode: ServiceMode;
  description?: string;
}

interface SpecialistSeed {
  firstName: string;
  lastName: string;
  title: SpecialistTitle;
  city: string;
  street: string;
  postalCode: string;
  specializations: string[];
  online: boolean;
  /** Numer awatara pravatar (i.pravatar.cc/300?img=N). */
  img: number;
  ratingAvg: number;
  ratingCount: number;
  registry: ProfessionalRegistry;
  english: boolean;
  services: ServiceSeed[];
}

const SPECIALIST_SEEDS: SpecialistSeed[] = [
  {
    firstName: 'Anna',
    lastName: 'Kowalska',
    title: 'psycholog',
    city: 'Warszawa',
    street: 'ul. Piękna 12/4',
    postalCode: '00-539',
    specializations: ['terapia poznawczo-behawioralna', 'zaburzenia lękowe'],
    online: true,
    img: 5,
    ratingAvg: 4.8,
    ratingCount: 42,
    registry: ProfessionalRegistry.KRL,
    english: true,
    services: [
      { name: 'Konsultacja psychologiczna', durationMin: 50, pricePln: 160, mode: 'obie' },
      {
        name: 'Sesja terapii poznawczo-behawioralnej',
        durationMin: 60,
        pricePln: 200,
        mode: 'obie',
      },
    ],
  },
  {
    firstName: 'Piotr',
    lastName: 'Nowak',
    title: 'psychoterapeuta',
    city: 'Kraków',
    street: 'ul. Karmelicka 8',
    postalCode: '31-011',
    specializations: ['terapia psychodynamiczna', 'zaburzenia depresyjne'],
    online: false,
    img: 12,
    ratingAvg: 4.6,
    ratingCount: 28,
    registry: ProfessionalRegistry.KIF,
    english: false,
    services: [
      { name: 'Konsultacja psychoterapeutyczna', durationMin: 50, pricePln: 180, mode: 'stacjonarnie' },
      { name: 'Sesja terapii indywidualnej', durationMin: 60, pricePln: 220, mode: 'stacjonarnie' },
    ],
  },
  {
    firstName: 'Magdalena',
    lastName: 'Wiśniewska',
    title: 'psychoterapeuta',
    city: 'Wrocław',
    street: 'ul. Świdnicka 20',
    postalCode: '50-357',
    specializations: ['terapia par', 'terapia par i rodzin'],
    online: true,
    img: 20,
    ratingAvg: 4.9,
    ratingCount: 55,
    registry: ProfessionalRegistry.KRL,
    english: true,
    services: [
      { name: 'Konsultacja psychologiczna', durationMin: 50, pricePln: 170, mode: 'obie' },
      { name: 'Terapia par', durationMin: 90, pricePln: 280, mode: 'obie' },
      { name: 'Sesja terapii indywidualnej', durationMin: 60, pricePln: 210, mode: 'online' },
    ],
  },
  {
    firstName: 'Tomasz',
    lastName: 'Wójcik',
    title: 'psycholog',
    city: 'Poznań',
    street: 'ul. Półwiejska 15',
    postalCode: '60-101',
    specializations: ['terapia poznawczo-behawioralna', 'terapia uzależnień'],
    online: false,
    img: 33,
    ratingAvg: 4.5,
    ratingCount: 19,
    registry: ProfessionalRegistry.KIF,
    english: false,
    services: [
      { name: 'Konsultacja psychologiczna', durationMin: 50, pricePln: 150, mode: 'stacjonarnie' },
      { name: 'Sesja terapii uzależnień', durationMin: 60, pricePln: 190, mode: 'stacjonarnie' },
    ],
  },
  {
    firstName: 'Katarzyna',
    lastName: 'Kamińska',
    title: 'psychotraumatolog',
    city: 'Gdańsk',
    street: 'ul. Długa 33',
    postalCode: '80-802',
    specializations: ['psychotraumatologia', 'zaburzenia lękowe'],
    online: true,
    img: 45,
    ratingAvg: 4.7,
    ratingCount: 37,
    registry: ProfessionalRegistry.KRL,
    english: true,
    services: [
      { name: 'Konsultacja psychotraumatologiczna', durationMin: 50, pricePln: 190, mode: 'obie' },
      { name: 'Sesja terapii traumy', durationMin: 60, pricePln: 240, mode: 'obie' },
    ],
  },
  {
    firstName: 'Michał',
    lastName: 'Lewandowski',
    title: 'psychoterapeuta',
    city: 'Łódź',
    street: 'ul. Piotrkowska 104',
    postalCode: '90-001',
    specializations: ['terapia schematów', 'zaburzenia depresyjne'],
    online: false,
    img: 51,
    ratingAvg: 4.4,
    ratingCount: 23,
    registry: ProfessionalRegistry.KIF,
    english: false,
    services: [
      { name: 'Konsultacja psychoterapeutyczna', durationMin: 50, pricePln: 160, mode: 'stacjonarnie' },
      { name: 'Sesja terapii schematów', durationMin: 90, pricePln: 260, mode: 'stacjonarnie' },
    ],
  },
  {
    firstName: 'Agnieszka',
    lastName: 'Zielińska',
    title: 'psycholog',
    city: 'Warszawa',
    street: 'al. Jana Pawła II 42',
    postalCode: '00-716',
    specializations: ['terapia dzieci i młodzieży', 'zaburzenia lękowe'],
    online: true,
    img: 9,
    ratingAvg: 4.8,
    ratingCount: 48,
    registry: ProfessionalRegistry.KRL,
    english: false,
    services: [
      { name: 'Konsultacja psychologiczna', durationMin: 50, pricePln: 150, mode: 'obie' },
      { name: 'Sesja terapii dzieci i młodzieży', durationMin: 50, pricePln: 180, mode: 'obie' },
    ],
  },
  {
    firstName: 'Paweł',
    lastName: 'Szymański',
    title: 'psychoterapeuta',
    city: 'Kraków',
    street: 'ul. Grzegórzecka 10',
    postalCode: '30-089',
    specializations: ['terapia uzależnień', 'terapia poznawczo-behawioralna'],
    online: false,
    img: 15,
    ratingAvg: 4.3,
    ratingCount: 14,
    registry: ProfessionalRegistry.KIF,
    english: false,
    services: [
      { name: 'Konsultacja psychologiczna', durationMin: 50, pricePln: 140, mode: 'stacjonarnie' },
      { name: 'Sesja terapii uzależnień', durationMin: 60, pricePln: 200, mode: 'stacjonarnie' },
    ],
  },
  {
    firstName: 'Joanna',
    lastName: 'Woźniak',
    title: 'psychotraumatolog',
    city: 'Wrocław',
    street: 'ul. Legnicka 55',
    postalCode: '50-041',
    specializations: ['psychotraumatologia', 'terapia schematów'],
    online: true,
    img: 25,
    ratingAvg: 4.9,
    ratingCount: 60,
    registry: ProfessionalRegistry.KRL,
    english: true,
    services: [
      { name: 'Konsultacja psychotraumatologiczna', durationMin: 50, pricePln: 200, mode: 'obie' },
      { name: 'Sesja terapii traumy', durationMin: 60, pricePln: 250, mode: 'obie' },
      { name: 'Sesja terapii schematów', durationMin: 90, pricePln: 290, mode: 'online' },
    ],
  },
  {
    firstName: 'Marek',
    lastName: 'Dąbrowski',
    title: 'psycholog',
    city: 'Gdańsk',
    street: 'ul. Grunwaldzka 76',
    postalCode: '80-233',
    specializations: ['zaburzenia depresyjne', 'zaburzenia lękowe'],
    online: true,
    img: 60,
    ratingAvg: 4.6,
    ratingCount: 31,
    registry: ProfessionalRegistry.KIF,
    english: false,
    services: [
      { name: 'Konsultacja psychologiczna', durationMin: 50, pricePln: 150, mode: 'obie' },
      { name: 'Sesja terapii indywidualnej', durationMin: 60, pricePln: 210, mode: 'obie' },
    ],
  },
  {
    firstName: 'Ewa',
    lastName: 'Kozłowska',
    title: 'psychoterapeuta',
    city: 'Poznań',
    street: 'ul. Święty Marcin 29',
    postalCode: '61-501',
    specializations: ['terapia par', 'terapia dzieci i młodzieży'],
    online: false,
    img: 28,
    ratingAvg: 4.7,
    ratingCount: 40,
    registry: ProfessionalRegistry.KRL,
    english: false,
    services: [
      { name: 'Konsultacja psychologiczna', durationMin: 50, pricePln: 160, mode: 'stacjonarnie' },
      { name: 'Terapia par', durationMin: 90, pricePln: 270, mode: 'stacjonarnie' },
    ],
  },
  {
    firstName: 'Robert',
    lastName: 'Jankowski',
    title: 'psychoterapeuta',
    city: 'Łódź',
    street: 'al. Kościuszki 18',
    postalCode: '91-012',
    specializations: ['terapia psychodynamiczna', 'terapia schematów'],
    online: true,
    img: 47,
    ratingAvg: 4.5,
    ratingCount: 26,
    registry: ProfessionalRegistry.KIF,
    english: true,
    services: [
      { name: 'Konsultacja psychoterapeutyczna', durationMin: 50, pricePln: 170, mode: 'obie' },
      { name: 'Sesja terapii indywidualnej', durationMin: 60, pricePln: 220, mode: 'obie' },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Teksty opinii — DANE PRZYKŁADOWE (placeholdery), bez superlatywów/rankingów
 * ------------------------------------------------------------------ */

const REVIEW_TEXTS: string[] = [
  'Rozmowa przebiegła spokojnie, czułam się wysłuchana.',
  'Konkretne wskazówki pomogły mi uporządkować myśli.',
  'Miła atmosfera i poczucie bezpieczeństwa podczas sesji.',
  'Terapeuta cierpliwie tłumaczył kolejne kroki pracy.',
  'Elastyczne terminy i punktualność wizyt online.',
  'Po kilku spotkaniach zauważyłem realną zmianę w codziennym funkcjonowaniu.',
  'Podejście oparte na konkretnych ćwiczeniach między sesjami.',
  'Czułam, że mogę mówić otwarcie, bez poczucia oceniania.',
  'Sesje dla naszej pary pomogły nam lepiej się komunikować.',
  'Rzeczowe wsparcie w trudnym dla mnie okresie.',
];

const REVIEW_AUTHORS: string[] = [
  'Anna K.',
  'Marek W.',
  'Joanna P.',
  'Tomasz L.',
  'Karolina S.',
  'Michał R.',
  'Ewa N.',
  'Grzegorz T.',
];

/* ------------------------------------------------------------------ *
 * Generatory (bio, grafik, opinie)
 * ------------------------------------------------------------------ */

function makeBio(seed: SpecialistSeed): string {
  const specs = seed.specializations.join(', ');
  const tryb = seed.online ? 'online oraz stacjonarnie' : 'stacjonarnie';
  return (
    `${seed.title[0].toUpperCase()}${seed.title.slice(1)} z praktyką w obszarach: ${specs}. ` +
    `Prowadzę wizyty ${tryb} (${seed.city}). W pracy stawiam na współpracę opartą na ` +
    `zaufaniu i indywidualne podejście do potrzeb osoby zgłaszającej się po wsparcie.`
  );
}

/** Grafik na najbliższe ~14 dni (dni robocze), część slotów zajęta. */
function generateSlots(
  specialist: Specialist,
  serviceId: string,
  addressId: string,
  prng: () => number,
): Slot[] {
  const out: Slot[] = [];
  const now = new Date();
  const workingHours = [9, 10, 11, 14, 15, 16];

  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);
    const dow = day.getDay(); // 0 = niedziela, 6 = sobota
    if (dow === 0 || dow === 6) continue;

    for (const hour of workingHours) {
      // nie każdy slot istnieje — grafik bywa "dziurawy"
      if (prng() < 0.45) continue;

      const startsAt = new Date(day);
      startsAt.setHours(hour, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + 50 * 60 * 1000);
      const isBooked = prng() < 0.3;
      const mode: SlotMode = specialist.online
        ? prng() < 0.5
          ? 'online'
          : 'stacjonarnie'
        : 'stacjonarnie';

      out.push({
        id: `slot_${specialist.id}_${dayOffset}_${hour}`,
        specialistId: specialist.id,
        serviceId,
        addressId: mode === 'stacjonarnie' ? addressId : undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status: isBooked ? 'booked' : 'available',
        mode,
      });
    }
  }
  return out;
}

/** Opinie (placeholdery) — 2–6 na specjalistę, oceny 3–5 (przewaga 4–5). */
function generateReviews(specialist: Specialist, prng: () => number): Review[] {
  const count = 2 + Math.floor(prng() * 5); // 2..6
  const out: Review[] = [];
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const text = REVIEW_TEXTS[Math.floor(prng() * REVIEW_TEXTS.length)];
    const author = REVIEW_AUTHORS[Math.floor(prng() * REVIEW_AUTHORS.length)];
    const roll = prng();
    const rating = roll < 0.15 ? 3 : roll < 0.55 ? 4 : 5;
    const daysAgo = 5 + Math.floor(prng() * 120);
    const createdAt = new Date(nowMs - daysAgo * dayMs).toISOString();

    out.push({
      id: `rev_${specialist.id}_${i + 1}`,
      specialistId: specialist.id,
      authorName: author,
      rating,
      text,
      createdAt,
      status: 'approved',
      publishedAt: createdAt,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Seed (uruchamiany raz przy inicjalizacji modułu)
 * ------------------------------------------------------------------ */

function seed(): void {
  const prng = makePrng(1337);
  const submittedAt = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  SPECIALIST_SEEDS.forEach((s, index) => {
    const id = `spec_${index + 1}`;
    const slug = slugify(`${s.firstName} ${s.lastName}`);

    const coords = CITY_COORDS[s.city];
    const address: Address = {
      id: `addr_${id}_1`,
      label: 'Gabinet',
      street: s.street,
      city: s.city,
      postalCode: s.postalCode,
      lat: coords?.lat,
      lng: coords?.lng,
    };

    const specialistServices: Service[] = s.services.map((svc, si) => ({
      id: `svc_${id}_${si + 1}`,
      specialistId: id,
      name: svc.name,
      durationMin: svc.durationMin,
      pricePln: svc.pricePln,
      mode: svc.mode,
      description: svc.description,
    }));

    const priceFromPln = Math.min(...specialistServices.map((v) => v.pricePln));
    const languages = s.english ? ['polski', 'angielski'] : ['polski'];

    const specialist: Specialist = {
      id,
      slug,
      firstName: s.firstName,
      lastName: s.lastName,
      title: s.title,
      specializations: s.specializations,
      bio: makeBio(s),
      photoUrl: `https://i.pravatar.cc/300?img=${s.img}`,
      languages,
      addresses: [address],
      online: s.online,
      ratingAvg: s.ratingAvg,
      ratingCount: s.ratingCount,
      priceFromPln,
      verificationState: VerificationState.Opublikowany,
      pwzNumber: `${s.registry}-${1000000 + index}`,
      registry: s.registry,
    };

    specialists.push(specialist);
    services.push(...specialistServices);
    slots.push(...generateSlots(specialist, specialistServices[0].id, address.id, prng));
    reviews.push(...generateReviews(specialist, prng));
    verifications.push({
      specialistId: id,
      pwzNumber: specialist.pwzNumber,
      registry: s.registry,
      state: VerificationState.Opublikowany,
      submittedAt,
    });
  });

  // Rezerwacje panelu dla specjalisty demo (E1/E4/E7/E8) — po zaseedowaniu profili.
  seedPanelBookings();
  // Rezerwacje konta pacjenta demo (grupa B: B4/B5/B6) — po zaseedowaniu profili/usług.
  seedPatientBookings();
}

/* ------------------------------------------------------------------ *
 * Seed rezerwacji panelu specjalisty demo (spec_1) — E1/E4/E7/E8
 * ------------------------------------------------------------------ *
 * DANE PRZYKŁADOWE (placeholdery) pacjentów — wyłącznie na potrzeby prezentacji
 * panelu specjalisty. Nie są prawdziwymi danymi osobowymi.
 */

/** Deklaratywny opis rezerwacji panelu (przeliczany na `Booking` w seedzie). */
interface PanelBookingSeed {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  state: BookingState;
  /** Id usługi spec_1 (`svc_spec_1_1` = konsultacja, `svc_spec_1_2` = sesja CBT). */
  serviceId: string;
  /** Przesunięcie startu wizyty względem „teraz" w dniach (ujemne = przeszłość). */
  dayOffset: number;
  /** Godzina rozpoczęcia (dla slotów syntetycznych). */
  hour: number;
  /** Wskaźnik no-show pacjenta (scoring G7). */
  noShowCount: number;
  /** Czy powiązać z realnym, wolnym slotem spec_1 (→ oznaczany `booked`). */
  useRealSlot?: boolean;
  /** Uwagi pacjenta (opcjonalne). */
  notes?: string;
}

const PANEL_BOOKING_SEEDS: PanelBookingSeed[] = [
  // 2× pending_approval — do decyzji akceptuj/odrzuć (E4); scoring 1–2.
  {
    patientName: 'Katarzyna Wiśniewska',
    patientEmail: 'k.wisniewska@example.com',
    patientPhone: '+48 601 234 567',
    state: BookingState.PendingApproval,
    serviceId: 'svc_spec_1_1',
    dayOffset: 2,
    hour: 10,
    noShowCount: 1,
    notes: 'Pierwsza wizyta, proszę o kontakt telefoniczny przed terminem.',
  },
  {
    patientName: 'Marcin Zając',
    patientEmail: 'm.zajac@example.com',
    patientPhone: '+48 602 345 678',
    state: BookingState.PendingApproval,
    serviceId: 'svc_spec_1_2',
    dayOffset: 3,
    hour: 14,
    noShowCount: 2,
  },

  // 3× confirmed w przyszłości — 2 powiązane z realnymi slotami spec_1 (→ booked).
  {
    patientName: 'Aleksandra Krawczyk',
    patientEmail: 'a.krawczyk@example.com',
    patientPhone: '+48 603 456 789',
    state: BookingState.Confirmed,
    serviceId: 'svc_spec_1_1',
    dayOffset: 1,
    hour: 9,
    noShowCount: 0,
    useRealSlot: true,
  },
  {
    patientName: 'Tomasz Grabowski',
    patientEmail: 't.grabowski@example.com',
    patientPhone: '+48 604 567 890',
    state: BookingState.Confirmed,
    serviceId: 'svc_spec_1_1',
    dayOffset: 1,
    hour: 10,
    noShowCount: 0,
    useRealSlot: true,
  },
  {
    patientName: 'Magdalena Pawlak',
    patientEmail: 'm.pawlak@example.com',
    patientPhone: '+48 605 678 901',
    state: BookingState.Confirmed,
    serviceId: 'svc_spec_1_2',
    dayOffset: 5,
    hour: 15,
    noShowCount: 0,
  },

  // 2× confirmed w przeszłości — do „odbyła się" (E8) / „nie stawił się" (E7).
  {
    patientName: 'Rafał Adamczyk',
    patientEmail: 'r.adamczyk@example.com',
    patientPhone: '+48 606 789 012',
    state: BookingState.Confirmed,
    serviceId: 'svc_spec_1_2',
    dayOffset: -1,
    hour: 11,
    noShowCount: 0,
  },
  {
    patientName: 'Krzysztof Baran',
    patientEmail: 'k.baran@example.com',
    patientPhone: '+48 607 890 123',
    state: BookingState.Confirmed,
    serviceId: 'svc_spec_1_1',
    dayOffset: -2,
    hour: 15,
    noShowCount: 0,
  },

  // 2× completed — historia.
  {
    patientName: 'Barbara Duda',
    patientEmail: 'b.duda@example.com',
    patientPhone: '+48 608 901 234',
    state: BookingState.Completed,
    serviceId: 'svc_spec_1_1',
    dayOffset: -7,
    hour: 10,
    noShowCount: 0,
  },
  {
    patientName: 'Łukasz Wróbel',
    patientEmail: 'l.wrobel@example.com',
    patientPhone: '+48 609 012 345',
    state: BookingState.Completed,
    serviceId: 'svc_spec_1_2',
    dayOffset: -14,
    hour: 16,
    noShowCount: 2,
  },

  // 1× no_show — historia (E7); pacjent z wyższym wskaźnikiem scoringu.
  {
    patientName: 'Joanna Nowicka',
    patientEmail: 'j.nowicka@example.com',
    patientPhone: '+48 660 123 456',
    state: BookingState.NoShow,
    serviceId: 'svc_spec_1_1',
    dayOffset: -3,
    hour: 12,
    noShowCount: 3,
  },

  // 1× cancelled_by_patient + 1× cancelled_by_specialist — historia.
  {
    patientName: 'Anna Sikora',
    patientEmail: 'a.sikora@example.com',
    patientPhone: '+48 661 234 567',
    state: BookingState.CancelledByPatient,
    serviceId: 'svc_spec_1_2',
    dayOffset: -10,
    hour: 14,
    noShowCount: 1,
  },
  {
    patientName: 'Piotr Michalski',
    patientEmail: 'p.michalski@example.com',
    patientPhone: '+48 662 345 678',
    state: BookingState.CancelledBySpecialist,
    serviceId: 'svc_spec_1_1',
    dayOffset: -6,
    hour: 15,
    noShowCount: 0,
  },
];

/**
 * Tworzy rezerwacje panelu dla `DEMO_SPECIALIST_ID`, wiąże część `confirmed`
 * w przyszłości z realnymi, wolnymi slotami spec_1 (→ `booked`), oznacza kilka
 * kolejnych slotów jako `blocked` (ręczne blokady grafiku, E2) oraz uzupełnia
 * rejestr no-show (scoring G7). Wołane na końcu `seed()`.
 */
function seedPanelBookings(): void {
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Pula realnych, wolnych, przyszłych slotów spec_1 (rosnąco po czasie startu).
  const freeFutureSlots = slots
    .filter(
      (s) =>
        s.specialistId === DEMO_SPECIALIST_ID &&
        s.status === 'available' &&
        Date.parse(s.startsAt) > nowMs,
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  for (const item of PANEL_BOOKING_SEEDS) {
    // Rejestr no-show pacjenta (scoring G7) — kluczowany e-mailem.
    patientNoShowByEmail[item.patientEmail] = item.noShowCount;

    let slotId: string;
    let startsAtIso: string;

    const realSlot = item.useRealSlot ? freeFutureSlots.shift() : undefined;
    if (realSlot) {
      // Powiązanie z realnym slotem → oznacz jako zajęty.
      realSlot.status = 'booked';
      realSlot.lockedUntil = undefined;
      slotId = realSlot.id;
      startsAtIso = realSlot.startsAt;
    } else {
      // Slot syntetyczny (przeszłość lub brak realnego terminu w puli).
      const start = new Date(nowMs + item.dayOffset * dayMs);
      start.setHours(item.hour, 0, 0, 0);
      startsAtIso = start.toISOString();
      slotId = `slot_seed_${DEMO_SPECIALIST_ID}_${bookingSeq + 1}`;
    }

    const price = services.find((s) => s.id === item.serviceId)?.pricePln ?? 0;
    const startsMs = Date.parse(startsAtIso);
    // Utworzenie ~dobę przed wizytą (lub przed „teraz" dla terminów przyszłych).
    const createdAtIso = new Date(Math.min(nowMs, startsMs) - dayMs).toISOString();

    bookings.push({
      id: `bk_${++bookingSeq}`,
      specialistId: DEMO_SPECIALIST_ID,
      serviceId: item.serviceId,
      slotId,
      patientName: item.patientName,
      patientEmail: item.patientEmail,
      patientPhone: item.patientPhone,
      state: item.state,
      createdAt: createdAtIso,
      startsAt: startsAtIso,
      pricePln: price,
      notes: item.notes,
    });
  }

  // Ręczne blokady grafiku (E2): kilka kolejnych wolnych slotów spec_1 → blocked.
  for (const s of freeFutureSlots.slice(0, 3)) {
    s.status = 'blocked';
    s.lockedUntil = undefined;
  }
}

/* ------------------------------------------------------------------ *
 * Seed rezerwacji konta pacjenta demo (pacjent@demo.pl) — grupa B
 * ------------------------------------------------------------------ *
 * DANE PRZYKŁADOWE (placeholdery) — na potrzeby prezentacji strefy pacjenta
 * (B4 odwołanie, B5 opinia, B6 spór). Wizyty u różnych specjalistów
 * (spec_2..spec_5), z sensownymi usługami/cenami/terminami.
 */

/** Deklaratywny opis rezerwacji pacjenta demo (przeliczany na `Booking`). */
interface PatientBookingSeed {
  /** Specjalista wizyty (spec_2..spec_5). */
  specialistId: string;
  /** Usługa danego specjalisty (źródło ceny). */
  serviceId: string;
  /** Stan kanoniczny rezerwacji. */
  state: BookingState;
  /** Przesunięcie startu wizyty względem „teraz" w dniach (ujemne = przeszłość). */
  dayOffset: number;
  /** Godzina rozpoczęcia. */
  hour: number;
  /** Stabilny sufiks id rezerwacji (`bk_demo_<suffix>`). */
  idSuffix: string;
  /** Uwagi pacjenta (opcjonalne). */
  notes?: string;
}

const PATIENT_BOOKING_SEEDS: PatientBookingSeed[] = [
  // 1× confirmed w PRZYSZŁOŚCI — nadchodząca wizyta (możliwość odwołania, B4).
  {
    specialistId: 'spec_2',
    serviceId: 'svc_spec_2_1',
    state: BookingState.Confirmed,
    dayOffset: 4,
    hour: 12,
    idSuffix: 'confirmed',
    notes: 'Pierwsza wizyta — proszę o przypomnienie dzień wcześniej.',
  },
  // 1× completed w przeszłości — do wystawienia opinii (B5); BEZ istniejącej opinii.
  {
    specialistId: 'spec_3',
    serviceId: 'svc_spec_3_1',
    state: BookingState.Completed,
    dayOffset: -8,
    hour: 10,
    idSuffix: 'completed',
  },
  // 1× no_show w przeszłości — do sporu o nieobecność (B6).
  {
    specialistId: 'spec_4',
    serviceId: 'svc_spec_4_1',
    state: BookingState.NoShow,
    dayOffset: -5,
    hour: 15,
    idSuffix: 'no_show',
  },
  // 1× cancelled_by_patient — historia rezerwacji.
  {
    specialistId: 'spec_5',
    serviceId: 'svc_spec_5_2',
    state: BookingState.CancelledByPatient,
    dayOffset: -12,
    hour: 11,
    idSuffix: 'cancelled',
  },
];

/**
 * Tworzy rezerwacje konta pacjenta demo (`DEMO_PATIENT_EMAIL`). Terminy liczone
 * względem „teraz" (deterministyczne przesunięcia), ceny z usług specjalistów.
 * Sloty syntetyczne (`slot_demo_*`) — nie kolidują z grafikiem specjalistów.
 * Wołane na końcu `seed()`.
 */
function seedPatientBookings(): void {
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const item of PATIENT_BOOKING_SEEDS) {
    const start = new Date(nowMs + item.dayOffset * dayMs);
    start.setHours(item.hour, 0, 0, 0);
    const startsAtIso = start.toISOString();
    const startsMs = start.getTime();
    const price = services.find((s) => s.id === item.serviceId)?.pricePln ?? 0;
    // Utworzenie ~dobę przed wizytą (lub przed „teraz" dla terminów przyszłych).
    const createdAtIso = new Date(Math.min(nowMs, startsMs) - dayMs).toISOString();

    bookings.push({
      id: `bk_demo_${item.idSuffix}`,
      specialistId: item.specialistId,
      serviceId: item.serviceId,
      slotId: `slot_demo_${item.idSuffix}`,
      patientName: DEMO_PATIENT_NAME,
      patientEmail: DEMO_PATIENT_EMAIL,
      patientPhone: DEMO_PATIENT_PHONE,
      state: item.state,
      createdAt: createdAtIso,
      startsAt: startsAtIso,
      pricePln: price,
      notes: item.notes,
    });
  }
}

seed();

/* ------------------------------------------------------------------ *
 * Zapytania używane przez handlery MSW
 * ------------------------------------------------------------------ */

/** Czy specjalista pasuje do filtra trybu (na podstawie flagi online i usług). */
function matchesMode(specialist: Specialist, mode: ServiceMode): boolean {
  const specServices = services.filter((v) => v.specialistId === specialist.id);
  if (mode === 'online') {
    return (
      specialist.online || specServices.some((v) => v.mode === 'online' || v.mode === 'obie')
    );
  }
  if (mode === 'stacjonarnie') {
    return specServices.some((v) => v.mode === 'stacjonarnie' || v.mode === 'obie');
  }
  return specServices.some((v) => v.mode === 'obie');
}

/** Lista/wyszukiwarka specjalistów (publikowane profile) z filtrami. */
export function listSpecialists(query: SpecialistsQuery = {}): SpecialistsListResponse {
  const q = query.q?.trim().toLowerCase();
  const city = query.city?.trim().toLowerCase();
  const specialization = query.specialization?.trim().toLowerCase();

  const items = specialists.filter((s) => {
    if (s.verificationState !== VerificationState.Opublikowany) return false;

    if (q) {
      const haystack = [
        s.firstName,
        s.lastName,
        s.title,
        ...s.specializations,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (city) {
      const inCity = s.addresses.some((a) => a.city.toLowerCase() === city);
      if (!inCity) return false;
    }

    if (specialization) {
      const hit = s.specializations.some((sp) => sp.toLowerCase().includes(specialization));
      if (!hit) return false;
    }

    if (query.mode && !matchesMode(s, query.mode)) return false;

    return true;
  });

  // Availability batch (A3): dołącz najbliższe wolne terminy do każdej karty.
  const enriched: SpecialistSearchItem[] = items.map((s) => ({
    ...s,
    previewSlots: getPreviewSlots(s.id),
  }));

  return { items: enriched, total: enriched.length };
}

/**
 * Najbliższe wolne terminy specjalisty (inline sloty karty A3). Zwraca posortowane
 * rosnąco wolne, przyszłe sloty — na tyle, by karta mogła przewijać „więcej terminów".
 */
function getPreviewSlots(specialistId: string, limit = 12): Slot[] {
  const nowTs = Date.now();
  return slots
    .filter(
      (s) =>
        s.specialistId === specialistId &&
        s.status === 'available' &&
        Date.parse(s.startsAt) >= nowTs,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, limit);
}

/** Profil specjalisty po slugu (URL). */
export function getSpecialistBySlug(slug: string): Specialist | undefined {
  return specialists.find((s) => s.slug === slug);
}

/** Profil specjalisty po id (pomocnicze). */
export function getSpecialistById(id: string): Specialist | undefined {
  return specialists.find((s) => s.id === id);
}

/** Usługi danego specjalisty. */
export function getServicesBySpecialist(specialistId: string): Service[] {
  return services.filter((v) => v.specialistId === specialistId);
}

/** Opublikowane (zatwierdzone) opinie danego specjalisty. */
export function getReviewsBySpecialist(specialistId: string): Review[] {
  return reviews.filter((r) => r.specialistId === specialistId && r.status === 'approved');
}

/**
 * Sloty specjalisty w opcjonalnym zakresie [from, to] (ISO 8601).
 * Domyślnie POMIJA sloty `blocked` (publiczny odczyt — pacjent nie widzi blokad).
 * Panel grafiku prosi o `includeBlocked=true`, by pokazać ręczne blokady (E2).
 */
export function getSlots(
  specialistId: string,
  range: { from?: string; to?: string; includeBlocked?: boolean } = {},
): Slot[] {
  const fromTs = range.from ? Date.parse(range.from) : undefined;
  const toTs = range.to ? Date.parse(range.to) : undefined;
  const includeBlocked = range.includeBlocked === true;

  return slots.filter((s) => {
    if (s.specialistId !== specialistId) return false;
    if (!includeBlocked && s.status === 'blocked') return false;
    const ts = Date.parse(s.startsAt);
    if (fromTs !== undefined && !Number.isNaN(fromTs) && ts < fromTs) return false;
    if (toTs !== undefined && !Number.isNaN(toTs) && ts > toTs) return false;
    return true;
  });
}

/**
 * Tworzy rezerwację. Zgodnie z cyklem (silnik G5) zakłada lock na slocie
 * (TTL 10 min) i nadaje rezerwacji stan `locked`. Rzuca `SlotUnavailableError`,
 * gdy slot jest już zajęty (booked).
 */
export function createBooking(body: CreateBookingBody): Booking {
  const slot = slots.find((s) => s.id === body.slotId);
  // Slot zajęty (booked) lub ręcznie zablokowany (blocked, E2) → niedostępny.
  if (slot && (slot.status === 'booked' || slot.status === 'blocked')) {
    throw new SlotUnavailableError(body.slotId);
  }

  const now = new Date();
  const id = `bk_${++bookingSeq}`;
  const booking: Booking = {
    id,
    specialistId: body.specialistId,
    serviceId: body.serviceId,
    slotId: body.slotId,
    patientName: body.patientName,
    patientEmail: body.patientEmail,
    patientPhone: body.patientPhone,
    state: BookingState.Locked,
    createdAt: now.toISOString(),
    startsAt: body.startsAt,
    pricePln: body.pricePln,
    notes: body.notes,
  };
  bookings.push(booking);

  if (slot) {
    slot.status = 'locked';
    slot.lockedUntil = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  }

  return booking;
}

/** Odczyt pojedynczej rezerwacji. */
export function getBooking(id: string): Booking | undefined {
  return bookings.find((b) => b.id === id);
}

/**
 * Przejście stanu rezerwacji. Waliduje przejście przez `assertTransition`
 * (rzuca `InvalidBookingTransitionError` przy niedozwolonym). Aktualizuje też
 * status powiązanego slotu (confirmed → booked; anulacje → available).
 */
export function transitionBooking(
  id: string,
  to: BookingState,
  opts?: { late?: boolean },
): Booking {
  void opts; // `late` wpływa na dobór eventu w warstwie handlera (eventsForTransition)
  const booking = getBooking(id);
  if (!booking) throw new BookingNotFoundError(id);

  const from = booking.state;
  assertTransition(from, to); // rzuca przy niedozwolonym przejściu

  booking.state = to;

  const slot = slots.find((s) => s.id === booking.slotId);
  if (slot) {
    if (to === BookingState.Confirmed) {
      slot.status = 'booked';
      slot.lockedUntil = undefined;
    } else if (
      to === BookingState.CancelledByPatient ||
      to === BookingState.CancelledBySpecialist
    ) {
      slot.status = 'available';
      slot.lockedUntil = undefined;
    }
  }

  return booking;
}

/* ------------------------------------------------------------------ *
 * Panel specjalisty (E1) — „zalogowany" specjalista demo
 * ------------------------------------------------------------------ */

/** Zwraca specjalistę demo („zalogowanego" w panelu). */
export function getMeSpecialist(): Specialist {
  const specialist = getSpecialistById(DEMO_SPECIALIST_ID);
  if (!specialist) {
    // Nie powinno wystąpić — spec_1 jest zawsze zaseedowany.
    throw new Error(`Brak specjalisty demo (${DEMO_SPECIALIST_ID}).`);
  }
  return specialist;
}

/* ------------------------------------------------------------------ *
 * Panel: lista rezerwacji z filtrem po zakresie/stanie (E1/E4/E7/E8)
 * ------------------------------------------------------------------ */

/**
 * Rezerwacje danego specjalisty wzbogacone o dane pomocnicze panelu
 * (`patientNoShowCount` ze scoringu G7, `serviceName` z usług).
 *  - scope: pending=pending_approval, upcoming=confirmed w przyszłości,
 *    past=confirmed po terminie, history=stany zamknięte, all=wszystkie;
 *  - opcjonalny `state` dodatkowo zawęża do jednego stanu kanonicznego;
 *  - sort: upcoming/past rosnąco po startsAt, history malejąco.
 */
export function listSpecialistBookings(
  specialistId: string,
  opts: { scope?: BookingScope; state?: BookingState } = {},
): BookingListItem[] {
  const now = Date.now();
  const scope: BookingScope = opts.scope ?? 'all';

  const matchesScope = (b: Booking): boolean => {
    const ts = Date.parse(b.startsAt);
    switch (scope) {
      case 'pending':
        return b.state === BookingState.PendingApproval;
      case 'upcoming':
        return b.state === BookingState.Confirmed && ts >= now;
      case 'past':
        return b.state === BookingState.Confirmed && ts < now;
      case 'history':
        return (
          b.state === BookingState.Completed ||
          b.state === BookingState.NoShow ||
          b.state === BookingState.CancelledByPatient ||
          b.state === BookingState.CancelledBySpecialist
        );
      case 'all':
      default:
        return true;
    }
  };

  const filtered = bookings.filter(
    (b) =>
      b.specialistId === specialistId &&
      matchesScope(b) &&
      (opts.state === undefined || b.state === opts.state),
  );

  const enriched: BookingListItem[] = filtered.map((b) => ({
    ...b,
    patientNoShowCount: patientNoShowByEmail[b.patientEmail] ?? 0,
    serviceName: services.find((s) => s.id === b.serviceId)?.name ?? 'Wizyta',
  }));

  if (scope === 'upcoming' || scope === 'past') {
    enriched.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  } else if (scope === 'history') {
    enriched.sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  }

  return enriched;
}

/* ------------------------------------------------------------------ *
 * Panel: grafik / dostępność (E2) — blokady i ręczne dodawanie terminów
 * ------------------------------------------------------------------ */

/** Blokuje wolny termin (available → blocked). Booked/locked → 409; brak → 404. */
export function blockSlot(slotId: string): Slot {
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) throw new SlotNotFoundError(slotId);
  if (slot.status === 'blocked') return slot; // idempotentnie — już zablokowany
  if (slot.status !== 'available') throw new SlotNotBlockableError(slotId, slot.status);
  slot.status = 'blocked';
  slot.lockedUntil = undefined;
  return slot;
}

/** Zdejmuje blokadę terminu (blocked → available). Pozostałe statusy: no-op; brak → 404. */
export function unblockSlot(slotId: string): Slot {
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) throw new SlotNotFoundError(slotId);
  if (slot.status === 'blocked') {
    slot.status = 'available';
    slot.lockedUntil = undefined;
  }
  // available/booked/locked — termin nie był zablokowany, zwracamy bez zmian.
  return slot;
}

/** Dodaje nowy, wolny termin do grafiku (E2). */
export function addSlot(specialistId: string, body: AddSlotBody): Slot {
  const specialist = getSpecialistById(specialistId);
  const addressId =
    body.mode === 'stacjonarnie' ? specialist?.addresses[0]?.id : undefined;

  const slot: Slot = {
    id: `slot_manual_${++slotManualSeq}`,
    specialistId,
    serviceId: body.serviceId,
    addressId,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    status: 'available',
    mode: body.mode,
  };
  slots.push(slot);
  return slot;
}

/* ------------------------------------------------------------------ *
 * Panel: usługi i cennik (E3) — CRUD ze słownika wertykalu (F8)
 * ------------------------------------------------------------------ */

/** Słownik dozwolonych nazw usług wertykalu (F8) z podpowiedziami czasu/ceny. */
const SERVICE_CATALOG: ServiceCatalogItem[] = [
  { name: 'Konsultacja psychologiczna', defaultDurationMin: 50, suggestedPricePln: 160 },
  { name: 'Sesja terapii indywidualnej', defaultDurationMin: 60, suggestedPricePln: 200 },
  {
    name: 'Sesja terapii poznawczo-behawioralnej',
    defaultDurationMin: 60,
    suggestedPricePln: 200,
  },
  { name: 'Terapia par', defaultDurationMin: 90, suggestedPricePln: 280 },
  {
    name: 'Sesja terapii dzieci i młodzieży',
    defaultDurationMin: 50,
    suggestedPricePln: 180,
  },
  {
    name: 'Konsultacja psychotraumatologiczna',
    defaultDurationMin: 50,
    suggestedPricePln: 190,
  },
  { name: 'Sesja terapii uzależnień', defaultDurationMin: 60, suggestedPricePln: 200 },
  { name: 'Sesja terapii schematów', defaultDurationMin: 90, suggestedPricePln: 270 },
];

/** Zwraca słownik usług wertykalu (F8). */
export function getServiceCatalog(): ServiceCatalogItem[] {
  return SERVICE_CATALOG;
}

/** Przelicza cenę „od" specjalisty jako minimum z cen jego usług. */
function recomputePriceFromPln(specialistId: string): void {
  const specialist = getSpecialistById(specialistId);
  if (!specialist) return;
  const prices = services
    .filter((s) => s.specialistId === specialistId)
    .map((s) => s.pricePln);
  if (prices.length > 0) {
    specialist.priceFromPln = Math.min(...prices);
  }
  // Brak usług — pozostawiamy dotychczasową cenę „od" (brak sensownego minimum).
}

/** Dodaje usługę wybraną ze słownika (F8). Nazwa spoza słownika → błąd (400). */
export function addService(specialistId: string, body: AddServiceBody): Service {
  const catalogItem = SERVICE_CATALOG.find((c) => c.name === body.catalogName);
  if (!catalogItem) throw new CatalogServiceInvalidError(body.catalogName);

  const service: Service = {
    id: `svc_${specialistId}_manual_${++serviceSeq}`,
    specialistId,
    name: body.catalogName,
    durationMin: body.durationMin,
    pricePln: body.pricePln,
    mode: body.mode,
  };
  services.push(service);
  recomputePriceFromPln(specialistId);
  return service;
}

/** Aktualizuje cenę/czas/tryb usługi (E3). Brak usługi → błąd (404). */
export function updateService(serviceId: string, patch: UpdateServiceBody): Service {
  const service = services.find((s) => s.id === serviceId);
  if (!service) throw new ServiceNotFoundError(serviceId);
  if (patch.pricePln !== undefined) service.pricePln = patch.pricePln;
  if (patch.durationMin !== undefined) service.durationMin = patch.durationMin;
  if (patch.mode !== undefined) service.mode = patch.mode;
  recomputePriceFromPln(service.specialistId);
  return service;
}

/** Usuwa usługę (E3). Brak usługi → błąd (404). */
export function deleteService(serviceId: string): void {
  const index = services.findIndex((s) => s.id === serviceId);
  if (index === -1) throw new ServiceNotFoundError(serviceId);
  const [removed] = services.splice(index, 1);
  recomputePriceFromPln(removed.specialistId);
}

/* ================================================================== *
 * EPIC A — Uwierzytelnianie i sesja (mock)
 * ================================================================== *
 * Warstwa mocka logowania/rejestracji: konta in-memory + pojedyncza „bieżąca
 * sesja". HASŁA NIE SĄ weryfikowane (atrapa) — logowanie dopasowuje konto po
 * e-mailu; token to sygnał dla BE Inspectora. Handlery MSW mapują pole
 * `AuthError.status` na kod HTTP (401 — brak konta, 409 — e-mail zajęty).
 */

/** Błąd uwierzytelniania (mock) — pole `status` mapowane w handlerze (401/409). */
export class AuthError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/** Stały znacznik utworzenia kont DEMO (konta „istnieją" od początku). */
const DEMO_ACCOUNT_CREATED_AT = '2025-01-01T09:00:00.000Z';

/**
 * Konta użytkowników (in-memory). Trzy konta DEMO (dane PRZYKŁADOWE) pokrywają
 * wszystkie role: pacjent / specjalista / admin. Rejestracja
 * (`registerPatient` / `registerSpecialist`) dopisuje kolejne konta.
 */
export const users: User[] = [
  {
    // DEMO — pacjent (logowanie: pacjent@demo.pl, dowolne „hasło").
    id: 'user_p1',
    role: 'patient',
    email: 'pacjent@demo.pl',
    firstName: 'Jan',
    lastName: 'Kowalczyk',
    phone: '+48 600 100 200',
    createdAt: DEMO_ACCOUNT_CREATED_AT,
  },
  {
    // DEMO — specjalista, powiązany z profilem spec_1 (Anna Kowalska).
    id: 'user_s1',
    role: 'specialist',
    email: 'anna.kowalska@demo.pl',
    firstName: 'Anna',
    lastName: 'Kowalska',
    phone: '+48 600 300 400',
    specialistId: DEMO_SPECIALIST_ID,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
  },
  {
    // DEMO — administrator platformy.
    id: 'user_a1',
    role: 'admin',
    email: 'admin@demo.pl',
    firstName: 'Admin',
    lastName: 'Platformy',
    createdAt: DEMO_ACCOUNT_CREATED_AT,
  },
];

/** Bieżąca sesja mocka (in-memory). `null` = nikt niezalogowany. */
let currentSession: Session | null = null;

/** Sekwencje id kont/profili tworzonych przez rejestrację (demo zajmuje „1"). */
let patientAccountSeq = 1; // demo: user_p1 → kolejni user_p2, user_p3, …
let specialistAccountSeq = 1; // demo: user_s1 → kolejni user_s2, …
let specialistProfileSeq = SPECIALIST_SEEDS.length; // spec_1..spec_N zajęte przez seed
/** Sekwencja tokenów-atrap (sygnał dla BE Inspectora). */
let authTokenSeq = 0;

/** Token-atrapa sesji w formacie `tok_<userId>_<seq>`. */
function issueToken(userId: string): string {
  return `tok_${userId}_${++authTokenSeq}`;
}

/** Znajduje konto po e-mailu (porównanie bez rozróżniania wielkości liter). */
function findUserByEmail(email: string): User | undefined {
  const needle = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === needle);
}

/**
 * Logowanie (mock). Dopasowuje konto po e-mailu — HASŁO JEST IGNOROWANE
 * (atrapa, brak weryfikacji kryptograficznej). Brak konta → `AuthError` (401).
 * Ustawia bieżącą sesję i ją zwraca.
 */
export function login(body: LoginBody): Session {
  const user = findUserByEmail(body.email);
  if (!user) throw new AuthError(401, 'Nieprawidłowy e-mail lub hasło.');
  currentSession = { user, token: issueToken(user.id) };
  return currentSession;
}

/**
 * Rejestracja pacjenta (mock). E-mail zajęty → `AuthError` (409). Tworzy konto
 * role='patient' (`user_p<seq>`), dopisuje do `users`, ustawia sesję i zwraca.
 */
export function registerPatient(body: RegisterPatientBody): Session {
  if (findUserByEmail(body.email)) {
    throw new AuthError(409, 'Konto z tym adresem e-mail już istnieje.');
  }
  const user: User = {
    id: `user_p${++patientAccountSeq}`,
    role: 'patient',
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  currentSession = { user, token: issueToken(user.id) };
  return currentSession;
}

/**
 * Rejestracja specjalisty (mock). E-mail zajęty → `AuthError` (409). Tworzy konto
 * role='specialist' (`user_s<seq>`) powiązane z nowym id profilu (`spec_*`) oraz
 * rekord `Verification` w stanie automatu (D1: `weryfikacja_auto`, `submittedAt`
 * = teraz). Ustawia sesję i ją zwraca.
 *
 * Uwaga (uproszczenie): pełny szkic profilu `Specialist` NIE jest tu tworzony —
 * powstaje dopiero po weryfikacji/uzupełnieniu w panelu. Kluczowe jest, że
 * powstają konto użytkownika ORAZ zgłoszenie weryfikacyjne.
 */
export function registerSpecialist(body: RegisterSpecialistBody): Session {
  if (findUserByEmail(body.email)) {
    throw new AuthError(409, 'Konto z tym adresem e-mail już istnieje.');
  }
  const specialistId = `spec_${++specialistProfileSeq}`;
  const user: User = {
    id: `user_s${++specialistAccountSeq}`,
    role: 'specialist',
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    specialistId,
    createdAt: new Date().toISOString(),
  };
  users.push(user);

  // Start cyklu weryfikacji (C3 → D1): automat sprawdza PWZ w rejestrze.
  verifications.push({
    specialistId,
    pwzNumber: body.pwzNumber,
    registry: body.registry,
    state: VerificationState.WeryfikacjaAuto,
    submittedAt: new Date().toISOString(),
  });

  currentSession = { user, token: issueToken(user.id) };
  return currentSession;
}

/** Bieżąca sesja: `{ user }` albo `{ user: null }`, gdy nikt niezalogowany. */
export function getSession(): SessionResponse {
  return { user: currentSession?.user ?? null };
}

/** Wylogowanie — czyści bieżącą sesję. */
export function logout(): void {
  currentSession = null;
}

/* ================================================================== *
 * GRUPA B — Konto pacjenta (rezerwacje, opinie, powiadomienia, waitlista, RODO)
 * ================================================================== *
 * Tożsamość pacjenta identyfikujemy po `patientEmail` (case-insensitive);
 * handlery MSW przekazują e-mail w query (`?email=`). Dane pacjentów =
 * PRZYKŁADOWE (placeholdery) na potrzeby prezentacji front-endu.
 */

/** Normalizuje e-mail do klucza porównań/mapy (trim + lowercase). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/* ------------------------ Rezerwacje pacjenta (B4/B5/B6) ------------------------ */

/**
 * Rezerwacje pacjenta (po `patientEmail`, case-insensitive) wzbogacone o dane
 * specjalisty/usługi i flagi akcji strefy pacjenta:
 *  - `canCancel` — stan `confirmed` i termin w przyszłości (B4);
 *  - `canReview` — stan `completed` i brak opinii (B5);
 *  - `hasReview` — czy istnieje opinia dla `bookingId`.
 * Sort: nadchodzące (confirmed w przyszłości) rosnąco, potem reszta malejąco po `startsAt`.
 */
export function listPatientBookings(email: string): PatientBookingItem[] {
  const needle = normalizeEmail(email);
  const now = Date.now();

  const isUpcoming = (b: Booking): boolean =>
    b.state === BookingState.Confirmed && Date.parse(b.startsAt) > now;

  const items: PatientBookingItem[] = bookings
    .filter((b) => b.patientEmail.toLowerCase() === needle)
    .map((b) => {
      const specialist = getSpecialistById(b.specialistId);
      const hasReview = reviews.some((r) => r.bookingId === b.id);
      return {
        ...b,
        specialistName: specialist
          ? `${specialist.firstName} ${specialist.lastName}`
          : 'Specjalista',
        specialistSlug: specialist?.slug ?? '',
        specialistPhotoUrl: specialist?.photoUrl ?? '',
        serviceName: services.find((s) => s.id === b.serviceId)?.name ?? 'Wizyta',
        canCancel: isUpcoming(b),
        canReview: b.state === BookingState.Completed && !hasReview,
        hasReview,
      };
    });

  const upcoming = items
    .filter((i) => isUpcoming(i))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const rest = items
    .filter((i) => !isUpcoming(i))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));

  return [...upcoming, ...rest];
}

/**
 * Wystawia opinię pacjenta (B5). Waliduje: rezerwacja istnieje
 * (`BookingNotFoundError` → 404), jest w stanie `completed`
 * (`ReviewNotAllowedError` → 409) i nie ma jeszcze opinii
 * (`ReviewAlreadyExistsError` → 409). Tworzy `Review` w statusie `pending`
 * (kolejka moderacji F2); `specialistId` przepisany z rezerwacji.
 */
export function createReview(body: CreateReviewBody): Review {
  const booking = bookings.find((b) => b.id === body.bookingId);
  if (!booking) throw new BookingNotFoundError(body.bookingId);
  if (booking.state !== BookingState.Completed) {
    throw new ReviewNotAllowedError(body.bookingId, booking.state);
  }
  if (reviews.some((r) => r.bookingId === body.bookingId)) {
    throw new ReviewAlreadyExistsError(body.bookingId);
  }

  const review: Review = {
    id: `rev_new_${++reviewSeq}`,
    specialistId: booking.specialistId,
    bookingId: booking.id,
    authorName: body.authorName,
    rating: body.rating,
    text: body.text,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  reviews.push(review);
  return review;
}

/* ------------------------ Preferencje powiadomień (G1) ------------------------ */

/** Domyślne preferencje powiadomień pacjenta (e-mail/sms/przypomnienia wł., marketing wył.). */
const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  sms: true,
  reminders: true,
  marketing: false,
};

/** Preferencje powiadomień kluczowane e-mailem pacjenta (in-memory). */
const notificationPrefsByEmail: Record<string, NotificationPrefs> = {};

/** Zwraca preferencje powiadomień pacjenta (domyślne, gdy brak zapisanych). */
export function getNotificationPrefs(email: string): NotificationPrefs {
  return (
    notificationPrefsByEmail[normalizeEmail(email)] ?? { ...DEFAULT_NOTIFICATION_PREFS }
  );
}

/** Aktualizuje (częściowo) preferencje powiadomień pacjenta i zwraca pełny stan. */
export function updateNotificationPrefs(
  email: string,
  patch: Partial<NotificationPrefs>,
): NotificationPrefs {
  const key = normalizeEmail(email);
  const current = notificationPrefsByEmail[key] ?? { ...DEFAULT_NOTIFICATION_PREFS };
  const updated: NotificationPrefs = {
    email: patch.email ?? current.email,
    sms: patch.sms ?? current.sms,
    reminders: patch.reminders ?? current.reminders,
    marketing: patch.marketing ?? current.marketing,
  };
  notificationPrefsByEmail[key] = updated;
  return updated;
}

/* ------------------------ Waitlista (G6) ------------------------ */

/** Wpisy na waitliście (in-memory). Eksport do inspekcji/testów. */
export const waitlist: WaitlistEntry[] = [];

/** Zapisuje pacjenta na waitlistę specjalisty (status `active`, id `wl_*`). */
export function joinWaitlist(body: JoinWaitlistBody): WaitlistEntry {
  const specialist = getSpecialistById(body.specialistId);
  const entry: WaitlistEntry = {
    id: `wl_${++waitlistSeq}`,
    specialistId: body.specialistId,
    specialistName: specialist
      ? `${specialist.firstName} ${specialist.lastName}`
      : 'Specjalista',
    patientEmail: body.patientEmail,
    patientName: body.patientName,
    serviceId: body.serviceId,
    createdAt: new Date().toISOString(),
    status: 'active',
  };
  waitlist.push(entry);
  return entry;
}

/** Wpisy pacjenta na waitliście (po e-mailu, case-insensitive). */
export function listWaitlist(email: string): WaitlistEntry[] {
  const needle = normalizeEmail(email);
  return waitlist.filter((w) => w.patientEmail.toLowerCase() === needle);
}

/* ------------------------ RODO — eksport / usunięcie (G11) ------------------------ */

/**
 * Eksport danych pacjenta (RODO, G11): rezerwacje, opinie (powiązane przez
 * `bookingId`) oraz wpisy waitlisty pacjenta; `generatedAt` = teraz.
 */
export function rodoExport(email: string): RodoExport {
  const needle = normalizeEmail(email);
  const myBookings = bookings.filter((b) => b.patientEmail.toLowerCase() === needle);
  const myBookingIds = new Set(myBookings.map((b) => b.id));
  const myReviews = reviews.filter(
    (r) => r.bookingId !== undefined && myBookingIds.has(r.bookingId),
  );
  const myWaitlist = waitlist.filter((w) => w.patientEmail.toLowerCase() === needle);

  return {
    user: { email },
    bookings: myBookings,
    reviews: myReviews,
    waitlist: myWaitlist,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Usunięcie danych pacjenta (RODO, G11) — anonimizuje dane osobowe w jego
 * rezerwacjach (`patientName`/`patientEmail`/`patientPhone`/`notes` → „(usunięte)").
 * Uproszczenie demo: rekordy pozostają (historia), tracą jednak dane osobowe.
 */
export function rodoErase(email: string): void {
  const needle = normalizeEmail(email);
  const erased = '(usunięte)';
  for (const b of bookings) {
    if (b.patientEmail.toLowerCase() === needle) {
      b.patientName = erased;
      b.patientEmail = erased;
      b.patientPhone = erased;
      if (b.notes !== undefined) b.notes = erased;
    }
  }
}

/* ------------------------ Scoring pacjenta (G7) — bramka checkoutu (A5/A6) ------------------------ */

/**
 * Scoring nieobecności pacjenta (silnik G7) sterujący wariantem checkoutu.
 *
 * `noShowCount` = maksimum z: liczby rezerwacji pacjenta w stanie `no_show`
 * (po `patientEmail`, case-insensitive) oraz zaseedowanego wskaźnika
 * `patientNoShowByEmail`. Progi bramki (demo):
 *  - 0        → `none`     (brak sankcji — checkout wprost do `confirmed`, A5);
 *  - 1        → `approval` (akceptacja specjalisty — `pending_approval`, E4);
 *  - 2 i więcej → `payment` (przedpłata online — `pending_payment`, A6/Flaga 2).
 */
export function getScoring(email: string): ScoringInfo {
  const needle = normalizeEmail(email);

  const noShowInBookings = bookings.filter(
    (b) => b.patientEmail.toLowerCase() === needle && b.state === BookingState.NoShow,
  ).length;
  // Wskaźnik zaseedowany kluczujemy e-mailem — próbujemy surowy klucz, potem znormalizowany.
  const registered = patientNoShowByEmail[email] ?? patientNoShowByEmail[needle] ?? 0;
  const noShowCount = Math.max(noShowInBookings, registered);

  let gate: ScoringGate;
  if (noShowCount <= 0) {
    gate = 'none';
  } else if (noShowCount === 1) {
    gate = 'approval';
  } else {
    gate = 'payment';
  }

  const reason =
    gate === 'none'
      ? 'Brak sankcji — rezerwacja bez dodatkowych warunków.'
      : `Pacjent ma ${noShowCount} ${
          noShowCount === 1 ? 'nieobecność' : 'nieobecności'
        } w historii (scoring G7).`;

  return { noShowCount, gate, reason };
}

/* ================================================================== *
 * GRUPY C/D — Onboarding specjalisty (weryfikacja PWZ D1/D3, subskrypcja C2)
 * ================================================================== *
 * Odczyt i mutacje cyklu weryfikacji specjalisty (D1: stan, ponowne zgłoszenie
 * po odrzuceniu; D3: publikacja profilu go-live) oraz katalog planów subskrypcji
 * (C2 — model SUBSKRYPCYJNY, nie prowizja od wizyt). Przejścia stanów walidowane
 * są przez `assertVerificationTransition` (mapa CORE-WERYFIKACJA). Handlery MSW
 * mapują błędy domenowe poniżej na kody HTTP: 404 — brak weryfikacji, 409 — już
 * opublikowany / niedozwolone przejście.
 */

/** Brak rekordu weryfikacji dla specjalisty — handler mapuje na 404. */
export class VerificationNotFoundError extends Error {
  readonly specialistId: string;
  constructor(specialistId: string) {
    super(`Nie znaleziono weryfikacji specjalisty ${specialistId}.`);
    this.name = 'VerificationNotFoundError';
    this.specialistId = specialistId;
  }
}

/** Profil już opublikowany (go-live na opublikowanym) — handler mapuje na 409. */
export class AlreadyPublishedError extends Error {
  readonly specialistId: string;
  constructor(specialistId: string) {
    super(`Profil specjalisty ${specialistId} jest już opublikowany.`);
    this.name = 'AlreadyPublishedError';
    this.specialistId = specialistId;
  }
}

/* ------------------------ Weryfikacja PWZ (D1) ------------------------ */

/** Rekord weryfikacji specjalisty (po id); `undefined`, gdy brak zgłoszenia. */
export function getSpecialistVerification(
  specialistId: string,
): Verification | undefined {
  return verifications.find((v) => v.specialistId === specialistId);
}

/**
 * Ponowne zgłoszenie weryfikacji po odrzuceniu (D1/F1): odrzucony → weryfikacja_auto.
 * Waliduje przejście z BIEŻĄCEGO stanu przez `assertVerificationTransition`
 * (niedozwolone → `InvalidVerificationTransitionError`, handler mapuje na 409);
 * czyści powód odrzucenia. Brak rekordu → `VerificationNotFoundError` (404).
 */
export function resubmitVerification(specialistId: string): Verification {
  const current = getSpecialistVerification(specialistId);
  if (!current) throw new VerificationNotFoundError(specialistId);

  // odrzucony → weryfikacja_auto (jedyne dozwolone „wejście" z powrotem do automatu).
  assertVerificationTransition(current.state, VerificationState.WeryfikacjaAuto);
  current.state = VerificationState.WeryfikacjaAuto;
  current.rejectionReason = undefined;
  return current;
}

/* ------------------------ Publikacja profilu — go-live (D3) ------------------------ */

/**
 * Publikacja profilu specjalisty (D3, go-live): zweryfikowany → opublikowany.
 * Ustawia stan weryfikacji ORAZ `verificationState` profilu na `opublikowany`
 * (profil staje się widoczny w wyszukiwarce A3/A4). Błędy:
 *  - brak rekordu → `VerificationNotFoundError` (404);
 *  - już opublikowany → `AlreadyPublishedError` (409, sygnał idempotencji);
 *  - inny stan niż `zweryfikowany` → `InvalidVerificationTransitionError` (409).
 *
 * Uwaga: DEMO_SPECIALIST_ID (spec_1) jest `opublikowany`, więc go-live na nim
 * zwróci 409 — ekran pokaże stan „opublikowany".
 */
export function goLive(specialistId: string): Verification {
  const current = getSpecialistVerification(specialistId);
  if (!current) throw new VerificationNotFoundError(specialistId);
  if (current.state === VerificationState.Opublikowany) {
    throw new AlreadyPublishedError(specialistId);
  }

  // zweryfikowany → opublikowany (jedyne dozwolone przejście do publikacji).
  assertVerificationTransition(current.state, VerificationState.Opublikowany);
  current.state = VerificationState.Opublikowany;

  // Domknięcie D3 — profil widoczny publicznie (spójność z `verificationState`).
  const specialist = getSpecialistById(specialistId);
  if (specialist) specialist.verificationState = VerificationState.Opublikowany;

  return current;
}

/* ------------------------ Plany subskrypcji (C2) ------------------------ */

/**
 * Katalog planów subskrypcji specjalisty (C2). Model SUBSKRYPCYJNY (stała opłata
 * za okres), NIE prowizja od wizyt. Dane PRZYKŁADOWE (placeholdery) na potrzeby
 * prezentacji cennika; opisy neutralne — bez języka rankingowego/superlatywów
 * (żadnego „najlepszy" / „nr 1" / „lider"). Dokładnie jeden plan `highlighted`
 * (najczęściej wybierany).
 */
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_solo',
    name: 'Solo',
    pricePln: 0,
    period: 'month',
    features: [
      'Do 20 wizyt miesięcznie',
      'Kalendarz i zarządzanie terminami',
      'Przypomnienia e-mail dla pacjentów',
      'Profil w wyszukiwarce',
      'Jeden adres gabinetu',
    ],
  },
  {
    id: 'plan_praktyka',
    name: 'Praktyka',
    pricePln: 99,
    period: 'month',
    highlighted: true,
    features: [
      'Bez limitu wizyt',
      'Kalendarz z blokadami i ręcznym dodawaniem terminów',
      'Przypomnienia e-mail i SMS dla pacjentów',
      'Widget rezerwacji na własnej stronie',
      'Do trzech adresów gabinetu',
    ],
  },
  {
    id: 'plan_placowka',
    name: 'Placówka',
    pricePln: 199,
    period: 'month',
    features: [
      'Bez limitu wizyt',
      'Kalendarz zespołu i wielu specjalistów',
      'Przypomnienia e-mail i SMS oraz lista rezerwowa',
      'Widget rezerwacji i integracje',
      'Wiele adresów i lokalizacji',
    ],
  },
];

/** Zwraca katalog planów subskrypcji specjalisty (C2). */
export function getSubscriptionPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS;
}

/* ================================================================== *
 * GRUPA F — Back office / panel administracyjny (F1–F10)
 * ================================================================== *
 * Backend panelu admina: kolejka weryfikacji (F1), moderacja opinii (F2), spory
 * o nieobecność (F3), zgłoszenia nadużyć (F4), zarządzanie kontami (F5) oraz
 * dziennik audytu (F10). Aktor operacji = konto DEMO `admin@demo.pl`. Przejścia
 * stanów walidowane są przez istniejące silniki: weryfikacja przez
 * `assertVerificationTransition` (CORE-WERYFIKACJA), spory przez
 * `transitionBooking` → `assertTransition` (CORE-STANY). Błędy domenowe poniżej
 * handlery MSW mapują na kody HTTP: 404 — brak zasobu, 409 — niedozwolone
 * przejście, 400 — brak wymaganego pola.
 *
 * DANE PONIŻEJ (kandydaci do weryfikacji, opinie do moderacji, spory, dodatkowe
 * konta, wpisy audytu i nadużyć) to PRZYKŁADOWE placeholdery na potrzeby
 * prezentacji panelu — NIE są prawdziwymi danymi osobowymi. Teksty opinii
 * neutralne (bez superlatywów/rankingów), spójne z ograniczeniem prawnym demo.
 */

/** E-mail administratora DEMO — domyślny aktor operacji audytowanych (F10). */
const ADMIN_ACTOR = 'admin@demo.pl';

/* ------------------------ Błędy domenowe (grupa F) ------------------------ */

/** Opinia nie istnieje — handler mapuje na 404. */
export class ReviewNotFoundError extends Error {
  readonly reviewId: string;
  constructor(reviewId: string) {
    super(`Nie znaleziono opinii ${reviewId}.`);
    this.name = 'ReviewNotFoundError';
    this.reviewId = reviewId;
  }
}

/** Konto użytkownika nie istnieje — handler mapuje na 404. */
export class UserNotFoundError extends Error {
  readonly userId: string;
  constructor(userId: string) {
    super(`Nie znaleziono użytkownika ${userId}.`);
    this.name = 'UserNotFoundError';
    this.userId = userId;
  }
}

/** Zgłoszenie nadużycia nie istnieje — handler mapuje na 404. */
export class AbuseFlagNotFoundError extends Error {
  readonly flagId: string;
  constructor(flagId: string) {
    super(`Nie znaleziono zgłoszenia nadużycia ${flagId}.`);
    this.name = 'AbuseFlagNotFoundError';
    this.flagId = flagId;
  }
}

/** Brak wymaganego powodu odrzucenia weryfikacji (F1) — handler mapuje na 400. */
export class RejectReasonRequiredError extends Error {
  constructor() {
    super('Powód odrzucenia jest wymagany.');
    this.name = 'RejectReasonRequiredError';
  }
}

/* ------------------------ Dziennik audytu (F10) ------------------------ */

/**
 * Dziennik audytu operacji administracyjnych (F10). Seedowany wpisami DEMO;
 * mutacje panelu (moderacje, decyzje, blokady) dopisują kolejne wpisy przez
 * `appendAudit`. Eksport do inspekcji/testów.
 */
export const auditEntries: AuditEntry[] = [];

/** Sekwencja id wpisów audytu (`audit_*`). */
let auditSeq = 0;

/** Dopisuje wpis do dziennika audytu (F10) i zwraca go. Aktor = admin DEMO. */
function appendAudit(action: string, target: string, meta?: string): AuditEntry {
  const entry: AuditEntry = {
    id: `audit_${++auditSeq}`,
    at: new Date().toISOString(),
    actor: ADMIN_ACTOR,
    action,
    target,
    meta,
  };
  auditEntries.push(entry);
  return entry;
}

/* ------------------------ Zgłoszenia nadużyć (F4) ------------------------ */

/**
 * Zgłoszenia nadużyć (F4) — sygnały do przeglądu przez admina (multikonto, seria
 * rezerwacji itp.). Dane PRZYKŁADOWE. Wypełniane w `seedAdmin`; eksport do
 * inspekcji/testów.
 */
export const abuseFlags: AbuseFlag[] = [];

/* ------------------------ Seed danych panelu admina ------------------------ */

/** Kandydat kolejki weryfikacji (F1) — dane profilu + rekordu weryfikacji. */
interface AdminCandidateSeed {
  id: string;
  firstName: string;
  lastName: string;
  title: SpecialistTitle;
  city: string;
  street: string;
  postalCode: string;
  specializations: string[];
  registry: ProfessionalRegistry;
  pwzNumber: string;
  /** Stan zgłoszenia w kolejce (ręczny przegląd lub świeża rejestracja). */
  state: VerificationState.WeryfikacjaReczna | VerificationState.Zarejestrowany;
  /** Ile godzin temu zgłoszono (do `submittedAt` i SLA ~24 h). */
  submittedHoursAgo: number;
}

/**
 * Seed danych panelu admina (grupa F). Wołany RAZ, na końcu modułu — po `seed()`
 * oraz po inicjalizacji tablicy `users` (mutuje konta F5). Dodaje kandydatów F1
 * (nieopublikowanych → poza wyszukiwarką), opinie F2 (`pending`), spory F3
 * (`disputed` u spec_1, po terminie), konta F5, wpisy audytu F10 i nadużyć F4.
 */
function seedAdmin(): void {
  const nowMs = Date.now();
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;

  /* --- F1: kandydaci do weryfikacji (NIE „opublikowany" → poza wyszukiwarką) --- */
  const candidateSeeds: AdminCandidateSeed[] = [
    {
      id: 'spec_pending_1',
      firstName: 'Weronika',
      lastName: 'Sadowska',
      title: 'psycholog',
      city: 'Warszawa',
      street: 'ul. Hoża 51',
      postalCode: '00-681',
      specializations: ['terapia poznawczo-behawioralna', 'zaburzenia nastroju'],
      registry: ProfessionalRegistry.KRL,
      pwzNumber: 'KRL-2000001',
      state: VerificationState.WeryfikacjaReczna,
      submittedHoursAgo: 6,
    },
    {
      id: 'spec_pending_2',
      firstName: 'Grzegorz',
      lastName: 'Mazur',
      title: 'psychoterapeuta',
      city: 'Kraków',
      street: 'ul. Długa 42',
      postalCode: '31-146',
      specializations: ['terapia psychodynamiczna'],
      registry: ProfessionalRegistry.KIF,
      pwzNumber: 'KIF-2000002',
      state: VerificationState.WeryfikacjaReczna,
      submittedHoursAgo: 18,
    },
    {
      id: 'spec_pending_3',
      firstName: 'Natalia',
      lastName: 'Górska',
      title: 'psychotraumatolog',
      city: 'Gdańsk',
      street: 'ul. Szeroka 12',
      postalCode: '80-835',
      specializations: ['psychotraumatologia'],
      registry: ProfessionalRegistry.KRL,
      pwzNumber: 'KRL-2000003',
      // Świeża rejestracja — bezpośrednia akceptacja/odrzucenie w F1 da 409
      // (assertVerificationTransition: zarejestrowany → tylko weryfikacja_auto).
      state: VerificationState.Zarejestrowany,
      submittedHoursAgo: 2,
    },
  ];

  for (const c of candidateSeeds) {
    const coords = CITY_COORDS[c.city];
    const address: Address = {
      id: `addr_${c.id}_1`,
      label: 'Gabinet',
      street: c.street,
      city: c.city,
      postalCode: c.postalCode,
      lat: coords?.lat,
      lng: coords?.lng,
    };
    const submittedAt = new Date(nowMs - c.submittedHoursAgo * hourMs).toISOString();
    // SLA kolejki ręcznej — do 24 h (roboczych) od zgłoszenia.
    const slaDeadline = new Date(
      nowMs - c.submittedHoursAgo * hourMs + dayMs,
    ).toISOString();

    specialists.push({
      id: c.id,
      slug: slugify(`${c.firstName} ${c.lastName}`),
      firstName: c.firstName,
      lastName: c.lastName,
      title: c.title,
      specializations: c.specializations,
      bio: `Zgłoszenie w trakcie weryfikacji PWZ (${c.registry}). Profil oczekuje na decyzję administratora.`,
      photoUrl: `https://i.pravatar.cc/300?u=${c.id}`,
      languages: ['polski'],
      addresses: [address],
      online: false,
      ratingAvg: 0,
      ratingCount: 0,
      priceFromPln: 0,
      verificationState: c.state,
      pwzNumber: c.pwzNumber,
      registry: c.registry,
    });

    verifications.push({
      specialistId: c.id,
      pwzNumber: c.pwzNumber,
      registry: c.registry,
      state: c.state,
      submittedAt,
      slaDeadline,
    });
  }

  /* --- F2: opinie do moderacji (`pending`) dla opublikowanych specjalistów --- */
  const pendingReviewSeeds: {
    specialistId: string;
    author: string;
    rating: number;
    text: string;
    daysAgo: number;
  }[] = [
    {
      specialistId: 'spec_1',
      author: 'Karolina M.',
      rating: 5,
      text: 'Rozmowa pomogła mi spojrzeć na sytuację z innej perspektywy.',
      daysAgo: 1,
    },
    {
      specialistId: 'spec_2',
      author: 'Damian W.',
      rating: 4,
      text: 'Konkretne wskazówki i spokojna atmosfera podczas spotkania.',
      daysAgo: 2,
    },
    {
      specialistId: 'spec_3',
      author: 'Ola T.',
      rating: 5,
      text: 'Sesja dla pary przebiegła rzeczowo, czuliśmy się wysłuchani.',
      daysAgo: 3,
    },
    {
      specialistId: 'spec_5',
      author: 'Bartek K.',
      rating: 3,
      text: 'Wsparcie w trudnym okresie, terminy do uzgodnienia z wyprzedzeniem.',
      daysAgo: 4,
    },
  ];
  pendingReviewSeeds.forEach((r, i) => {
    reviews.push({
      id: `rev_mod_${i + 1}`,
      specialistId: r.specialistId,
      authorName: r.author,
      rating: r.rating,
      text: r.text,
      createdAt: new Date(nowMs - r.daysAgo * dayMs).toISOString(),
      status: 'pending',
    });
  });

  /* --- F3: spory o nieobecność (`disputed`) u spec_1, po terminie --- */
  const disputeSeeds: {
    suffix: string;
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    serviceId: string;
    daysAgo: number;
    hour: number;
    noShowCount: number;
  }[] = [
    {
      suffix: '1',
      patientName: 'Sebastian Kowal',
      patientEmail: 's.kowal@example.com',
      patientPhone: '+48 663 111 222',
      serviceId: 'svc_spec_1_1',
      daysAgo: 3,
      hour: 11,
      noShowCount: 2,
    },
    {
      suffix: '2',
      patientName: 'Iwona Lis',
      patientEmail: 'i.lis@example.com',
      patientPhone: '+48 664 333 444',
      serviceId: 'svc_spec_1_2',
      daysAgo: 6,
      hour: 16,
      noShowCount: 1,
    },
  ];
  for (const d of disputeSeeds) {
    // Rejestr no-show pacjenta (scoring G7) — kontekst decyzji admina.
    patientNoShowByEmail[d.patientEmail] = d.noShowCount;
    const start = new Date(nowMs - d.daysAgo * dayMs);
    start.setHours(d.hour, 0, 0, 0);
    const price = services.find((s) => s.id === d.serviceId)?.pricePln ?? 0;
    bookings.push({
      id: `bk_dispute_${d.suffix}`,
      specialistId: DEMO_SPECIALIST_ID,
      serviceId: d.serviceId,
      slotId: `slot_dispute_${d.suffix}`,
      patientName: d.patientName,
      patientEmail: d.patientEmail,
      patientPhone: d.patientPhone,
      state: BookingState.Disputed,
      createdAt: new Date(start.getTime() - dayMs).toISOString(),
      startsAt: start.toISOString(),
      pricePln: price,
    });
  }

  /* --- F5: konta — flaga `blocked` na istniejących + dodatkowi pacjenci --- */
  for (const u of users) {
    if (u.blocked === undefined) u.blocked = false;
  }
  const extraUserSeeds: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    blocked: boolean;
    createdDaysAgo: number;
  }[] = [
    {
      id: 'user_p_demo2',
      email: 'ewa.nowak@example.com',
      firstName: 'Ewa',
      lastName: 'Nowak',
      phone: '+48 665 555 666',
      blocked: false,
      createdDaysAgo: 40,
    },
    {
      id: 'user_p_demo3',
      email: 'marek.wilk@example.com',
      firstName: 'Marek',
      lastName: 'Wilk',
      phone: '+48 666 777 888',
      blocked: false,
      createdDaysAgo: 25,
    },
    {
      // Konto zablokowane — do zademonstrowania odblokowania (F5).
      id: 'user_p_blocked',
      email: 'spam.konto@example.com',
      firstName: 'Zablokowane',
      lastName: 'Konto',
      blocked: true,
      createdDaysAgo: 12,
    },
  ];
  for (const u of extraUserSeeds) {
    users.push({
      id: u.id,
      role: 'patient',
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      createdAt: new Date(nowMs - u.createdDaysAgo * dayMs).toISOString(),
      blocked: u.blocked,
    });
  }

  /* --- F10: dziennik audytu (wpisy demo — logowania, publikacje, moderacje, RODO) --- */
  const auditSeeds: {
    action: string;
    target: string;
    actor: string;
    meta?: string;
    hoursAgo: number;
  }[] = [
    { action: 'auth.login', target: 'admin@demo.pl', actor: ADMIN_ACTOR, hoursAgo: 1 },
    {
      action: 'profile.published',
      target: 'spec_1',
      actor: 'anna.kowalska@demo.pl',
      meta: 'go-live D3',
      hoursAgo: 30,
    },
    { action: 'review.approved', target: 'rev_spec_2_1', actor: ADMIN_ACTOR, hoursAgo: 26 },
    {
      action: 'review.rejected',
      target: 'rev_spec_4_2',
      actor: ADMIN_ACTOR,
      meta: 'treść spoza regulaminu',
      hoursAgo: 25,
    },
    { action: 'verification.approved', target: 'spec_9', actor: ADMIN_ACTOR, hoursAgo: 48 },
    {
      action: 'dispute.resolved',
      target: 'bk_demo_no_show',
      actor: ADMIN_ACTOR,
      meta: 'outcome=no_show',
      hoursAgo: 20,
    },
    {
      action: 'user.blocked',
      target: 'user_p_blocked',
      actor: ADMIN_ACTOR,
      meta: 'multikonto',
      hoursAgo: 12,
    },
    { action: 'rodo.export', target: 'pacjent@demo.pl', actor: ADMIN_ACTOR, hoursAgo: 8 },
    {
      action: 'rodo.erase',
      target: 'b.duda@example.com',
      actor: ADMIN_ACTOR,
      meta: 'żądanie B9',
      hoursAgo: 5,
    },
    {
      action: 'auth.login',
      target: 'anna.kowalska@demo.pl',
      actor: 'anna.kowalska@demo.pl',
      hoursAgo: 3,
    },
  ];
  for (const a of auditSeeds) {
    auditEntries.push({
      id: `audit_${++auditSeq}`,
      at: new Date(nowMs - a.hoursAgo * hourMs).toISOString(),
      actor: a.actor,
      action: a.action,
      target: a.target,
      meta: a.meta,
    });
  }

  /* --- F4: zgłoszenia nadużyć (różne severity/status) --- */
  abuseFlags.push(
    {
      id: 'abuse_1',
      subjectType: 'patient',
      subject: 'spam.konto@example.com',
      reason: 'Podejrzenie multikonta — wiele rejestracji z jednego adresu.',
      severity: 'high',
      status: 'open',
      createdAt: new Date(nowMs - 14 * hourMs).toISOString(),
    },
    {
      id: 'abuse_2',
      subjectType: 'patient',
      subject: 'i.lis@example.com',
      reason: 'Seria rezerwacji bez potwierdzenia w krótkim czasie.',
      severity: 'medium',
      status: 'open',
      createdAt: new Date(nowMs - 2 * dayMs).toISOString(),
    },
    {
      id: 'abuse_3',
      subjectType: 'specialist',
      subject: 'spec_6',
      reason: 'Zgłoszenie treści profilu do przeglądu.',
      severity: 'low',
      status: 'reviewed',
      createdAt: new Date(nowMs - 5 * dayMs).toISOString(),
    },
  );
}

seedAdmin();

/* ------------------------ Pomocnicze (grupa F) ------------------------ */

/** Nazwa specjalisty (firstName + lastName) do denormalizacji w pozycjach panelu. */
function specialistDisplayName(specialistId: string): string {
  const s = getSpecialistById(specialistId);
  return s ? `${s.firstName} ${s.lastName}` : 'Specjalista';
}

/* ------------------------ F1: kolejka weryfikacji ------------------------ */

/**
 * Weryfikacje oczekujące na decyzję admina (F1): stan `weryfikacja_reczna`
 * (ręczny przegląd — fallback automatu D1) lub `zarejestrowany`. Wzbogacone
 * o nazwę specjalisty.
 */
export function listAdminVerifications(): AdminVerificationItem[] {
  return verifications
    .filter(
      (v) =>
        v.state === VerificationState.WeryfikacjaReczna ||
        v.state === VerificationState.Zarejestrowany,
    )
    .map((v) => ({ ...v, specialistName: specialistDisplayName(v.specialistId) }));
}

/**
 * Zatwierdza weryfikację specjalisty (F1): → `zweryfikowany`. Waliduje przejście
 * przez `assertVerificationTransition` (niedozwolone → `InvalidVerificationTransitionError`
 * → 409, np. dla stanu `zarejestrowany`). Brak rekordu → `VerificationNotFoundError`
 * (404). Dopisuje wpis do dziennika audytu (F10).
 */
export function approveVerification(specialistId: string): Verification {
  const current = getSpecialistVerification(specialistId);
  if (!current) throw new VerificationNotFoundError(specialistId);
  assertVerificationTransition(current.state, VerificationState.Zweryfikowany);
  current.state = VerificationState.Zweryfikowany;
  appendAudit('verification.approved', specialistId);
  return current;
}

/**
 * Odrzuca weryfikację specjalisty (F1): → `odrzucony`, z powodem `reason`
 * (widocznym dla specjalisty). Pusty powód → `RejectReasonRequiredError` (400).
 * Walidacja przejścia jak w `approveVerification` (409); brak rekordu → 404.
 * Dopisuje wpis do dziennika audytu (F10).
 */
export function rejectVerification(specialistId: string, reason: string): Verification {
  const current = getSpecialistVerification(specialistId);
  if (!current) throw new VerificationNotFoundError(specialistId);
  if (reason.trim() === '') throw new RejectReasonRequiredError();
  assertVerificationTransition(current.state, VerificationState.Odrzucony);
  current.state = VerificationState.Odrzucony;
  current.rejectionReason = reason;
  appendAudit('verification.rejected', specialistId, reason);
  return current;
}

/* ------------------------ F2: moderacja opinii ------------------------ */

/** Opinie oczekujące na moderację (F2): status `pending` + nazwa specjalisty. */
export function listPendingReviews(): AdminReviewItem[] {
  return reviews
    .filter((r) => r.status === 'pending')
    .map((r) => ({ ...r, specialistName: specialistDisplayName(r.specialistId) }));
}

/**
 * Zatwierdza opinię (F2): status `approved`, `publishedAt` = teraz (opinia staje
 * się publicznie widoczna). Audyt (F10). Brak opinii → `ReviewNotFoundError` (404).
 */
export function approveReview(reviewId: string): Review {
  const review = reviews.find((r) => r.id === reviewId);
  if (!review) throw new ReviewNotFoundError(reviewId);
  review.status = 'approved';
  review.publishedAt = new Date().toISOString();
  appendAudit('review.approved', reviewId, `specialist=${review.specialistId}`);
  return review;
}

/**
 * Odrzuca opinię (F2): status `rejected` (opinia nie trafia na profil). Audyt
 * (F10). Brak opinii → `ReviewNotFoundError` (404).
 */
export function rejectReview(reviewId: string): Review {
  const review = reviews.find((r) => r.id === reviewId);
  if (!review) throw new ReviewNotFoundError(reviewId);
  review.status = 'rejected';
  appendAudit('review.rejected', reviewId, `specialist=${review.specialistId}`);
  return review;
}

/* ------------------------ F3: spory o nieobecność ------------------------ */

/**
 * Rezerwacje w sporze (F3): stan `disputed`, wzbogacone o nazwę specjalisty/usługi
 * oraz wskaźnik no-show pacjenta (scoring G7 — kontekst decyzji).
 */
export function listDisputes(): AdminDisputeItem[] {
  return bookings
    .filter((b) => b.state === BookingState.Disputed)
    .map((b) => ({
      ...b,
      specialistName: specialistDisplayName(b.specialistId),
      serviceName: services.find((s) => s.id === b.serviceId)?.name ?? 'Wizyta',
      patientNoShowCount: patientNoShowByEmail[b.patientEmail] ?? 0,
    }));
}

/**
 * Rozstrzyga spór (F3): `disputed → completed` (uznanie) lub `disputed → no_show`
 * (odrzucenie). Deleguje do `transitionBooking` (walidacja `assertTransition`):
 * brak rezerwacji → `BookingNotFoundError` (404), niedozwolone przejście →
 * `InvalidBookingTransitionError` (409, np. gdy rezerwacja nie jest już w sporze).
 * Dopisuje wpis do dziennika audytu (F10).
 */
export function resolveDispute(
  bookingId: string,
  outcome: 'completed' | 'no_show',
): Booking {
  const target =
    outcome === 'completed' ? BookingState.Completed : BookingState.NoShow;
  const booking = transitionBooking(bookingId, target);
  appendAudit('dispute.resolved', bookingId, `outcome=${outcome}`);
  return booking;
}

/* ------------------------ F5: zarządzanie kontami ------------------------ */

/** Konta użytkowników dla panelu (F5): `blocked` znormalizowane do boolean. */
export function listAdminUsers(): AdminUserItem[] {
  return users.map((u) => ({ ...u, blocked: u.blocked ?? false }));
}

/**
 * Blokuje konto (F5): `blocked = true`. Audyt (F10). Brak konta →
 * `UserNotFoundError` (404).
 */
export function blockUser(userId: string): User {
  const user = users.find((u) => u.id === userId);
  if (!user) throw new UserNotFoundError(userId);
  user.blocked = true;
  appendAudit('user.blocked', userId);
  return user;
}

/**
 * Odblokowuje konto (F5): `blocked = false`. Audyt (F10). Brak konta →
 * `UserNotFoundError` (404).
 */
export function unblockUser(userId: string): User {
  const user = users.find((u) => u.id === userId);
  if (!user) throw new UserNotFoundError(userId);
  user.blocked = false;
  appendAudit('user.unblocked', userId);
  return user;
}

/* ------------------------ F10: dziennik audytu (odczyt) ------------------------ */

/** Dziennik audytu (F10) posortowany malejąco po `at` (najnowsze na górze). */
export function listAudit(): AuditEntry[] {
  return [...auditEntries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/* ------------------------ F4: zgłoszenia nadużyć ------------------------ */

/** Lista zgłoszeń nadużyć (F4). */
export function listAbuseFlags(): AbuseFlag[] {
  return abuseFlags;
}

/**
 * Rozstrzyga zgłoszenie nadużycia (F4): status `reviewed` (domyślnie) lub
 * `dismissed`. Audyt (F10). Brak zgłoszenia → `AbuseFlagNotFoundError` (404).
 */
export function resolveAbuseFlag(
  flagId: string,
  status: 'reviewed' | 'dismissed' = 'reviewed',
): AbuseFlag {
  const flag = abuseFlags.find((f) => f.id === flagId);
  if (!flag) throw new AbuseFlagNotFoundError(flagId);
  flag.status = status;
  appendAudit('abuse.resolved', flagId, `status=${status}`);
  return flag;
}

/* ================================================================== *
 * EPIC E (rozszerzenie) — statystyki (E10), subskrypcja (E12),
 * ustawienia profilu (E11), tryb urlop (E6)
 * ================================================================== *
 * Backend pozostałych sekcji panelu specjalisty. Dane subskrypcji/urlopu to
 * PRZYKŁADOWE (placeholdery) na potrzeby prezentacji panelu. Błędy domenowe
 * poniżej handlery MSW mapują na kody HTTP: 404 — brak zasobu, 400 — zły plan
 * subskrypcji / zły zakres urlopu.
 */

/* ------------------------ Błędy domenowe (grupa E-extra) ------------------------ */

/** Specjalista nie istnieje — handler mapuje na 404. */
export class SpecialistNotFoundError extends Error {
  readonly specialistId: string;
  constructor(specialistId: string) {
    super(`Nie znaleziono specjalisty ${specialistId}.`);
    this.name = 'SpecialistNotFoundError';
    this.specialistId = specialistId;
  }
}

/** Plan subskrypcji spoza katalogu (C2) — handler mapuje na 400. */
export class InvalidSubscriptionPlanError extends Error {
  readonly planId: string;
  constructor(planId: string) {
    super(`Nie znaleziono planu subskrypcji ${planId}.`);
    this.name = 'InvalidSubscriptionPlanError';
    this.planId = planId;
  }
}

/** Nieprawidłowy zakres urlopu (błędne daty lub from > to) — handler mapuje na 400. */
export class InvalidVacationRangeError extends Error {
  readonly from: string;
  readonly to: string;
  constructor(from: string, to: string) {
    super(`Nieprawidłowy zakres urlopu (${from} – ${to}).`);
    this.name = 'InvalidVacationRangeError';
    this.from = from;
    this.to = to;
  }
}

/** Blok urlopu nie istnieje — handler mapuje na 404. */
export class VacationNotFoundError extends Error {
  readonly vacationId: string;
  constructor(vacationId: string) {
    super(`Nie znaleziono wpisu urlopu ${vacationId}.`);
    this.name = 'VacationNotFoundError';
    this.vacationId = vacationId;
  }
}

/* ------------------------ E10: statystyki praktyki ------------------------ */

/**
 * Zagregowane statystyki panelu specjalisty (E10). Liczone na żywo:
 *  - liczniki rezerwacji wg stanu (upcoming = confirmed w przyszłości,
 *    completed, no_show, cancelled_by_*);
 *  - `reviewsCount`/`ratingAvg` z opinii `approved` (fallback do wartości
 *    zapisanych na profilu, gdy brak zatwierdzonych opinii);
 *  - `occupancyPct` = booked / (booked + available) slotów (0–100, zaokrąglone);
 *  - `revenueEstimatePln` = suma cen wizyt `completed`.
 * Zwraca sensowne wartości także przy niewielkiej liczbie danych.
 */
export function getSpecialistStats(specialistId: string): SpecialistStats {
  const now = Date.now();

  let upcomingCount = 0;
  let completedCount = 0;
  let noShowCount = 0;
  let cancelledCount = 0;
  let revenueEstimatePln = 0;

  for (const b of bookings) {
    if (b.specialistId !== specialistId) continue;
    switch (b.state) {
      case BookingState.Confirmed:
        if (Date.parse(b.startsAt) >= now) upcomingCount++;
        break;
      case BookingState.Completed:
        completedCount++;
        revenueEstimatePln += b.pricePln;
        break;
      case BookingState.NoShow:
        noShowCount++;
        break;
      case BookingState.CancelledByPatient:
      case BookingState.CancelledBySpecialist:
        cancelledCount++;
        break;
      default:
        break;
    }
  }

  // Opinie zatwierdzone (żywe) — liczba i średnia; fallback do wartości profilu.
  const approved = reviews.filter(
    (r) => r.specialistId === specialistId && r.status === 'approved',
  );
  const specialist = getSpecialistById(specialistId);
  const reviewsCount = approved.length > 0 ? approved.length : specialist?.ratingCount ?? 0;
  const ratingAvg =
    approved.length > 0
      ? Math.round(
          (approved.reduce((sum, r) => sum + r.rating, 0) / approved.length) * 10,
        ) / 10
      : specialist?.ratingAvg ?? 0;

  // Obłożenie grafiku: booked / (booked + available) w procentach (0–100).
  let bookedSlots = 0;
  let availableSlots = 0;
  for (const s of slots) {
    if (s.specialistId !== specialistId) continue;
    if (s.status === 'booked') bookedSlots++;
    else if (s.status === 'available') availableSlots++;
  }
  const denom = bookedSlots + availableSlots;
  const occupancyPct = denom > 0 ? Math.round((bookedSlots / denom) * 100) : 0;

  return {
    upcomingCount,
    completedCount,
    noShowCount,
    cancelledCount,
    reviewsCount,
    ratingAvg,
    occupancyPct,
    revenueEstimatePln,
  };
}

/* ------------------------ E12: subskrypcja specjalisty ------------------------ */

/** Długość okresu próbnego subskrypcji (dni). */
const SUBSCRIPTION_TRIAL_DAYS = 14;
/** Długość okresu rozliczeniowego do wyliczenia `renewsAt` (dni). */
const SUBSCRIPTION_RENEWAL_DAYS = 30;

/**
 * Subskrypcje specjalistów (in-memory). Seed dla spec_1 (plan „Praktyka",
 * status `trialing`). Eksport do inspekcji/testów.
 */
export const subscriptions: Subscription[] = [];

/** Seeduje subskrypcję demo dla spec_1: plan „Praktyka" (99 zł), status `trialing`. */
function seedSubscriptions(): void {
  const dayMs = 24 * 60 * 60 * 1000;
  const praktyka = SUBSCRIPTION_PLANS.find((p) => p.id === 'plan_praktyka');
  if (!praktyka) return;
  subscriptions.push({
    specialistId: DEMO_SPECIALIST_ID,
    planId: praktyka.id,
    planName: praktyka.name,
    status: 'trialing',
    pricePln: praktyka.pricePln,
    trialEndsAt: new Date(Date.now() + SUBSCRIPTION_TRIAL_DAYS * dayMs).toISOString(),
  });
}

/**
 * Bieżąca subskrypcja specjalisty (E12). Gdy brak — tworzy i zapamiętuje domyślną
 * „Solo" (`trialing`), aby kolejne odczyty były stabilne.
 */
export function getSubscription(specialistId: string): Subscription {
  const existing = subscriptions.find((s) => s.specialistId === specialistId);
  if (existing) return existing;

  const dayMs = 24 * 60 * 60 * 1000;
  const solo = SUBSCRIPTION_PLANS.find((p) => p.id === 'plan_solo');
  const created: Subscription = {
    specialistId,
    planId: solo?.id ?? 'plan_solo',
    planName: solo?.name ?? 'Solo',
    status: 'trialing',
    pricePln: solo?.pricePln ?? 0,
    trialEndsAt: new Date(Date.now() + SUBSCRIPTION_TRIAL_DAYS * dayMs).toISOString(),
  };
  subscriptions.push(created);
  return created;
}

/**
 * Zmiana planu subskrypcji (E12). Waliduje `planId` względem katalogu (C2) —
 * plan spoza katalogu → `InvalidSubscriptionPlanError` (400). Ustawia plan,
 * nazwę i cenę, status `active` oraz `renewsAt` (~30 dni); kończy okres próbny.
 */
export function changeSubscription(
  specialistId: string,
  planId: string,
): Subscription {
  const plan = getSubscriptionPlans().find((p) => p.id === planId);
  if (!plan) throw new InvalidSubscriptionPlanError(planId);

  const dayMs = 24 * 60 * 60 * 1000;
  const current = getSubscription(specialistId); // gwarantuje istnienie wpisu
  current.planId = plan.id;
  current.planName = plan.name;
  current.pricePln = plan.pricePln;
  current.status = 'active';
  current.renewsAt = new Date(
    Date.now() + SUBSCRIPTION_RENEWAL_DAYS * dayMs,
  ).toISOString();
  current.trialEndsAt = undefined; // po przejściu na plan aktywny okres próbny nie obowiązuje
  return current;
}

/* ------------------------ E11: ustawienia profilu ------------------------ */

/**
 * Aktualizuje profil specjalisty (E11): `bio`/`languages`/`online`/`addresses`
 * (edycja częściowa — tylko obecne pola). Brak specjalisty →
 * `SpecialistNotFoundError` (404). Zwraca zaktualizowany profil.
 */
export function updateSpecialist(
  specialistId: string,
  patch: UpdateSpecialistBody,
): Specialist {
  const specialist = getSpecialistById(specialistId);
  if (!specialist) throw new SpecialistNotFoundError(specialistId);
  if (patch.bio !== undefined) specialist.bio = patch.bio;
  if (patch.languages !== undefined) specialist.languages = patch.languages;
  if (patch.online !== undefined) specialist.online = patch.online;
  if (patch.addresses !== undefined) specialist.addresses = patch.addresses;
  return specialist;
}

/* ------------------------ E6: tryb urlop / niedostępność ------------------------ */

/** Bloki urlopu specjalistów (in-memory). Eksport do inspekcji/testów. */
export const vacationBlocks: VacationBlock[] = [];

/** Sekwencja id bloków urlopu (`vac_*`). */
let vacationSeq = 0;

/**
 * Tworzy blok urlopu (E6) i BLOKUJE wolne (available) terminy specjalisty
 * w zakresie [from, to] (→ status `blocked`). Nieprawidłowy zakres (błędne daty
 * lub from > to) → `InvalidVacationRangeError` (400).
 */
export function createVacation(
  specialistId: string,
  body: CreateVacationBody,
): VacationBlock {
  const fromTs = Date.parse(body.from);
  const toTs = Date.parse(body.to);
  if (Number.isNaN(fromTs) || Number.isNaN(toTs) || fromTs > toTs) {
    throw new InvalidVacationRangeError(body.from, body.to);
  }

  const block: VacationBlock = {
    id: `vac_${++vacationSeq}`,
    specialistId,
    from: body.from,
    to: body.to,
    reason: body.reason,
  };
  vacationBlocks.push(block);

  // Zablokuj wolne terminy w zakresie (zajętych/booked nie ruszamy).
  for (const s of slots) {
    if (s.specialistId !== specialistId || s.status !== 'available') continue;
    const ts = Date.parse(s.startsAt);
    if (ts >= fromTs && ts <= toTs) {
      s.status = 'blocked';
      s.lockedUntil = undefined;
    }
  }

  return block;
}

/** Bloki urlopu danego specjalisty (E6). */
export function listVacation(specialistId: string): VacationBlock[] {
  return vacationBlocks.filter((v) => v.specialistId === specialistId);
}

/**
 * Usuwa blok urlopu (E6) i ODBLOKOWUJE terminy w jego zakresie
 * (`blocked → available`) — z wyjątkiem terminów już zajętych (`booked`, które
 * mają inny status i nie są ruszane). Brak bloku → `VacationNotFoundError` (404).
 */
export function deleteVacation(specialistId: string, vacationId: string): void {
  const index = vacationBlocks.findIndex(
    (v) => v.id === vacationId && v.specialistId === specialistId,
  );
  if (index === -1) throw new VacationNotFoundError(vacationId);
  const [removed] = vacationBlocks.splice(index, 1);

  const fromTs = Date.parse(removed.from);
  const toTs = Date.parse(removed.to);
  for (const s of slots) {
    if (s.specialistId !== specialistId || s.status !== 'blocked') continue;
    const ts = Date.parse(s.startsAt);
    if (ts >= fromTs && ts <= toTs) {
      s.status = 'available';
      s.lockedUntil = undefined;
    }
  }
}

seedSubscriptions();
