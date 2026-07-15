# E15 — Placówka / zespół

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        KONTO["Konto placówki"]
        ZESPOL["Lista specjalistów zespołu"]
        DODAJ["Dodaj specjalistę do zespołu"]
        MULTI["Widok multi-kalendarz"]
        ZASTEP["Wyznacz specjalistę zastępczego"]
    end

    subgraph BE["BE — pod spodem"]
        RBAC["RBAC: role placówka / specjalista"]
        WERYF["Weryfikacja PWZ nowego (D1)"]
        MKAL["Multi-kalendarz: grafiki E2 zespołu"]
        PRZEN["Przepisanie wizyt na zastępcę"]
        POW["Powiadomienie pacjentów (G1)"]
    end

    KONTO --> ZESPOL
    ZESPOL --> DODAJ
    DODAJ --> RBAC
    DODAJ --> WERYF
    KONTO --> MULTI
    MKAL --> MULTI
    ZESPOL --> ZASTEP
    ZASTEP --> PRZEN --> POW

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class KONTO,ZESPOL,DODAJ,MULTI,ZASTEP fe
    class RBAC,WERYF,MKAL,PRZEN,POW be
```

## Notatki
- Priorytet: P2.
- Konto placówki zarządza wieloma specjalistami: RBAC (rola placówki vs rola specjalisty — zakres uprawnień nierozstrzygnięty w mapie), multi-kalendarz = widok grafików E2 całego zespołu.
- Każdy dodany specjalista przechodzi własną weryfikację PWZ (D1/F1) — założenie minimalne, mapa nie rozstrzyga.
- "Specjalista zastępczy": założenie minimalne — wizyty nieobecnego przejmuje wskazany członek zespołu, pacjenci powiadamiani (G1) z możliwością odwołania tokenem (B3); pełna mechanika (zgoda pacjenta? różnica cen?) NIEROZSTRZYGNIĘTA, zgłoszone w rozbieżnościach. Alternatywa dla trybu urlop (E6) w placówkach.
- Powiązania: C3, D1, E2, E6, B3, G1, F9 (RBAC adminów — inny byt).
