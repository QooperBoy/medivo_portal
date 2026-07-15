# B1 — Logowanie

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        START["Ekran logowania — bez haseł"]
        METODA{"Metoda: telefon czy email?"}
        NUMER["Podanie numeru telefonu"]
        EMAIL["Podanie adresu email"]
        SMSKOD["SMS z kodem OTP"]
        WPISZKOD["Wpisanie kodu OTP"]
        MAILLINK["Email z magic linkiem"]
        KLIK["Klik w magic link"]
        BLADLIMIT["Komunikat: za dużo prób"]
        BLADKOD["Błędny kod — ponów"]
        LINKWYGASL["Link wygasł — wyślij nowy"]
        ZALOGOWANY["Zalogowany — Moje wizyty B2"]
    end
    subgraph BE["BE — pod spodem"]
        RLOTP{"Rate limiting OK?"}
        RLMAIL{"Rate limiting OK?"}
        OTPSVC["OTP service: generacja kodu"]
        MAGICSVC["Generacja magic linku"]
        WERYFIKACJA{"Kod poprawny?"}
        WALIDACJA{"Link ważny — TTL?"}
        SESJA["Utworzenie sesji"]
    end
    START --> METODA
    METODA -->|telefon| NUMER
    METODA -->|email| EMAIL
    NUMER --> RLOTP
    RLOTP -->|tak| OTPSVC --> SMSKOD --> WPISZKOD --> WERYFIKACJA
    RLOTP -->|nie| BLADLIMIT
    EMAIL --> RLMAIL
    RLMAIL -->|tak| MAGICSVC --> MAILLINK --> KLIK --> WALIDACJA
    RLMAIL -->|nie| BLADLIMIT
    WERYFIKACJA -->|tak| SESJA
    WERYFIKACJA -->|nie| BLADKOD --> WPISZKOD
    WALIDACJA -->|tak| SESJA
    WALIDACJA -->|nie| LINKWYGASL --> EMAIL
    SESJA --> ZALOGOWANY
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class START,METODA,NUMER,EMAIL,SMSKOD,WPISZKOD,MAILLINK,KLIK,BLADLIMIT,BLADKOD,LINKWYGASL,ZALOGOWANY fe
    class RLOTP,RLMAIL,OTPSVC,MAGICSVC,WERYFIKACJA,WALIDACJA,SESJA be
```

## Notatki
- Bez haseł: numer telefonu = tożsamość (jak przy 1. rezerwacji w A5); email = kanał zapasowy (magic link).
- Rate limiting: dotyczy wysyłki OTP/magic linków; limit błędnych kodów przyjęty jako część tego samego mechanizmu (mapa nie rozdziela) — po przekroczeniu ten sam komunikat "za dużo prób".
- TTL magic linku i czas życia sesji — mapa nie rozstrzyga; założenie minimalne: link jednorazowy z TTL, sesja standardowa.
- Powiązania: A5 (OTP przy 1. rezerwacji tworzy lekkie konto), B2 (cel po zalogowaniu), B3 (fallback przy nieważnym tokenie), G8 (limity per numer/IP/device).

## Co opisuje ten diagram
Diagram pokazuje, jak pacjent loguje się do swojego konta — bez hasła. Pacjent wybiera metodę: numer telefonu (dostaje jednorazowy kod SMS) albo email (dostaje link logujący). System po cichu sprawdza limity prób oraz poprawność kodu lub ważność linku, a po sukcesie tworzy sesję i przenosi pacjenta na ekran "Moje wizyty". Uczestniczą tu tylko pacjent i system.

## Powiązane diagramy
| ID | Diagram | Jak się łączy |
|---|---|---|
| A5 | [a5-checkout.md](../a-pacjent-public/a5-checkout.md) | ten sam OTP przy 1. rezerwacji tworzy lekkie konto |
| B2 | [b2-moje-wizyty.md](b2-moje-wizyty.md) | ekran docelowy po udanym logowaniu |
| B3 | [b3-odwolanie-tokenem.md](b3-odwolanie-tokenem.md) | logowanie jako awaryjna ścieżka przy nieważnym tokenie |
| G8 | [00-katalog-eventow.md](../00-core/00-katalog-eventow.md) | fraud detection pilnuje limitów prób per numer/IP/urządzenie |

## Słownik
| Pojęcie | Wyjaśnienie |
|---|---|
| Logowanie bez haseł | Pacjent nie ma hasła — tożsamość potwierdza jednorazowym kodem SMS lub linkiem z emaila. |
| OTP | Jednorazowy kod (np. z SMS-a), który działa tylko raz i przez krótki czas. |
| Magic link | Link logujący wysyłany na email — jedno kliknięcie zastępuje wpisywanie hasła. |
| Rate limiting | Ograniczenie liczby prób (wysyłek kodów, błędnych wpisań), chroniące przed nadużyciami. |
| TTL | Czas ważności — po jego upływie kod lub link przestaje działać. |
| Sesja | Zapamiętane przez system zalogowanie, dzięki któremu pacjent nie musi potwierdzać tożsamości przy każdym kroku. |
