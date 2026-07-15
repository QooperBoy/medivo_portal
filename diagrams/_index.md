# Indeks diagramów flow

Spis: flow → plik → typ → status walidacji mmdc. Aktualizowany po każdej fazie generowania.

| ID | Nazwa | Plik | Typ | Status |
|---|---|---|---|---|
| CORE-STANY | Cykl życia rezerwacji (stany kanoniczne) | [00-stany-rezerwacji.md](00-core/00-stany-rezerwacji.md) | stateDiagram-v2 | OK |
| CORE-WERYFIKACJA | Cykl weryfikacji specjalisty (C3 → D1 → D3) | [00-weryfikacja-specjalisty.md](00-core/00-weryfikacja-specjalisty.md) | stateDiagram-v2 | OK |
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
