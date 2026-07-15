# A1 — Wejście SEO/direct

```mermaid
flowchart TD
    subgraph FE["FE — widzi user"]
        WEJSCIE["Wejście: Google / direct"]
        LANDING["Landing wertykalu"]
        MIASTO["Strona /{miasto}"]
        USLUGA["Strona /uslugi/{usluga}/{miasto}"]
        CTA["CTA: szukaj specjalisty"]
        A2LINK["Wyszukiwanie (A2)"]
        A3LINK["Lista wyników (A3)"]
    end

    subgraph BE["BE — pod spodem"]
        SSR["SSR/SSG render stron"]
        SCHEMA["Schema.org w HTML"]
        SITEMAP["Sitemap (G12)"]
        ANALYTICS["Analytics: pageview"]
    end

    SITEMAP -.->|"indeksacja Google"| WEJSCIE
    WEJSCIE --> LANDING
    WEJSCIE --> MIASTO
    WEJSCIE --> USLUGA
    SCHEMA --> SSR
    SSR --> LANDING
    SSR --> MIASTO
    SSR --> USLUGA
    LANDING --> ANALYTICS
    MIASTO --> ANALYTICS
    USLUGA --> ANALYTICS
    LANDING --> CTA
    CTA --> A2LINK
    MIASTO -->|"lista SEO"| A3LINK
    USLUGA -->|"lista SEO"| A3LINK

    classDef fe fill:#e8f4fd
    classDef be fill:#fdf2e8
    class WEJSCIE,LANDING,MIASTO,USLUGA,CTA,A2LINK,A3LINK fe
    class SSR,SCHEMA,SITEMAP,ANALYTICS be
```

## Notatki
- Priorytet: P0.
- Trzy typy landingów z mapy: landing wertykalu, `/{miasto}`, `/uslugi/{usluga}/{miasto}`; wszystkie SSR/SSG (SEO long-tail = główny kanał, spec S5).
- Założenie (minimalne): strony `/{miasto}` i `/uslugi/{usluga}/{miasto}` renderują od razu listę wyników → przejście do [[a3-lista-wynikow]] (A3); landing wertykalu prowadzi do wyszukiwania [[a2-wyszukiwanie]] (A2).
- Sitemap i refresh schema.org generuje G12 (SEO joby).
- Analytics: pageview od dnia 1 (metryki lejka, S5).
