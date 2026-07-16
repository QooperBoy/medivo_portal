# G7 — Scoring engine (event-driven)

```mermaid
flowchart TD
    subgraph BE["BE — pod spodem"]
        EV1(["event booking.cancelled_late - pacjent odwołał wizytę za późno (B3)"])
        EV2(["event visit.no_show - pacjent nie pojawił się na wizycie (E7)"])
        EV3(["admin uznał spór pacjenta - nieobecność cofnięta (F3)"])
        COR["korekta: licznik przewinień pacjenta zmniejsza się"]
        CNT["licznik przewinień pacjenta (no-show i późne odwołania)"]
        P0N["wersja minimalna na start (P0): tylko prosty licznik no-show"]
        TH{"czy licznik przekroczył próg ustawiony w konfiguracji? (F8)"}
        LV{"które to z kolei przekroczenie progu?"}
        SAN0["bez sankcji - system tylko zapamiętuje zdarzenie w liczniku"]
        SAN1["sankcja poziom 1: ostrzeżenie dla pacjenta"]
        SAN2["sankcja poziom 2: dodatkowa bariera (gate) przy kolejnej rezerwacji (A5)"]
        SAN3["sankcja poziom 3: blokada konta pacjenta"]
    end
    subgraph FE["FE — widzi user"]
        FE1["pacjent widzi komunikat o nałożonej sankcji"]
        FE2["checkout A5: wymagana przedpłata online"]
        FE3["checkout A5: wymagana ręczna akceptacja specjalisty"]
        FE4["panel specjalisty E4: wskaźnik no-show przy pacjencie"]
        FE5["pacjent może kliknąć 'byłem na wizycie' (B6)"]
    end

    EV1 --> CNT
    EV2 --> CNT
    EV3 --> COR
    COR --> CNT
    CNT -.- P0N
    CNT --> TH
    CNT --> FE4
    TH -->|"nie - licznik poniżej progu"| SAN0
    TH -->|"tak - próg przekroczony"| LV
    LV -->|"pierwsze przekroczenie"| SAN1
    LV -->|"drugie przekroczenie"| SAN2
    LV -->|"trzecie i kolejne (założenie)"| SAN3
    SAN1 --> FE1
    SAN3 -->|"od blokady można się odwołać przez F3"| FE1
    SAN2 -->|"Flaga 2: wariant z płatnością online"| FE2
    SAN2 -->|"Flaga 2: wariant z akceptacją specjalisty"| FE3
    FE1 --> FE5
    FE5 -->|"otwiera zgłoszenie sporu do admina (F3)"| EV3

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class FE1,FE2,FE3,FE4,FE5 fe
    class EV1,EV2,EV3,COR,CNT,P0N,TH,LV,SAN0,SAN1,SAN2,SAN3 be
```

## Notatki
- Event-driven: wejścia `booking.cancelled_late` (B3) i `visit.no_show` (E7) — nazwy kanoniczne z CLAUDE.md.
- **P0 min. = licznik no-show** (mapa G7: "P0 min. → P1 pełny"); pełne progi i sankcje progresywne — P1.
- Progi scoringu konfigurowane per fork — parametry w F8.
- **Sankcje progresywne:** mapa rozstrzyga wprost tylko "2. raz: gate przedpłaty w A5" (ścieżka e2e "No-show + sankcja + spór"); poziom 1 (ostrzeżenie) i poziom 3 (blokada konta, odwołanie przez F3 "odwołania od blokad") — założenia minimalne, zgłoszone w rozbieżnościach.
- **⚠️ Flaga 2 (OTWARTA, decyzja z 2026-07-15 — oba warianty):** gate w checkout A5 = wymagana przedpłata ([[a5-checkout-wariant-przedplata]]) LUB wymagana akceptacja specjalisty ([[a5-checkout-wariant-akceptacja]]); bez płatności online w POC działa wyłącznie wariant akceptacji.
- Spór uznany (F3, stan `disputed → completed`) → korekta licznika w dół / cofnięcie sankcji — założenie minimalne (mapa nie rozstrzyga wprost).
- Wskaźnik no-show pacjenta w E4 (szczegóły rezerwacji u specjalisty) zasilany bezpośrednio licznikiem — widoczny niezależnie od progów.
- Komunikat o sankcji zawiera przycisk "byłem/byłam" (B6) → ticket F3 — pętla korekty na diagramie.
- Powiązania: [[00-katalog-eventow]] (CORE-EVENTY), [[b3-odwolanie-tokenem]] (B3), B6, E4, E7, F3, F8, G8, [[a5-checkout]] (A5), [[g4-auto-approval]].

## Co opisuje ten diagram

Diagram pokazuje silnik scoringu — mechanizm, który w tle zlicza "przewinienia" pacjenta: nieodbyte wizyty (no-show) i zbyt późne odwołania. Uruchamiają go zdarzenia z innych flow (późne odwołanie, oznaczenie no-show, rozstrzygnięcie sporu), a po przekroczeniu progów system nakłada rosnące sankcje: od ostrzeżenia, przez wymóg przedpłaty lub akceptacji przy kolejnej rezerwacji, po blokadę konta. Uczestniczą pacjent (odczuwa sankcje i może się od nich odwołać), specjalista (widzi wskaźnik no-show pacjenta) oraz admin (rozstrzyga spory i odwołania). Silnik działa w sposób ciągły — licznik rośnie i maleje wraz z kolejnymi zdarzeniami, więc flow nie ma jednego punktu końcowego.

## Aktorzy w tym flow

| Rola | Kto to jest | Co robi w tym flow |
|---|---|---|
| **System** (Backend) | serwer platformy — główny "aktor" tego silnika: scoring działa w pełni automatycznie, ludzie tylko wyzwalają zdarzenia swoim zachowaniem lub decyzjami | odbiera eventy o przewinieniach, prowadzi licznik per pacjent, porównuje go z progami z konfiguracji (F8) i nakłada rosnące sankcje |
| **Pacjent** | użytkownik strony; u logopedów najczęściej rodzic rezerwujący wizytę dla dziecka | swoim zachowaniem (późne odwołanie, nieobecność) zasila licznik; odczuwa sankcje i może zakwestionować no-show przyciskiem "byłem na wizycie" (B6) |
| **Specjalista** | logopeda/lekarz przyjmujący wizyty | wyzwala event `visit.no_show`, zgłaszając nieobecność pacjenta (E7); widzi w panelu wskaźnik no-show przy rezerwacjach (E4) |
| **Admin** | operator platformy (back office) | rozstrzyga spory o no-show i odwołania od blokady konta (F3) — jego decyzja koryguje licznik w dół |
| **FE** | to, co użytkownicy widzą w przeglądarce (strona pacjenta i panel specjalisty) | pokazuje komunikaty o sankcjach, wymóg przedpłaty/akceptacji w checkoucie oraz wskaźnik no-show |

## Objaśnienie bloków

| Blok | Co to znaczy w praktyce | Kto tu działa |
|---|---|---|
| event `booking.cancelled_late` (B3) | Wejście nr 1: pacjent odwołał wizytę już po dozwolonym czasie. Flow odwołania (B3) jest **publisherem** (nadawcą) tego eventu, a silnik scoringu jego **konsumentem** (odbiorcą) — dopisuje przewinienie do licznika. | Pacjent (wyzwala), System |
| event `visit.no_show` (E7) | Wejście nr 2: specjalista zgłosił, że pacjent nie pojawił się na wizycie bez odwołania. Również dopisuje przewinienie do licznika. | Specjalista (wyzwala), System |
| admin uznał spór (F3) | Wejście nr 3, działające w drugą stronę: admin przyznał pacjentowi rację w sporze ("byłem na wizycie"), więc wcześniej naliczone przewinienie trzeba wycofać. | Admin (wyzwala), System |
| korekta: licznik zmniejsza się | Skutek uznanego sporu: licznik przewinień maleje, a nałożona już sankcja może zostać cofnięta. | System |
| licznik przewinień pacjenta | Serce silnika: bieżąca suma no-show i późnych odwołań danego pacjenta. Rośnie z każdym przewinieniem, maleje po korekcie. | System |
| wersja minimalna na start (P0) | Notatka wdrożeniowa, nie krok flow (stąd linia przerywana): w pierwszej wersji platformy (priorytet P0) wystarczy prosty licznik samych no-show; pełne progi i sankcje to kolejny etap (P1). | — |
| czy licznik przekroczył próg? (F8) | Decyzja automatu: porównanie licznika z **progiem scoringu** — wartością graniczną, którą operator ustawia w konfiguracji platformy (F8), osobno dla każdego forka. | System |
| bez sankcji | Licznik jest poniżej progu: nic się nie dzieje, system tylko zapamiętuje zdarzenie na przyszłość. | System |
| które to z kolei przekroczenie progu? | Automat sprawdza, czy próg przekroczono po raz pierwszy, drugi czy kolejny — od tego zależy dotkliwość kary. To istota **sankcji progresywnych**: kary rosną z każdym kolejnym razem. | System |
| sankcja poziom 1: ostrzeżenie | Pierwsze przekroczenie progu: pacjent dostaje tylko ostrzeżenie — informację, że jego zachowanie jest odnotowywane i kolejne przewinienia będą miały konsekwencje. | System |
| sankcja poziom 2: gate w A5 | Drugie przekroczenie: przy następnej rezerwacji pacjent napotka **gate** — dodatkową barierę w checkoucie (A5). Zależnie od wariantu (Flaga 2) jest to przedpłata online albo wymóg ręcznej zgody specjalisty. | System |
| sankcja poziom 3: blokada konta | Trzecie i kolejne przekroczenia (założenie projektowe): konto pacjenta zostaje zablokowane — nie może rezerwować wizyt; od blokady można się odwołać do admina (F3). | System |
| pacjent widzi komunikat o sankcji | Widok pacjenta: strona informuje, jaka sankcja została nałożona i dlaczego; stąd też prowadzi droga do zakwestionowania no-show. | Pacjent |
| checkout A5: wymagana przedpłata | Widok gate'u w wariancie z płatnościami online: rezerwacja dojdzie do skutku dopiero po wpłacie z góry. | Pacjent |
| checkout A5: wymagana akceptacja | Widok gate'u w wariancie bez płatności online: rezerwację musi ręcznie zatwierdzić specjalista, zanim stanie się wiążąca. | Pacjent, Specjalista |
| panel E4: wskaźnik no-show | Specjalista widzi przy rezerwacji, ile razy dany pacjent nie stawił się na wizycie — zasilane wprost licznikiem, niezależnie od progów i sankcji. | Specjalista |
| przycisk "byłem na wizycie" (B6) | Z komunikatu o sankcji pacjent może zakwestionować oznaczoną nieobecność — kliknięcie otwiera zgłoszenie (ticket) do rozstrzygnięcia przez admina (F3). Tak domyka się pętla korekty widoczna na diagramie. | Pacjent, Admin |

## Powiązane diagramy

| ID | Diagram | Jak się łączy |
|---|---|---|
| CORE-EVENTY | [00-katalog-eventow.md](../00-core/00-katalog-eventow.md) | eventy wejściowe `booking.cancelled_late` i `visit.no_show` pochodzą z katalogu |
| B3 | [b3-odwolanie-tokenem.md](../b-pacjent-konto/b3-odwolanie-tokenem.md) | zbyt późne odwołanie wizyty emituje `booking.cancelled_late` |
| E7 | [e7-no-show.md](../e-panel/e7-no-show.md) | oznaczenie no-show przez specjalistę emituje `visit.no_show` |
| B6 | [b6-spor-no-show.md](../b-pacjent-konto/b6-spor-no-show.md) | przycisk "byłem/byłam" pozwala pacjentowi zakwestionować no-show i otworzyć spór |
| F3 | [f3-spory.md](../f-backoffice/f3-spory.md) | uznany spór koryguje licznik w dół; tu też odwołania od blokady konta |
| F8 | [f8-konfiguracja-forka.md](../f-backoffice/f8-konfiguracja-forka.md) | progi scoringu są konfigurowane per fork w ustawieniach platformy |
| E4 | [e4-rezerwacje.md](../e-panel/e4-rezerwacje.md) | wskaźnik no-show pacjenta widoczny u specjalisty przy rezerwacji |
| A5 | [a5-checkout.md](../a-pacjent-public/a5-checkout.md) | gate poziomu 2 działa w checkoucie rezerwacji |
| A5 | [a5-checkout-wariant-przedplata.md](../a-pacjent-public/a5-checkout-wariant-przedplata.md) | wariant sankcji poziomu 2: wymagana przedpłata (Flaga 2) |
| A5 | [a5-checkout-wariant-akceptacja.md](../a-pacjent-public/a5-checkout-wariant-akceptacja.md) | wariant sankcji poziomu 2: wymagana akceptacja specjalisty (Flaga 2) |
| G4 | [g4-auto-approval.md](g4-auto-approval.md) | auto-approval jest blokowany dla wizyt `no_show`/`disputed`, których wynik zasila scoring |
| G8 | [00-katalog-eventow.md](../00-core/00-katalog-eventow.md) | fraud detection to pokrewny silnik anty-nadużyciowy z katalogu eventów |

## Słownik

| Pojęcie | Wyjaśnienie |
|---|---|
| Scoring | Zliczanie zachowań pacjenta (no-show, późne odwołania), na podstawie którego system nakłada sankcje. |
| Event-driven | Sposób działania silnika: reaguje na zdarzenia (eventy) z innych części systemu, a nie na harmonogram. |
| Event `booking.cancelled_late` | Komunikat systemowy o odwołaniu wizyty zbyt późno przed terminem. |
| Event `visit.no_show` | Komunikat systemowy, że pacjent nie stawił się na wizycie. |
| Licznik | Suma zdarzeń no-show i późnych odwołań przypisana do konkretnego pacjenta. |
| Próg | Wartość licznika, po której przekroczeniu włącza się sankcja; konfigurowany w F8. |
| Sankcje progresywne | Kary rosnące z każdym przekroczeniem progu: ostrzeżenie → gate w checkoucie → blokada konta. |
| Gate (w A5) | Dodatkowa bariera przy rezerwacji: wymagana przedpłata albo akceptacja specjalisty. |
| Przedpłata | Płatność z góry wymagana od pacjenta z historią no-show. |
| Korekta licznika | Obniżenie licznika (i ewentualne cofnięcie sankcji) po uznaniu sporu pacjenta w F3. |
| Fork | Osobna kopia platformy dla innego wertykału lub rynku, z własną konfiguracją progów. |
| Flaga 2 | Otwarta decyzja projektowa: gate to przedpłata czy akceptacja specjalisty (obecnie oba warianty). |
| No-show | Nieobecność pacjenta na umówionej wizycie bez wcześniejszego odwołania. |
| Publisher / konsument eventu | Publisher to flow, który ogłasza zdarzenie (np. odwołanie B3); konsument to silnik, który na nie reaguje (tu: scoring). |
| P0 / P1 | Priorytety wdrożenia: P0 = minimalny zakres na start platformy, P1 = pełna wersja w kolejnym etapie. |
| Ticket | Zgłoszenie sprawy do rozstrzygnięcia przez admina w back office (tu: spór o no-show trafiający do F3). |
| Blokada konta | Najwyższa sankcja: pacjent traci możliwość rezerwowania wizyt do czasu decyzji admina po odwołaniu (F3). |
| FE / BE | Podział diagramu: FE = to, co użytkownik widzi na stronie; BE = automatyka serwera działająca "pod spodem". |
