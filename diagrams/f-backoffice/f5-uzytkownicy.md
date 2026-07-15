# F5 — Użytkownicy

```mermaid
flowchart TD
    subgraph FE["FE — widzi admin"]
        SZUKAJ["Wyszukiwarka użytkowników"]
        WYNIKI["Wyniki: pacjenci / specjaliści"]
        PODGLAD["Podgląd konta (minimalizacja danych)"]
        AKCJA{"Akcja"}
        BLOKADA["Blokada konta"]
        WNIOSEK{"Wniosek RODO (B9)"}
        EKSPORT["Eksport danych"]
        USUN["Usunięcie konta"]
    end

    subgraph BE["BE — pod spodem"]
        USERSAPI["Users API"]
        AUDYTP["KAŻDY podgląd → audit (F10)"]
        AUDYTZ["Każda zmiana → audit (F10)"]
        BLOKENC["Flaga blokady + wygaszenie sesji"]
        EXPORTJOB["Job eksportu danych"]
        ERASURE["Erasure job (G11)"]
        MSGS["Powiadomienie użytkownika (G1)"]
    end

    SZUKAJ --> USERSAPI
    USERSAPI --> WYNIKI
    WYNIKI --> PODGLAD
    PODGLAD --> AUDYTP
    PODGLAD --> AKCJA
    AKCJA -->|"blokada"| BLOKADA
    AKCJA -->|"RODO"| WNIOSEK
    BLOKADA --> BLOKENC
    WNIOSEK -->|"eksport"| EKSPORT
    WNIOSEK -->|"usunięcie"| USUN
    EKSPORT --> EXPORTJOB
    USUN --> ERASURE
    BLOKENC --> AUDYTZ
    EXPORTJOB --> AUDYTZ
    ERASURE --> AUDYTZ
    BLOKENC --> MSGS
    EXPORTJOB --> MSGS
    ERASURE --> MSGS

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class SZUKAJ,WYNIKI,PODGLAD,AKCJA,BLOKADA,WNIOSEK,EKSPORT,USUN fe
    class USERSAPI,AUDYTP,AUDYTZ,BLOKENC,EXPORTJOB,ERASURE,MSGS be
```

## Notatki
- Priorytet: P0.
- Kluczowy wymóg mapy: podgląd konta ZAWSZE z audytem dostępu — każdy odczyt danych pacjenta (dane zdrowotne!) trafia do [[f10-audit-log]] (F10), niezależnie od tego, czy admin coś zmienił. Prezentacja danych adminowi z minimalizacją (S3 pkt 3).
- Obsługa wniosków RODO z [[b9-rodo-self-service]] (B9): eksport danych (job) i usunięcie konta (erasure job G11); powiadomienie użytkownika o realizacji przez G1.
- Blokada konta: flaga + wygaszenie aktywnych sesji; odwołanie od blokady → [[f3-spory]] (F3).
- Założenie minimalne: mapa nie rozstrzyga, czy wniosek RODO złożony w B9 wymaga zawsze ręcznej obsługi w F5, czy bywa w pełni automatyczny — przyjęto: admin obsługuje/nadzoruje wniosek w F5.
- Powiązania: B9, G11, F3, F10, G1.
