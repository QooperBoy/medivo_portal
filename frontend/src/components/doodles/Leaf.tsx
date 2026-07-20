/**
 * Leaf — pojedynczy listek z żyłką, w zieleni marki. Dekoracyjny.
 */
export function Leaf({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M24 44C8 34 8 12 24 4 40 12 40 34 24 44Z"
        fill="#6ee7b7"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 8v34"
        fill="none"
        stroke="#059669"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 20l9-6M24 30l-9-6M24 38l9-6"
        fill="none"
        stroke="#059669"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
