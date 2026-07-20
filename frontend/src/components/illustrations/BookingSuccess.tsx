/**
 * BookingSuccess — sukces rezerwacji: okrągła odznaka z „ptaszkiem", wstążki
 * oraz konfetti i listki dookoła. Radosna, w palecie marki. Dekoracyjna.
 */
export function BookingSuccess({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="bookingSuccess-badge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>

      {/* wstążki odznaki */}
      <path d="M104 150l-18 46 22-12 12 20 16-44Z" fill="#059669" />
      <path d="M136 150l18 46-22-12-12 20-16-44Z" fill="#10b981" />

      {/* odznaka */}
      <circle cx="120" cy="112" r="60" fill="url(#bookingSuccess-badge)" />
      <circle cx="120" cy="112" r="48" fill="#ecfdf5" />
      <circle cx="120" cy="112" r="48" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeDasharray="4 8" strokeLinecap="round" />

      {/* ptaszek */}
      <path d="M96 114l16 18 34-40" fill="none" stroke="#047857" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />

      {/* konfetti i listki */}
      <path d="M46 60l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#f59e0b" />
      <path d="M196 66l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5Z" fill="#34d399" />
      <rect x="60" y="120" width="12" height="7" rx="3" transform="rotate(-24 66 123)" fill="#6ee7b7" />
      <rect x="176" y="140" width="12" height="7" rx="3" transform="rotate(30 182 143)" fill="#10b981" />
      <path d="M186 108c-9-3-11-13-9-19 9 2 13 10 9 19Z" fill="#6ee7b7" />
      <path d="M52 118c9-3 18 2 20 9-9 3-17 0-20-9Z" fill="#34d399" />
      <circle cx="72" cy="52" r="4" fill="#6ee7b7" />
      <circle cx="176" cy="44" r="5" fill="#a7f3d0" />
      <circle cx="120" cy="34" r="4" fill="#f59e0b" />
    </svg>
  );
}
