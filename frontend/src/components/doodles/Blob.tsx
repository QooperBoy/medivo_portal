/**
 * Blob — miękka plama tła (brand-100). Do podkładania pod ikony/liczby lub
 * jako akcent dekoracyjny. Dekoracyjny.
 */
export function Blob({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M100 18c42-4 78 22 84 62 6 40-18 80-60 88-42 8-84-16-92-56-8-40 26-90 68-94Z"
        fill="#d1fae5"
      />
    </svg>
  );
}
