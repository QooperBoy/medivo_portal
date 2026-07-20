/**
 * Squiggle — falowane podkreślenie „od flamastra" (np. pod słowem w H1).
 * Dziedziczy kolor tekstu (currentColor). Dekoracyjny.
 */
export function Squiggle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 24"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M5 14C20 4 28 24 44 14 60 4 68 24 84 14 100 4 108 20 116 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
