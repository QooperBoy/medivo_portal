# E2E-3 — Specjalista: od landingu do 1. rezerwacji

```mermaid
flowchart LR
    C1["C1 landing dla specjalistów"] --> C3["C3 rejestracja + nr PWZ"]
    C3 --> D1["D1 weryfikacja PWZ"]
    F1["F1 ręczna kolejka admina"] -. "fallback automatu" .-> D1
    D1 --> D2["D2 edycja profilu (draft)"]
    D2 --> D3["D3 go-live (1 klik)"]
    D3 --> E2["E2 grafik i dostępność"]
    E2 --> E3["E3 usługi i ceny"]
    E3 --> VIS["widoczny w A3/A4"]
    VIS --> E4["E4 pierwsza rezerwacja"]
    style F1 stroke-dasharray: 5 5
```

## Notatki
- Wyjątek od konwencji: bez subgraph FE/BE — węzły to całe flowy (kompozycja ścieżki), nie kroki FE/BE.
- "D1 (F1)" z mapy: weryfikacja PWZ to automat (rejestr KRL/KIF); F1 = fallback do ręcznej kolejki admina (SLA 24 h robocze) — stąd przerywana krawędź i obrys.
- D2 ("stan w trakcie") biegnie równolegle do weryfikacji — pełna edycja draftu profilu jeszcze przed decyzją; kolejność na diagramie wg sekwencji z mapy.
- VIS = "widoczny w A3/A4" to efekt publikacji (sloty z E2 zasilają availability API listy wyników i profilu), nie osobny flow.
- E4 = pierwsza rezerwacja pojawia się w panelu specjalisty (lista/kalendarz).
- Diagramy składowe: [[c1-landing-dla-specjalistow]], [[c3-rejestracja]], [[d1-weryfikacja-pwz]], [[f1-kolejka-weryfikacji-pwz]], [[d2-stan-w-trakcie]], [[d3-go-live]], [[e2-grafik-dostepnosc]], [[e3-uslugi-ceny]], [[a3-lista-wynikow]], [[a4-profil-specjalisty]], [[e4-rezerwacje]]
