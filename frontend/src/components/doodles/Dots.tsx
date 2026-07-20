/**
 * Dots — grono kropek (delikatna tekstura). Dziedziczy kolor tekstu
 * (currentColor). Dekoracyjny.
 */
export function Dots({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g fill="currentColor">
        <circle cx="10" cy="12" r="4" />
        <circle cx="30" cy="9" r="3" />
        <circle cx="50" cy="13" r="4" />
        <circle cx="17" cy="30" r="3" />
        <circle cx="39" cy="28" r="4" />
        <circle cx="57" cy="31" r="3" />
      </g>
    </svg>
  );
}
