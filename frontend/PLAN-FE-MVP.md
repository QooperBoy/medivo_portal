# PLAN-FE-MVP — ZnanyPsycholog (mock FE)

Kompletny front-end marketplace'u rezerwacji wizyt u psychologów/psychoterapeutów,
w 100% na zamockowanym backendzie (MSW), z podglądem ruchu w **BE Inspectorze**.
Źródło prawdy o domenie: `C:\Users\Qoope\claude\flows\diagrams` (stany/eventy/flow
kanoniczne). Design: własny, zielony (duch ZnanyLekarz). **Zasada: zero kopiowania
CSS/assetów/copy z istniejących platform** — ZnanyLekarz służy jako referencja
wzorców UX, nie do dosłownego klonowania.

## Zrealizowane (Iteracje 0–2 + redesign A3)
- **It. 0 — Fundament:** scaffold, `src/domain` (stany/eventy kanoniczne),
  MSW (seed 12 specjalistów), api-client + BE Inspector, design system, demo.
- **It. 1 — Ścieżka pacjenta A2–A7:** `/szukaj`, `/profil/[slug]` (3-sekcyjna
  karta z inline slotami + mapą), checkout (draft→locked→confirmed), `/rezerwacja/[id]`.
- **It. 2 — Panel specjalisty E1–E8:** pulpit, rezerwacje (akceptacja/no-show/
  odbyła-się/odwołanie), grafik (block/unblock/add), usługi (CRUD ze słownika).
- Warstwa graficzna: `src/components/illustrations/*`, `src/components/doodles/*`.

## Do zrobienia — epiki

### EPIC A — Uwierzytelnianie i sesja (b1, c3-login)
- Domena: `User` (role patient/specialist/admin), `Session`. Mock: `/api/auth/*`
  (login, register, session, logout) + demo-konta + szybkie „zaloguj jako demo".
- FE: `/logowanie`, `/rejestracja` (pacjent), `AuthProvider`, stan logowania w
  topbarze (avatar/menu), ochrona tras panelu/konta (redirect + quick-login).

### EPIC B — Konto pacjenta (grupa B)
- b2 `/moje-wizyty` — lista wizyt zalogowanego pacjenta (nadchodzące/historia),
  akcje: odwołaj (B3), zmień termin, wystaw opinię (B5).
- b3 `/odwolaj/[token]` — odwołanie linkiem/tokenem (confirmed→cancelled, late gate).
- b5 `/opinia/[token]` — wystawienie opinii (po completed), auto-filtr treści.
- b6 `/spor/[bookingId]` — spór o no-show („byłem") → disputed.
- b4 waitlista (zapis + „moje zapisy"), b8 formularz przedwizytowy, b9 RODO
  self-service (eksport/usunięcie), b10 preferencje powiadomień, b7 podopieczny.

### EPIC C — Onboarding specjalisty (grupy C/D)
- c1 `/dla-specjalistow` — landing B2B (subskrypcja, wyróżniki, CTA rejestracja).
- c2 sekcja cennika B2B (plany subskrypcji, Omnibus na wyróżnienia płatne).
- c3 `/rejestracja-specjalisty` — rejestracja + PWZ (walidacja formatu, OTP mock).
- d1/d2/d3 `/panel/weryfikacja` — status weryfikacji na żywo (auto→ręczna→
  zweryfikowany/odrzucony), edycja draftu w trakcie, go-live 1 klik.

### EPIC D — Reszta panelu specjalisty (grupa E)
- e5 odwołanie pojedyncze (jest w rezerwacjach — rozbudowa), e6 tryb urlop/choroba
  (blokada zakresu dat), e9 eksport .ics (feed), e10 statystyki, e11 ustawienia
  (profil, adresy multi, języki), e12 subskrypcja/billing, e13 zgłoszenie abuse,
  e14 widget rezerwacji (podgląd + embed), e15 placówka/zespół.

### EPIC E — Back office / admin (grupa F)
- f1 kolejka weryfikacji PWZ (approve/reject), f2 moderacja opinii (approve/reject),
  f3 spory no-show (rozstrzygnięcie → completed/no_show), f4 anty-abuse (flagi),
  f5 użytkownicy (blokady), f6 billing admin, f7 CMS/SEO, f8 konfiguracja forka
  (słownik usług, progi), f9 RBAC/wertykale, f10 audit log.

### EPIC F — Public extras (grupa A)
- a1 wejście SEO (`/[specjalizacja]/[miasto]` stub noindex), a8 brak slotów
  (podobni + waitlista), a9 strony statyczne (o nas, pomoc, regulamin, RODO),
  a5 warianty (przedpłata online, akceptacja specjalisty).

### EPIC G — Silniki widoczne w FE (grupa G)
- g6 waitlista (kaskada) — powierzchnie w B4/E4, g7 scoring (wskaźniki),
  g5 slot-lock (jest), g4 auto-approval (info). Głównie mock + drobne UI.

### EPIC H — Grafika i dopracowanie
- Dodatkowe ilustracje/doodle do nowych sekcji (auth, onboarding, back office,
  puste stany), spójność wizualna, mikrointerakcje, przegląd a11y.

## Metoda wdrożenia
Każdy epik: (delta domeny → delta mocka → UI równolegle) → `npm run build` zielony.
Orchestrator (główny agent) rozdziela pracę subagentom i scala; BE Inspector
pokazuje każde żądanie. Stany rezerwacji zawsze kanoniczne, przejścia przez
`assertTransition`. Definicja ukończenia epiku: build przechodzi, trasy serwują
200, flow zgodny z diagramem.
