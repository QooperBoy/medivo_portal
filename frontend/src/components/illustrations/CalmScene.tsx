/**
 * CalmScene — dekoracyjny, spokojny pejzaż: miękkie wzgórza, łodygi roślin,
 * słońce i fale oddechu. Do tła sekcji. Dekoracyjna.
 */
export function CalmScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="calmScene-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecfdf5" />
          <stop offset="1" stopColor="#d1fae5" />
        </linearGradient>
      </defs>

      {/* niebo */}
      <rect x="0" y="0" width="320" height="240" rx="16" fill="url(#calmScene-sky)" />

      {/* słońce */}
      <circle cx="240" cy="72" r="26" fill="#f59e0b" opacity="0.85" />

      {/* fale oddechu */}
      <path d="M40 60c16-12 32-12 48 0s32 12 48 0" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 84c14-10 28-10 42 0" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeLinecap="round" />

      {/* chmurka */}
      <path d="M92 116c-12 0-16-14-4-18 2-12 22-12 26 0 12-2 16 12 4 18Z" fill="#ffffff" opacity="0.8" />

      {/* wzgórza */}
      <path d="M0 190c48-34 96-34 150 0s122 30 170 0v50H0Z" fill="#a7f3d0" />
      <path d="M0 210c56-30 104-24 158 2s118 18 162-8v36H0Z" fill="#34d399" />
      <path d="M0 224c60-18 120-18 180-4s96 8 140-6v26H0Z" fill="#059669" />

      {/* łodygi na pierwszym planie */}
      <path d="M70 240c-4-40-6-64 2-88" fill="none" stroke="#065f46" strokeWidth="4" strokeLinecap="round" />
      <path d="M72 176c-12-4-14-16-11-24 11 2 16 12 11 24Z" fill="#10b981" />
      <path d="M74 190c11-5 22 1 24 9-11 5-21 1-24-9Z" fill="#047857" />
      <path d="M72 158c-3-13 3-22 10-25 3 12-2 21-10 25Z" fill="#34d399" />

      <path d="M250 240c3-30 5-48 0-70" fill="none" stroke="#065f46" strokeWidth="4" strokeLinecap="round" />
      <path d="M249 186c10-4 20 1 22 8-10 4-19 1-22-8Z" fill="#10b981" />
      <path d="M251 172c-10-3-13-13-11-20 10 2 14 11 11 20Z" fill="#047857" />
    </svg>
  );
}
