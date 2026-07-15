# B7 — Pacjent ≠ rezerwujący (podopieczny)

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        KROK["Krok checkoutu A5: dla kogo?"]
        WYBOR{"Ja / dziecko / inna osoba"}
        JA["Dane rezerwującego = pacjent"]
        ZAPISANI{"Zapisany podopieczny istnieje?"}
        WYBORZAP["Wybór z listy podopiecznych"]
        MINIPROFIL["Mini-profil dziecka: imię, wiek"]
        ZGODA["Checkbox: zgoda opiekuna"]
        INNA["Mini-profil innej osoby"]
        DALEJ["Dalej: dane i zgody A5"]
    end
    subgraph BE["BE — pod spodem"]
        ENCJAJA["Encja pacjenta = rezerwujący"]
        ZGODAZAPIS["Zapis zgody opiekuna"]
        RODO["RODO: minimalizacja danych dziecka"]
        ENCJAP["Osobna encja podopiecznego"]
        LINKKONTO["Powiązanie z kontem rezerwującego"]
    end
    KROK --> WYBOR
    WYBOR -->|ja| JA --> ENCJAJA --> DALEJ
    WYBOR -->|dziecko| ZAPISANI
    ZAPISANI -->|tak| WYBORZAP --> DALEJ
    ZAPISANI -->|nie| MINIPROFIL --> ZGODA --> ZGODAZAPIS
    ZGODAZAPIS --> RODO --> ENCJAP
    WYBOR -->|inna osoba| INNA --> ENCJAP
    ENCJAP --> LINKKONTO --> DALEJ
    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class KROK,WYBOR,JA,ZAPISANI,WYBORZAP,MINIPROFIL,ZGODA,INNA,DALEJ fe
    class ENCJAJA,ZGODAZAPIS,RODO,ENCJAP,LINKKONTO be
```

## Notatki
- ⚠️ Flaga 1: abstrakcja "podopieczny" (booker ≠ patient) od razu w core — fork weterynaryjny dostaje encję zwierzęcia tym samym mechanizmem, zero forka logiki.
- U logopedów przypadek domyślny: rezerwuje rodzic, pacjentem jest dziecko.
- Zakres pól mini-profilu — mapa nie definiuje; założenie minimalne: imię + wiek/rok urodzenia (minimalizacja danych, RODO dane dziecka).
- Zapisany podopieczny wielokrotnego użytku przy kolejnych rezerwacjach (S1: "zapis do przyszłych rezerwacji").
- "Inna osoba" (dorosła): podstawa przetwarzania danych osoby trzeciej / forma zgody — mapa nie rozstrzyga (zgoda opiekuna dotyczy dziecka), otwarta kwestia.
- Osobna encja pacjenta powiązana z kontem rezerwującego; tworzona w checkoucie razem z lekkim kontem (A5).
- Powiązania: A5 ([[a5-checkout]]), B8 (ankieta o dziecku), B9 (RODO self-service), CORE-STANY.
