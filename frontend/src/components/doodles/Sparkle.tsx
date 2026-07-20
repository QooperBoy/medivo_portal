/**
 * Sparkle — 4-ramienna iskra/gwiazdka (akcent). Dziedziczy kolor tekstu
 * (currentColor). Dekoracyjny.
 */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M24 3C26 18 30 22 45 24 30 26 26 30 24 45 22 30 18 26 3 24 18 22 22 18 24 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
