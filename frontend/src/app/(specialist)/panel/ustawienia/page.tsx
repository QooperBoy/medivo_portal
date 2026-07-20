'use client';

/**
 * (specialist) /panel/ustawienia — Ustawienia profilu (E11).
 *
 * Renderuje wyłącznie treść sekcji (layout panelu dostarcza nagłówek i
 * nawigację). Stan początkowy formularzy pochodzi z „obecnego specjalisty"
 * (PanelProvider). Zapis: PATCH /api/specialists/:id (silnik E11-settings).
 *
 * Uwaga: zapis nie propaguje do PanelProvider (kontekst ładowany jest raz) —
 * po udanym PATCH prezentujemy lokalnie zapisany stan (echo z odpowiedzi mocka).
 *
 * A11y: etykiety pól, licznik znaków bio (aria-describedby), przełącznik online
 * jako role="switch", chipy języków z przyciskiem usuwania, komunikaty w
 * regionach aria-live, cele dotykowe ≥44px.
 */

import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Address, Specialist, UpdateSpecialistBody } from '@/domain';
import { apiClient } from '@/lib/api-client';
import { Button, Card, CardContent, Chip } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { Leaf, Sparkle } from '@/components/doodles';
import { useCurrentSpecialist } from '@/components/specialist/PanelProvider';
import { cn } from '@/lib/utils';

const FIELD_CLASS =
  'h-11 w-full rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

/** Limit znaków opisu prezentacyjnego (bio). */
const MAX_BIO = 1000;

/** Format polskiego kodu pocztowego „00-000". */
const POSTAL_RE = /^\d{2}-\d{3}$/;

/** Generator lokalnego id dla nowo dodanego adresu (mock echo'uje id). */
function makeAddressId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return `addr_${c.randomUUID()}`;
  return `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function UstawieniaPage() {
  const { specialist, loading, error } = useCurrentSpecialist();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <Leaf className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-ink">Ustawienia profilu</h1>
            <p className="max-w-2xl text-sm text-ink-muted">
              Zredaguj opis, języki obsługi, tryb wizyt online oraz adresy
              gabinetów. Adresy definiują też godziny pracy per adres — ustawisz
              je w grafiku (E2).
            </p>
          </div>
        </div>
        <BeBadge
          endpoint="PATCH /api/specialists/:id"
          desc="Zapis ustawień profilu obsługuje zamockowany backend (MSW): silnik E11-settings."
          className="self-start"
        />
      </header>

      {loading && <SettingsSkeleton />}

      {!loading && error && (
        <p
          role="alert"
          className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          {error}
        </p>
      )}

      {!loading && !error && specialist && (
        <SettingsForm key={specialist.id} specialist={specialist} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Formularz ustawień — lokalny stan zainicjowany z profilu specjalisty
 * ------------------------------------------------------------------ */

type SaveStatus = 'idle' | 'saving' | 'saved';

function SettingsForm({ specialist }: { specialist: Specialist }) {
  const [bio, setBio] = useState(specialist.bio);
  const [languages, setLanguages] = useState<string[]>(specialist.languages);
  const [online, setOnline] = useState(specialist.online);
  const [addresses, setAddresses] = useState<Address[]>(specialist.addresses);

  const [langDraft, setLangDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');

  const bioId = useId();
  const bioCounterId = useId();
  const langInputId = useId();
  const onlineLabelId = useId();
  const onlineDescId = useId();

  /** Każda edycja unieważnia poprzedni komunikat „Zapisano". */
  function touch() {
    setStatus((s) => (s === 'saved' ? 'idle' : s));
  }

  function addLanguage() {
    const value = langDraft.trim();
    if (!value) return;
    const exists = languages.some(
      (l) => l.toLowerCase() === value.toLowerCase(),
    );
    if (!exists) setLanguages((prev) => [...prev, value]);
    setLangDraft('');
    touch();
  }

  function handleLangKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter dodaje język i NIE wysyła całego formularza.
    if (event.key === 'Enter') {
      event.preventDefault();
      addLanguage();
    }
  }

  function removeLanguage(lang: string) {
    setLanguages((prev) => prev.filter((l) => l !== lang));
    touch();
  }

  function updateAddress(id: string, patch: Partial<Address>) {
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
    touch();
  }

  function addAddress() {
    setAddresses((prev) => [
      ...prev,
      { id: makeAddressId(), label: '', street: '', city: '', postalCode: '' },
    ]);
    touch();
  }

  function removeAddress(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    touch();
  }

  function validate(): string | null {
    if (bio.length > MAX_BIO) {
      return `Opis może mieć maksymalnie ${MAX_BIO} znaków.`;
    }
    for (const a of addresses) {
      if (
        !a.label.trim() ||
        !a.street.trim() ||
        !a.city.trim() ||
        !a.postalCode.trim()
      ) {
        return 'Uzupełnij wszystkie pola adresów: etykietę, ulicę, miasto i kod pocztowy.';
      }
      if (!POSTAL_RE.test(a.postalCode.trim())) {
        return 'Kod pocztowy musi mieć format 00-000.';
      }
    }
    return null;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    const body: UpdateSpecialistBody = {
      bio: bio.trim(),
      languages,
      online,
      addresses: addresses.map((a) => ({
        ...a,
        label: a.label.trim(),
        street: a.street.trim(),
        city: a.city.trim(),
        postalCode: a.postalCode.trim(),
      })),
    };

    setStatus('saving');
    try {
      const res = await apiClient.request<Specialist>(
        'PATCH',
        `/api/specialists/${specialist.id}`,
        { body },
      );
      if (res.status === 200) {
        // Echo z mocka — prezentujemy dokładnie zapisany (znormalizowany) stan.
        setBio(res.data.bio);
        setLanguages(res.data.languages);
        setOnline(res.data.online);
        setAddresses(res.data.addresses);
        setStatus('saved');
      } else if (res.status === 404) {
        setStatus('idle');
        setError('Nie znaleziono profilu specjalisty (404).');
      } else {
        setStatus('idle');
        setError(`Nie udało się zapisać zmian (kod ${res.status}).`);
      }
    } catch {
      setStatus('idle');
      setError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    }
  }

  const bioOverLimit = bio.length > MAX_BIO;

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6" noValidate>
      {/* Bio */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={bioId} className="text-lg font-semibold text-ink">
              Opis profilu
            </label>
            <p className="text-sm text-ink-muted">
              Krótko przedstaw swoje podejście i zakres pomocy. Opis widzą
              pacjenci na Twoim profilu.
            </p>
          </div>
          <textarea
            id={bioId}
            value={bio}
            maxLength={MAX_BIO}
            rows={6}
            onChange={(e) => {
              setBio(e.target.value);
              touch();
            }}
            aria-describedby={bioCounterId}
            className={cn(
              'w-full rounded-xl2 border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
              bioOverLimit
                ? 'border-danger-300 focus-visible:border-danger-400'
                : 'border-slate-200 focus-visible:border-brand-500',
            )}
            placeholder="Np. Pracuję w nurcie poznawczo-behawioralnym…"
          />
          <p
            id={bioCounterId}
            className={cn(
              'text-right text-xs',
              bioOverLimit ? 'text-danger-700' : 'text-ink-subtle',
            )}
          >
            {bio.length} / {MAX_BIO} znaków
          </p>
        </CardContent>
      </Card>

      {/* Języki */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-ink">Języki obsługi</h2>
            <p className="text-sm text-ink-muted">
              Języki, w których prowadzisz wizyty. Dodaj kolejny lub usuń
              istniejący.
            </p>
          </div>

          {languages.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Wybrane języki">
              {languages.map((lang) => (
                <li key={lang}>
                  <Chip
                    variant="brand"
                    onRemove={() => removeLanguage(lang)}
                    removeLabel={`Usuń język ${lang}`}
                  >
                    {lang}
                  </Chip>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-subtle">
              Brak dodanych języków. Dodaj co najmniej jeden.
            </p>
          )}

          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor={langInputId}
                className="text-sm font-medium text-ink"
              >
                Dodaj język
              </label>
              <input
                id={langInputId}
                type="text"
                value={langDraft}
                onChange={(e) => setLangDraft(e.target.value)}
                onKeyDown={handleLangKeyDown}
                className={FIELD_CLASS}
                placeholder="Np. angielski"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addLanguage}
              disabled={langDraft.trim().length === 0}
            >
              Dodaj
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wizyty online */}
      <Card>
        <CardContent className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span id={onlineLabelId} className="text-lg font-semibold text-ink">
              Wizyty online
            </span>
            <span id={onlineDescId} className="max-w-md text-sm text-ink-muted">
              Gdy włączone, pacjenci mogą rezerwować u Ciebie wizyty zdalne.
            </span>
          </div>
          <Toggle
            checked={online}
            onChange={(next) => {
              setOnline(next);
              touch();
            }}
            labelledBy={onlineLabelId}
            describedBy={onlineDescId}
          />
        </CardContent>
      </Card>

      {/* Adresy gabinetów */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-ink">Adresy gabinetów</h2>
            <p className="text-sm text-ink-muted">
              Miejsca wizyt stacjonarnych. Każdy adres ma osobne godziny pracy w
              grafiku (E2).
            </p>
          </div>

          {addresses.length === 0 ? (
            <p className="text-sm text-ink-subtle">
              Brak adresów. Dodaj adres, aby przyjmować stacjonarnie.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {addresses.map((address, index) => (
                <li key={address.id}>
                  <AddressEditor
                    address={address}
                    index={index}
                    onChange={(patch) => updateAddress(address.id, patch)}
                    onRemove={() => removeAddress(address.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          <div>
            <Button type="button" variant="secondary" onClick={addAddress}>
              Dodaj adres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stopka: błąd / status / zapis */}
      <div className="flex flex-col gap-3">
        {error && (
          <p
            role="alert"
            className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <p
            role="status"
            aria-live="polite"
            className={cn(
              'inline-flex items-center gap-1.5 text-sm',
              status === 'saved' ? 'text-brand-700' : 'text-ink-subtle',
            )}
          >
            {status === 'saving' && 'Zapisywanie…'}
            {status === 'saved' && (
              <>
                <Sparkle className="h-4 w-4 text-brand-500" />
                Zapisano
              </>
            )}
          </p>
          <Button type="submit" variant="primary" loading={status === 'saving'}>
            Zapisz zmiany
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ *
 * Edytor pojedynczego adresu (inline). Zachowuje id oraz lat/lng.
 * ------------------------------------------------------------------ */

interface AddressEditorProps {
  address: Address;
  index: number;
  onChange: (patch: Partial<Address>) => void;
  onRemove: () => void;
}

function AddressEditor({
  address,
  index,
  onChange,
  onRemove,
}: AddressEditorProps) {
  const labelId = useId();
  const streetId = useId();
  const cityId = useId();
  const postalId = useId();

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl2 border border-slate-200 bg-surface-muted p-4">
      <legend className="sr-only">Adres {index + 1}</legend>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">Adres {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-danger-700 hover:bg-danger-50"
        >
          Usuń adres
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={labelId} className="text-sm font-medium text-ink">
            Etykieta
          </label>
          <input
            id={labelId}
            type="text"
            value={address.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Np. Gabinet centrum"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={streetId} className="text-sm font-medium text-ink">
            Ulica i numer
          </label>
          <input
            id={streetId}
            type="text"
            value={address.street}
            onChange={(e) => onChange({ street: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Np. ul. Zielona 12/3"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={cityId} className="text-sm font-medium text-ink">
            Miasto
          </label>
          <input
            id={cityId}
            type="text"
            value={address.city}
            onChange={(e) => onChange({ city: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Np. Warszawa"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={postalId} className="text-sm font-medium text-ink">
            Kod pocztowy
          </label>
          <input
            id={postalId}
            type="text"
            inputMode="numeric"
            value={address.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
            className={FIELD_CLASS}
            placeholder="00-000"
          />
        </div>
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ *
 * Dostępny przełącznik (role="switch"), cel dotykowy ≥44px
 * ------------------------------------------------------------------ */

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy: string;
  describedBy: string;
}

function Toggle({ checked, onChange, labelledBy, describedBy }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-11 w-[68px] shrink-0 cursor-pointer items-center rounded-full px-1 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        checked ? 'bg-brand-600' : 'bg-slate-300',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-9 w-9 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function SettingsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Wczytuję ustawienia profilu…</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-40 animate-pulse rounded-xl2 bg-surface-subtle"
        />
      ))}
    </div>
  );
}
