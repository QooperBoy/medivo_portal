/**
 * Arrow — ręcznie rysowana, zakrzywiona strzałka (np. „zobacz tutaj").
 * Dziedziczy kolor tekstu (currentColor). Dekoracyjny.
 */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 48"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M6 30C22 12 42 12 56 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M56 22l-14-4M56 22l-6 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
