/**
 * ResultsSkeleton — szkielet ładowania listy wyników (A3). Sześć „kart-widm"
 * w tej samej siatce co realne wyniki (1 kol. mobile / 2 kol. desktop).
 * Używany jako fallback Suspense w `szukaj/page.tsx` oraz w stanie `loading`
 * `SearchClient`. Dekoracyjny — komunikat dla czytników ekranu w `sr-only`.
 */
import { Card, CardContent } from '@/components/ui';

/** Stabilne klucze kart-widm (unikamy indeksu tablicy jako klucza). */
const GHOST_KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const;

export function ResultsSkeleton() {
  return (
    <div role="status" aria-label="Ładowanie wyników" className="flex flex-col gap-4">
      <span className="sr-only">Ładowanie wyników…</span>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GHOST_KEYS.map((key) => (
          <Card key={key} aria-hidden="true" className="animate-pulse">
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 rounded-full bg-slate-200" />
                <div className="flex flex-1 flex-col gap-2 py-1">
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="h-6 w-28 rounded-full bg-slate-200" />
                <div className="h-6 w-20 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-6 w-16 rounded bg-slate-200" />
              </div>
              <div className="h-11 w-full rounded-xl2 bg-slate-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
