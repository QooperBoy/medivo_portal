# Rozbieżności: mapa ↔ architektura v2

Log rozbieżności i braków wykrytych podczas generowania diagramów. Nie rozstrzygamy ich tutaj — do decyzji.

## Setup (2026-07-15)

- **Brak pliku `architektura-v2.md`** — setup (sekcja 4) każe go skopiować jako kontekst biznesowy, ale nie znaleziono go na dysku ani w Downloads. Diagramy generowane wyłącznie na podstawie `mapa-flows-inwentarz-v1.md`; rozbieżności względem architektury v2 nie mogły być weryfikowane. Po uzupełnieniu pliku: przegląd diagramów pod kątem spójności.
- **Brak pliku `prompty-todo-dokumenty-v2.md`** — odwołania #1–#6 z kolumny 🔗 mapy pozostają w notatkach diagramów jako identyfikatory bez linku.

## Z generowania

- **CORE-STANY**: Timeout płatności online (~30 min, A6) zmapowany na cancelled_by_patient — stany kanoniczne z CLAUDE.md nie mają expired/cancelled_by_system; założenie minimalne zapisane w Notatkach. _(faza 1)_
- **CORE-STANY**: Wygaśnięcie locka (TTL 10 min, G5) nie ma stanu kanonicznego — zamodelowane jako przejście do stanu końcowego ze zwrotem slotu do puli. _(faza 1)_
- **CORE-STANY**: Przejście bezpośrednie locked → confirmed (płatność na miejscu, brak gate scoringu) nie występuje w kanonicznym łańcuchu z CLAUDE.md, ale mapa A5 dopuszcza płatność na miejscu — przyjęto założenie minimalne. _(faza 1)_
- **CORE-STANY**: Odrzucenie rezerwacji w pending_approval zmapowane na cancelled_by_specialist — mapa tego nie rozstrzyga. _(faza 1)_
- **CORE-STANY**: Rozstrzygnięcie sporu F3: uznany → completed, odrzucony → powrót do no_show — założenie minimalne, mapa nie opisuje wyniku sporu. _(faza 1)_
- **CORE-STANY**: Event przy przejściu do completed nazwany roboczo visit.approved (mapa nazywa wprost tylko booking.cancelled_late i visit.no_show) — do potwierdzenia w katalogu eventów CORE-EVENTY/G. _(faza 1)_
- **CORE-STANY**: Flaga 2 OTWARTA (decyzja 2026-07-15: oba warianty) — gałęzie pending_payment (przedpłata A6+G9) i pending_approval (akceptacja specjalisty) współistnieją; oznaczone w Notatkach pliku. _(faza 1)_
- **CORE-WERYFIKACJA**: Rozjazd zadanie vs mapa: zadanie przypisuje D2 (profil draft, pełna edycja, demo) do stanu zweryfikowany, a mapa definiuje D2 jako Stan w-trakcie (dostępny już podczas weryfikacji). Zamodelowano wg mapy (nota przy stanach weryfikacji), odnotowane w Notatkach. _(faza 1)_
- **CORE-WERYFIKACJA**: Ścieżka ponownego zgłoszenia po odrzuceniu nieopisana w mapie — założenie minimalne: poprawa danych → powrót do automatu D1 (nie bezpośrednio do kolejki F1); odrzucenie następuje tylko w F1 (automat robi fallback, nie odrzuca sam). _(faza 1)_
- **CORE-WERYFIKACJA**: Brak w mapie ścieżki cofnięcia publikacji po go-live (unpublish/blokada) — poza zakresem C3→D3, blokady konta obsługuje F5. _(faza 1)_
- **A5**: Wariant akceptacji: mapa nie rozstrzyga timeoutu braku reakcji specjalisty na pending_approval. Założenie minimalne: 24 h od utworzenia, potem auto-anulacja jako cancelled_by_specialist + slot do waitlisty (G6) + powiadomienie pacjenta. _(faza 1)_
- **A6**: Stan po auto-anulacji timeoutu płatności (~30 min): kanon CORE-STANY nie ma stanu typu cancelled_by_system/expired. Założenie minimalne: cancelled_by_patient (timeout traktowany jako rezygnacja pacjenta). _(faza 1)_
- **A5**: Wariant akceptacji: kanon stanów nie ma stanu 'rejected' — odrzucenie przez specjalistę zmapowane na cancelled_by_specialist (założenie minimalne). _(faza 1)_
- **A6**: Relacja lock G5 (TTL 10 min) vs okno płatności (~30 min) nierozstrzygnięta w mapie. Założenie: stan pending_payment trzyma slot po wygaśnięciu locka, aż do webhooka G9 lub auto-anulacji. _(faza 1)_
- **A5**: Gate przedpłaty: założenie, że opcja 'płatność na miejscu' jest niedostępna (inaczej sankcja scoringowa G7 nie ma sensu) — mapa nie mówi tego wprost. _(faza 1)_
- **A5**: Lock wygasł w trakcie checkoutu: mapa nie rozstrzyga, co z wpisanymi danymi. Założenie minimalne: powrót do wyboru slotu bez utraty danych formularza. _(faza 1)_
- **A5**: Wariant akceptacji: mapa nie rozstrzyga, czy po odrzuceniu pacjent dostaje propozycje alternatyw (wzorzec E5/A8) — pominięto, tylko powiadomienie o wyniku; zanotowane w pliku. _(faza 1)_
- **A7**: Tokeny samoobsługi: TTL i single-use nierozstrzygnięte (otwarta decyzja z mapy, S1) — spójne z notatką w b3-odwolanie-tokenem.md. _(faza 1)_
- **FLAGA-2**: Status: OTWARTA. Decyzją użytkownika z 2026-07-15 udokumentowano OBA warianty (pełny checkout z płatnością online A6/G9 oraz rezerwacja za akceptacją specjalisty). Oznaczone w Notatkach wszystkich trzech plików. _(faza 1)_
- **CLAUDE.md**: CLAUDE.md wskazuje architektura-v2.md jako kontekst biznesowy, ale plik nie istnieje w projekcie — wszystkie nierozstrzygnięcia rozwiązano założeniami minimalnymi z mapy. _(faza 1)_

