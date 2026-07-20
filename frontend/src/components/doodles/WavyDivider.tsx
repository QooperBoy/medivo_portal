/**
 * WavyDivider — falisty separator sekcji (szeroki). Dziedziczy kolor tekstu
 * (currentColor) — ustaw `text-*` w klasie wywołującego. `preserveAspectRatio`
 * = "none", więc rozciąga się na pełną szerokość. Dekoracyjny.
 */
export function WavyDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 40"
      role="img"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      className={className}
    >
      <path
        d="M0 22C150 42 300 6 450 20 600 34 750 8 900 22 1050 34 1150 14 1200 24V40H0Z"
        fill="currentColor"
      />
    </svg>
  );
}
