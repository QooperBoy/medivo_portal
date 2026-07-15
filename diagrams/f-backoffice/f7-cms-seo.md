# F7 — CMS/SEO

```mermaid
flowchart TD
    subgraph FE["FE — widzi admin"]
        ETAP{"Etap wdrożenia"}
        P0["P0: treści hardcode w repo"]
        P1["P1: UI edycji CMS"]
        FORK["Wybór forka (wertykal)"]
        TYP["Treść: landing / miasto / usługa"]
        EDYCJA["Edycja treści"]
        PUBLIKUJ["Publikacja"]
    end

    subgraph BE["BE — pod spodem"]
        DEPLOY["P0: commit + deploy"]
        CMSSTORE["P1: CMS storage per fork"]
        SSR["SSR/SSG stron (A1)"]
        SITEMAP["Sitemap update (G12)"]
        SCHEMA["Schema.org refresh (G12)"]
        AUDYT["Zapis zmian + audyt (F10)"]
    end

    ETAP -->|"P0"| P0
    ETAP -->|"P1"| P1
    P1 --> FORK
    FORK --> TYP
    TYP --> EDYCJA
    EDYCJA --> PUBLIKUJ
    P0 --> DEPLOY
    PUBLIKUJ --> CMSSTORE
    DEPLOY --> SSR
    CMSSTORE --> SSR
    SSR --> SITEMAP
    SSR --> SCHEMA
    PUBLIKUJ --> AUDYT

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class ETAP,P0,P1,FORK,TYP,EDYCJA,PUBLIKUJ fe
    class DEPLOY,CMSSTORE,SSR,SITEMAP,SCHEMA,AUDYT be
```

## Notatki
- Priorytet: P0 hardcode → P1 UI (wprost z mapy). W P0 „edycja" = zmiana w repo + deploy, bez UI admina; węzeł decyzyjny „etap wdrożenia" pokazuje oba warianty.
- Typy treści z mapy: landing wertykalu, strony `/{miasto}`, `/uslugi/{usluga}/{miasto}` — per fork (multi-wertykal, jeden Back Office).
- Publikacja zasila SSR/SSG (A1) i uruchamia SEO joby G12 (sitemap, schema.org refresh) — spójne z [[a1-wejscie-seo]] i A9 (strony statyczne: „CMS lub hardcode na start").
- Szablony treści, unikalność, internal linking — poza zakresem F7, temat S5 (programmatic SEO).
- Zmiany treści w audycie F10 (P1).
- Powiązania: A1, A9, G12, F8 (konfiguracja forka), F10, S5.
