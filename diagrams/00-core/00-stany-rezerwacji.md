# CORE-STANY — Cykl życia rezerwacji (stany kanoniczne)

```mermaid
stateDiagram-v2
    [*] --> draft : wejście w checkout (A5)
    draft : koszyk rezerwacji, bez locka
    draft --> locked : wybór slotu — lock (G5)
    draft --> [*] : porzucenie checkoutu

    locked : slot zablokowany, TTL 10 min
    locked --> [*] : TTL wygasł — slot wraca do puli
    locked --> pending_payment : scoring gate — wymagana przedpłata
    locked --> pending_approval : scoring gate — wymagana akceptacja
    locked --> confirmed : płatność na miejscu, bez gate

    pending_payment : czeka na płatność online (A6)
    pending_payment --> confirmed : webhook payment OK (G9)
    pending_payment --> cancelled_by_patient : timeout ~30 min — auto-anulacja (A6)

    pending_approval : czeka na decyzję specjalisty (E4)
    pending_approval --> confirmed : specjalista akceptuje (E4)
    pending_approval --> cancelled_by_specialist : specjalista odrzuca (E4)

    confirmed : wizyta umówiona (A7, G2)
    confirmed --> cancelled_by_patient : odwołanie w terminie (B3) — booking.cancelled
    confirmed --> cancelled_by_patient : odwołanie po terminie (B3) — booking.cancelled_late
    confirmed --> cancelled_by_specialist : odwołanie specjalisty (E5/E6)
    confirmed --> completed : approval wizyty (E8)
    confirmed --> completed : auto-approval T+48 h (G4)
    confirmed --> no_show : oznaczenie nieobecności (E7) — visit.no_show

    no_show : sankcje scoringu (G7)
    no_show --> disputed : spór pacjenta "byłem" (B6)
    no_show --> [*]

    disputed : otwarty ticket sporu (F3)
    disputed --> completed : spór uznany — pacjent był (F3)
    disputed --> no_show : spór odrzucony (F3)

    completed : odblokowuje opinię (G3, B5)
    completed --> [*]
    cancelled_by_patient --> [*] : slot do puli / waitlista (G6)
    cancelled_by_specialist --> [*] : slot do puli / waitlista (G6)

    note right of confirmed
        Flaga 3 — G4 auto-approval T+48 h
        ZABLOKOWANY, gdy wizyta ma
        no_show lub otwarty spór (disputed)
    end note
```

## Notatki

**TTL-e i timery:**
- Lock slotu: **TTL 10 min** od wejścia w checkout (silnik [[G5]]); wygaśnięcie = koniec rezerwacji, slot natychmiast wraca do puli dostępności (A3/A4).
- Okno płatności online: **~30 min** (benchmark ZL, mapa A6) → auto-anulacja przez job.
- Auto-approval: **T+48 h** po terminie wizyty ([[G4]]) — zablokowany przy `no_show`/`disputed` (Flaga 3).
- Przypomnienie T−24 h ([[G2]]) działa tylko w `confirmed`; prośba o opinię T+2 h ([[G3]]) tylko po `completed`.

**Eventy emitowane przy przejściach:**
- `confirmed` (wejście): `booking.created` → A7 (potwierdzenie, tokeny samoobsługi, .ics), enqueue [[G1]], scheduler [[G2]].
- `cancelled_by_patient` w terminie: `booking.cancelled` → powiadomienia obu stron ([[G1]]), zwolniony slot → waitlista ([[G6]]).
- `cancelled_by_patient` po terminie: `booking.cancelled_late` → scoring ([[G7]]) + waitlista ([[G6]]).
- `cancelled_by_specialist`: `booking.cancelled` + licznik odwołań specjalisty ([[E5]]/[[E6]]), slot → waitlista ([[G6]]).
- `no_show`: `visit.no_show` → scoring/sankcje progresywne ([[G7]]); 2. no-show = gate przedpłaty/akceptacji w A5.
- `completed`: `visit.approved` (nazwa robocza — założenie) → timer [[G3]] (review ask T+2 h), token opinii [[B5]].

**Założenia minimalne (mapa nie rozstrzyga):**
- Timeout płatności mapowany na `cancelled_by_patient` (brak wpłaty = rezygnacja pacjenta); stany kanoniczne nie mają osobnego `expired`/`cancelled_by_system`.
- Wygaśnięcie locka (TTL) kończy rezerwację bez stanu kanonicznego "expired" — modelowane jako przejście do stanu końcowego.
- Odrzucenie w `pending_approval` mapowane na `cancelled_by_specialist`.
- Ścieżka `locked → confirmed` (płatność na miejscu, brak gate scoringu) — mapa A5 dopuszcza płatność na miejscu, a łańcuch kanoniczny jej wprost nie pokazuje; przyjęto przejście bezpośrednie.
- Rozstrzygnięcie sporu (F3): uznany → `completed`, odrzucony → powrót do `no_show` — założenie minimalne.

**Flaga 2 (OTWARTA, decyzja z 2026-07-15 — dokumentujemy oba warianty):** gałąź `pending_payment` (przedpłata online, A6 + G9) i gałąź `pending_approval` ("rezerwacja za akceptacją specjalisty") współistnieją na diagramie; jeśli POC ruszy bez płatności online, gałąź `pending_payment` jest nieaktywna, a sankcją scoringu pozostaje wyłącznie akceptacja specjalisty.

**Odwołania:** [[a5-checkout]] (A5), A6, A7, [[b3-odwolanie-tokenem]] (B3), B5, B6, E4, E5, E6, E7, E8, G2, G3, G4, G5, G6, G7, G9.

## Co opisuje ten diagram

Ten diagram pokazuje pełny cykl życia pojedynczej rezerwacji wizyty — od momentu, gdy pacjent wchodzi w proces rezerwacji, aż po jej zakończenie. Uczestniczą w nim pacjent (rezerwuje, płaci, odwołuje, może otworzyć spór), specjalista (akceptuje, odwołuje, zatwierdza wizytę, oznacza nieobecność), admin (rozstrzyga spory) oraz system (pilnuje limitów czasowych i automatycznych przejść). Flow uruchamia się przy wejściu w checkout, a kończy w jednym ze stanów końcowych: wizyta odbyta, odwołana przez którąś ze stron albo nieobecność pacjenta. To diagram-fundament — wszystkie pozostałe flowy rezerwacyjne używają dokładnie tych nazw stanów.

## Powiązane diagramy

| ID | Diagram | Jak się łączy |
|---|---|---|
| A5 | [a5-checkout.md](../a-pacjent-public/a5-checkout.md) | wejście w checkout tworzy stan draft i uruchamia lock slotu |
| A6 | [a5-checkout-wariant-przedplata.md](../a-pacjent-public/a5-checkout-wariant-przedplata.md) | płatność online domyka pending_payment; timeout ~30 min = auto-anulacja |
| A7 | [a7-potwierdzenie.md](../a-pacjent-public/a7-potwierdzenie.md) | po wejściu w confirmed pacjent dostaje potwierdzenie i tokeny samoobsługi |
| A3 | [a3-lista-wynikow.md](../a-pacjent-public/a3-lista-wynikow.md) | slot po wygaśnięciu locka lub anulacji wraca do puli widocznej na liście wyników |
| A4 | [a4-profil-specjalisty.md](../a-pacjent-public/a4-profil-specjalisty.md) | zwolniony slot jest znów widoczny na profilu specjalisty |
| B3 | [b3-odwolanie-tokenem.md](../b-pacjent-konto/b3-odwolanie-tokenem.md) | odwołanie pacjenta (w terminie lub po) prowadzi do cancelled_by_patient |
| B5 | [b5-wystawienie-opinii.md](../b-pacjent-konto/b5-wystawienie-opinii.md) | stan completed odblokowuje wystawienie opinii |
| B6 | [b6-spor-no-show.md](../b-pacjent-konto/b6-spor-no-show.md) | spór pacjenta "byłem" przenosi no_show w disputed |
| E4 | [e4-rezerwacje.md](../e-panel/e4-rezerwacje.md) | akceptacja lub odrzucenie przez specjalistę rozstrzyga pending_approval |
| E5 | [e5-odwolanie-pojedyncze.md](../e-panel/e5-odwolanie-pojedyncze.md) | odwołanie pojedynczej wizyty przez specjalistę daje cancelled_by_specialist |
| E6 | [e6-tryb-urlop.md](../e-panel/e6-tryb-urlop.md) | hurtowe odwołania (urlop/choroba) również prowadzą do cancelled_by_specialist |
| E7 | [e7-no-show.md](../e-panel/e7-no-show.md) | oznaczenie nieobecności przenosi wizytę w no_show |
| E8 | [e8-approval-opinie.md](../e-panel/e8-approval-opinie.md) | ręczny approval wizyty zamyka ją jako completed |
| F3 | [f3-spory.md](../f-backoffice/f3-spory.md) | rozstrzygnięcie sporu decyduje: completed albo powrót do no_show |
| G1 | [00-katalog-eventow.md](00-katalog-eventow.md) | powiadomienia SMS/email wysyłane przy przejściach stanów |
| G2 | [00-katalog-eventow.md](00-katalog-eventow.md) | przypomnienie T−24 h działa tylko w stanie confirmed |
| G3 | [00-katalog-eventow.md](00-katalog-eventow.md) | prośba o opinię T+2 h wysyłana dopiero po completed |
| G4 | [g4-auto-approval.md](../g-silniki/g4-auto-approval.md) | auto-approval T+48 h przenosi confirmed w completed (blokowany Flagą 3) |
| G5 | [g5-slot-lock.md](../g-silniki/g5-slot-lock.md) | lock slotu z TTL 10 min tworzy stan locked |
| G6 | [g6-waitlist-engine.md](../g-silniki/g6-waitlist-engine.md) | zwolniony slot po anulacji trafia do kaskady waitlisty |
| G7 | [g7-scoring-engine.md](../g-silniki/g7-scoring-engine.md) | późne odwołania i no-show zasilają scoring i sankcje |
| G9 | [00-katalog-eventow.md](00-katalog-eventow.md) | webhook płatności potwierdza rezerwację czekającą w pending_payment |

## Słownik

| Pojęcie | Wyjaśnienie |
|---|---|
| Stan kanoniczny | Ustalona, wspólna dla całego projektu nazwa etapu życia rezerwacji (np. confirmed, no_show), używana we wszystkich diagramach. |
| Slot | Konkretny termin wizyty w kalendarzu specjalisty, który pacjent może zarezerwować. |
| Lock | Tymczasowa blokada slotu na czas checkoutu, żeby dwie osoby nie zarezerwowały tego samego terminu. |
| TTL | Czas życia blokady — po 10 minutach bez dokończenia rezerwacji slot automatycznie wraca do puli. |
| Scoring gate | Dodatkowy warunek w checkoucie (przedpłata albo akceptacja specjalisty) nakładany na pacjentów z historią nieobecności. |
| Webhook | Automatyczne powiadomienie od procesora płatności, że wpłata doszła — potwierdza rezerwację bez udziału człowieka. |
| No-show | Sytuacja, w której pacjent nie pojawia się na umówionej wizycie bez odwołania. |
| Auto-approval | Automatyczne uznanie wizyty za odbytą 48 godzin po jej terminie, jeśli specjalista nie zrobił tego ręcznie. |
| Waitlista | Lista oczekujących pacjentów, którym system proponuje zwolniony termin. |
| Spór (disputed) | Zgłoszenie pacjenta kwestionujące oznaczenie nieobecności, rozstrzygane przez admina. |
| Event | Zdarzenie domenowe (np. booking.cancelled_late) emitowane przy przejściu między stanami, uruchamiające automatyczne silniki systemu. |
