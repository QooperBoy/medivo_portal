/**
 * SearchSpot — mały motyw wyszukiwania: lupa z listkiem w środku i drobne
 * iskry. Do sekcji „znajdź specjalistę". Dekoracyjna.
 */
export function SearchSpot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="searchSpot-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecfdf5" />
          <stop offset="1" stopColor="#a7f3d0" />
        </linearGradient>
      </defs>

      {/* miękkie tło */}
      <circle cx="120" cy="120" r="82" fill="url(#searchSpot-bg)" />

      {/* rączka lupy */}
      <path d="M146 148l40 40" stroke="#065f46" strokeWidth="14" strokeLinecap="round" />
      <path d="M146 148l40 40" stroke="#047857" strokeWidth="8" strokeLinecap="round" />

      {/* obręcz lupy */}
      <circle cx="108" cy="106" r="50" fill="#ffffff" stroke="#047857" strokeWidth="9" />

      {/* listek w środku lupy */}
      <path d="M108 132c-20-12-20-40 0-52 20 12 20 40 0 52Z" fill="#6ee7b7" />
      <path d="M108 82v46" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M108 98l10-8" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M108 110l-10-8" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M108 122l10-8" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />

      {/* iskry */}
      <path d="M186 70l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5Z" fill="#f59e0b" />
      <path d="M56 66l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#34d399" />
      <circle cx="176" cy="150" r="4" fill="#6ee7b7" />
      <circle cx="60" cy="160" r="3" fill="#34d399" />
    </svg>
  );
}
