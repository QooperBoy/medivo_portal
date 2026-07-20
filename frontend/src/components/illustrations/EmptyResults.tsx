/**
 * EmptyResults — pusty stan wyników wyszukiwania: lupa z pustą kartą
 * (przerywany obrys) i rozsypane kropki. Łagodny, bez negatywnego wydźwięku.
 */
export function EmptyResults({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* miękkie tło */}
      <ellipse cx="160" cy="130" rx="120" ry="90" fill="#ecfdf5" />

      {/* rączka lupy */}
      <path d="M196 150l42 44" stroke="#065f46" strokeWidth="15" strokeLinecap="round" />
      <path d="M196 150l42 44" stroke="#059669" strokeWidth="8" strokeLinecap="round" />

      {/* obręcz lupy */}
      <circle cx="150" cy="110" r="60" fill="#ffffff" stroke="#047857" strokeWidth="9" />

      {/* pusta karta w środku (przerywany obrys) */}
      <rect
        x="120"
        y="86"
        width="60"
        height="48"
        rx="8"
        fill="#f7faf9"
        stroke="#6ee7b7"
        strokeWidth="3"
        strokeDasharray="7 7"
        strokeLinecap="round"
      />
      <path d="M132 104h20" stroke="#a7f3d0" strokeWidth="4" strokeLinecap="round" />
      <path d="M132 116h36" stroke="#d1fae5" strokeWidth="4" strokeLinecap="round" />

      {/* rozsypane kropki i listek */}
      <circle cx="66" cy="70" r="5" fill="#6ee7b7" />
      <circle cx="250" cy="66" r="6" fill="#34d399" />
      <circle cx="270" cy="120" r="4" fill="#a7f3d0" />
      <circle cx="80" cy="170" r="4" fill="#34d399" />
      <circle cx="60" cy="122" r="3" fill="#6ee7b7" />
      <path d="M256 150c-9-4-11-14-9-20 9 2 13 11 9 20Z" fill="#6ee7b7" />
      <path d="M242 108l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#f59e0b" />
    </svg>
  );
}
