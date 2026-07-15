# Indeks diagramów flow

Spis: flow → plik → typ → status walidacji mmdc. Aktualizowany po każdej fazie generowania.

| ID | Nazwa | Plik | Typ | Status |
|---|---|---|---|---|
| CORE-STANY | Cykl życia rezerwacji (stany kanoniczne) | [00-stany-rezerwacji.md](00-core/00-stany-rezerwacji.md) | stateDiagram-v2 | OK |
| CORE-WERYFIKACJA | Cykl weryfikacji specjalisty (C3 → D1 → D3) | [00-weryfikacja-specjalisty.md](00-core/00-weryfikacja-specjalisty.md) | stateDiagram-v2 | OK |
| CORE-EVENTY | Katalog eventów domenowych (silniki G1–G13) | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| A1 | Wejście SEO/direct | [a1-wejscie-seo.md](a-pacjent-public/a1-wejscie-seo.md) | flowchart TD | OK |
| A2 | Wyszukiwanie | [a2-wyszukiwanie.md](a-pacjent-public/a2-wyszukiwanie.md) | flowchart TD | OK |
| A3 | Lista wyników | [a3-lista-wynikow.md](a-pacjent-public/a3-lista-wynikow.md) | flowchart TD | OK |
| A4 | Profil specjalisty | [a4-profil-specjalisty.md](a-pacjent-public/a4-profil-specjalisty.md) | flowchart TD | OK |
| A5 | Checkout rezerwacji (wariant normalny) | [a5-checkout.md](a-pacjent-public/a5-checkout.md) | sequenceDiagram | OK |
| A5 | Checkout — wariant przedpłaty (scoring gate) | [a5-checkout-wariant-przedplata.md](a-pacjent-public/a5-checkout-wariant-przedplata.md) | sequenceDiagram | OK |
| A5 | Checkout — wariant akceptacji specjalisty (scoring gate) | [a5-checkout-wariant-akceptacja.md](a-pacjent-public/a5-checkout-wariant-akceptacja.md) | sequenceDiagram | OK |
| A6 | Płatność online (pełne pokrycie w wariancie przedpłaty) | [a5-checkout-wariant-przedplata.md](a-pacjent-public/a5-checkout-wariant-przedplata.md) | sequenceDiagram | OK |
| A7 | Potwierdzenie rezerwacji | [a7-potwierdzenie.md](a-pacjent-public/a7-potwierdzenie.md) | flowchart TD | OK |
| A8 | Brak slotów | [a8-brak-slotow.md](a-pacjent-public/a8-brak-slotow.md) | flowchart TD | OK |
| A9 | Strony statyczne | [a9-strony-statyczne.md](a-pacjent-public/a9-strony-statyczne.md) | flowchart TD | OK |
| B1 | Logowanie | [b1-logowanie.md](b-pacjent-konto/b1-logowanie.md) | flowchart TD | OK |
| B2 | Moje wizyty | [b2-moje-wizyty.md](b-pacjent-konto/b2-moje-wizyty.md) | flowchart TD | OK |
| B3 | Zmiana/odwołanie wizyty tokenem | [b3-odwolanie-tokenem.md](b-pacjent-konto/b3-odwolanie-tokenem.md) | sequenceDiagram | OK |
| B4 | Waitlista | [b4-waitlista.md](b-pacjent-konto/b4-waitlista.md) | sequenceDiagram | OK |
| B5 | Wystawienie opinii | [b5-wystawienie-opinii.md](b-pacjent-konto/b5-wystawienie-opinii.md) | flowchart TD | OK |
| B6 | Spór no-show | [b6-spor-no-show.md](b-pacjent-konto/b6-spor-no-show.md) | flowchart TD | OK |
| B7 | Pacjent ≠ rezerwujący (podopieczny) | [b7-pacjent-podopieczny.md](b-pacjent-konto/b7-pacjent-podopieczny.md) | flowchart TD | OK |
| B8 | Formularz przedwizytowy | [b8-formularz-przedwizytowy.md](b-pacjent-konto/b8-formularz-przedwizytowy.md) | flowchart TD | OK |
| B9 | RODO self-service | [b9-rodo-self-service.md](b-pacjent-konto/b9-rodo-self-service.md) | flowchart TD | OK |
| B10 | Preferencje powiadomień | [b10-preferencje-powiadomien.md](b-pacjent-konto/b10-preferencje-powiadomien.md) | flowchart TD | OK |
| C1 | Landing /dla-specjalistow | [c1-landing-dla-specjalistow.md](cd-specjalista-onboarding/c1-landing-dla-specjalistow.md) | flowchart TD | OK |
| C2 | Cennik B2B | [c2-cennik-b2b.md](cd-specjalista-onboarding/c2-cennik-b2b.md) | flowchart TD | OK |
| C3 | Rejestracja specjalisty | [c3-rejestracja.md](cd-specjalista-onboarding/c3-rejestracja.md) | flowchart TD | OK |
| D1 | Weryfikacja PWZ | [d1-weryfikacja-pwz.md](cd-specjalista-onboarding/d1-weryfikacja-pwz.md) | sequenceDiagram | OK |
| D2 | Stan "w trakcie" (onboarding podczas weryfikacji) | [d2-stan-w-trakcie.md](cd-specjalista-onboarding/d2-stan-w-trakcie.md) | flowchart TD | OK |
| D3 | Go-live profilu specjalisty | [d3-go-live.md](cd-specjalista-onboarding/d3-go-live.md) | flowchart TD | OK |
| E1 | Dashboard specjalisty | [e1-dashboard.md](e-panel/e1-dashboard.md) | flowchart TD | OK |
| E2 | Grafik / dostępność | [e2-grafik-dostepnosc.md](e-panel/e2-grafik-dostepnosc.md) | flowchart TD | OK |
| E3 | Usługi i ceny | [e3-uslugi-ceny.md](e-panel/e3-uslugi-ceny.md) | flowchart TD | OK |
| E4 | Rezerwacje (lista, akceptacja, wizyty offline) | [e4-rezerwacje.md](e-panel/e4-rezerwacje.md) | flowchart TD | OK |
| E5 | Odwołanie/przesunięcie pojedynczej wizyty | [e5-odwolanie-pojedyncze.md](e-panel/e5-odwolanie-pojedyncze.md) | sequenceDiagram | OK |
| E6 | Tryb urlop/choroba (bulk) | [e6-tryb-urlop.md](e-panel/e6-tryb-urlop.md) | sequenceDiagram | OK |
| E7 | No-show (nie stawił się) | [e7-no-show.md](e-panel/e7-no-show.md) | flowchart TD | OK |
| E8 | Approval wizyt + opinie | [e8-approval-opinie.md](e-panel/e8-approval-opinie.md) | sequenceDiagram | OK |
| E9 | Eksport .ics (feed kalendarza) | [e9-eksport-ics.md](e-panel/e9-eksport-ics.md) | flowchart TD | OK |
| E10 | Statystyki specjalisty | [e10-statystyki.md](e-panel/e10-statystyki.md) | flowchart TD | OK |
| E11 | Ustawienia specjalisty | [e11-ustawienia.md](e-panel/e11-ustawienia.md) | flowchart TD | OK |
| E12 | Subskrypcja / billing specjalisty | [e12-subskrypcja-billing.md](e-panel/e12-subskrypcja-billing.md) | flowchart TD | OK |
| E13 | Zgłoszenie abuse (blokowanie kalendarza) | [e13-zgloszenie-abuse.md](e-panel/e13-zgloszenie-abuse.md) | flowchart TD | OK |
| E14 | Widget rezerwacji (embed) | [e14-widget-rezerwacji.md](e-panel/e14-widget-rezerwacji.md) | flowchart TD | OK |
| E15 | Placówka / zespół | [e15-placowka-zespol.md](e-panel/e15-placowka-zespol.md) | flowchart TD | OK |
| F1 | Kolejka weryfikacji PWZ | [f1-kolejka-weryfikacji-pwz.md](f-backoffice/f1-kolejka-weryfikacji-pwz.md) | flowchart TD | OK |
| F2 | Moderacja opinii | [f2-moderacja-opinii.md](f-backoffice/f2-moderacja-opinii.md) | flowchart TD | OK |
| F3 | Spory | [f3-spory.md](f-backoffice/f3-spory.md) | flowchart TD | OK |
| F4 | Anty-abuse | [f4-anty-abuse.md](f-backoffice/f4-anty-abuse.md) | flowchart TD | OK |
| F5 | Użytkownicy | [f5-uzytkownicy.md](f-backoffice/f5-uzytkownicy.md) | flowchart TD | OK |
| F6 | Billing admin | [f6-billing-admin.md](f-backoffice/f6-billing-admin.md) | flowchart TD | OK |
| F7 | CMS/SEO | [f7-cms-seo.md](f-backoffice/f7-cms-seo.md) | flowchart TD | OK |
| F8 | Konfiguracja forka | [f8-konfiguracja-forka.md](f-backoffice/f8-konfiguracja-forka.md) | flowchart TD | OK |
| F9 | RBAC + filtr wertykali | [f9-rbac-wertykale.md](f-backoffice/f9-rbac-wertykale.md) | flowchart TD | OK |
| F10 | Audit log | [f10-audit-log.md](f-backoffice/f10-audit-log.md) | flowchart TD | OK |
| G1 | Notification engine | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| G2 | Reminder T−24 h | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| G3 | Review ask T+2 h | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| G4 | Auto-approval T+48 h | [g4-auto-approval.md](g-silniki/g4-auto-approval.md) | sequenceDiagram | OK |
| G5 | Slot lock (TTL 10 min) | [g5-slot-lock.md](g-silniki/g5-slot-lock.md) | sequenceDiagram | OK |
| G6 | Waitlist engine (FIFO, okno 2 h) | [g6-waitlist-engine.md](g-silniki/g6-waitlist-engine.md) | sequenceDiagram | OK |
| G7 | Scoring engine (event-driven) | [g7-scoring-engine.md](g-silniki/g7-scoring-engine.md) | flowchart TD | OK |
| G8 | Fraud detection | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| G9 | Payment webhooks | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| G10 | Calendar sync 2-way | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| G11 | RODO joby | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| G12 | SEO joby | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| G13 | Ops (backupy, monitoring, alerting) | [00-katalog-eventow.md](00-core/00-katalog-eventow.md) | flowchart LR | OK |
| E2E-1 | Pacjent nowy (happy path) | [e2e-1-pacjent-nowy.md](e2e/e2e-1-pacjent-nowy.md) | flowchart LR | OK |
| E2E-2 | Pacjent zmienia termin | [e2e-2-zmiana-terminu.md](e2e/e2e-2-zmiana-terminu.md) | flowchart LR | OK |
| E2E-3 | Specjalista: od landingu do 1. rezerwacji | [e2e-3-specjalista-do-rezerwacji.md](e2e/e2e-3-specjalista-do-rezerwacji.md) | flowchart LR | OK |
| E2E-4 | No-show, sankcja i spór | [e2e-4-no-show-sankcja-spor.md](e2e/e2e-4-no-show-sankcja-spor.md) | flowchart LR | OK |
| E2E-5 | Sabotaż slotów (blokowanie kalendarza) | [e2e-5-sabotaz-slotow.md](e2e/e2e-5-sabotaz-slotow.md) | flowchart LR | OK |
| E2E-6 | Dzień admina (Back Office) | [e2e-6-dzien-admina.md](e2e/e2e-6-dzien-admina.md) | flowchart LR | OK |
