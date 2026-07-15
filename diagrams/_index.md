# Indeks diagramów flow

Spis: flow → plik → typ → status walidacji mmdc. Aktualizowany po każdej fazie generowania.

| ID | Nazwa | Plik | Typ | Status |
|---|---|---|---|---|
| CORE-STANY | Cykl życia rezerwacji (stany kanoniczne) | [00-stany-rezerwacji.md](00-core/00-stany-rezerwacji.md) | stateDiagram-v2 | OK |
| CORE-WERYFIKACJA | Cykl weryfikacji specjalisty (C3 → D1 → D3) | [00-weryfikacja-specjalisty.md](00-core/00-weryfikacja-specjalisty.md) | stateDiagram-v2 | OK |
| A5 | Checkout rezerwacji (wariant normalny) | [a5-checkout.md](a-pacjent-public/a5-checkout.md) | sequenceDiagram | OK |
| A5 | Checkout — wariant przedpłaty (scoring gate) | [a5-checkout-wariant-przedplata.md](a-pacjent-public/a5-checkout-wariant-przedplata.md) | sequenceDiagram | OK |
| A5 | Checkout — wariant akceptacji specjalisty (scoring gate) | [a5-checkout-wariant-akceptacja.md](a-pacjent-public/a5-checkout-wariant-akceptacja.md) | sequenceDiagram | OK |
| A6 | Płatność online (pełne pokrycie w wariancie przedpłaty) | [a5-checkout-wariant-przedplata.md](a-pacjent-public/a5-checkout-wariant-przedplata.md) | sequenceDiagram | OK |
