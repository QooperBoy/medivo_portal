/**
 * HeroCalm — główna ilustracja hero: spokojna postać w medytacji, roślina,
 * dymek rozmowy z sercem i ciepłe słońce. Utrzymana w zielonej palecie marki,
 * przyjazny styl „ręcznie rysowany". Dekoracyjna (opis dokłada wywołujący).
 */
export function HeroCalm({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="heroCalm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecfdf5" />
          <stop offset="1" stopColor="#d1fae5" />
        </linearGradient>
        <linearGradient id="heroCalm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* miękkie tło-blob */}
      <path
        d="M52 128C40 78 96 40 158 44c74 5 130 30 122 92-7 54-66 74-128 68-60-6-88-22-100-76Z"
        fill="url(#heroCalm-sky)"
      />

      {/* ciepłe słońce (akcent) */}
      <circle cx="62" cy="60" r="15" fill="#f59e0b" />
      <g stroke="#f59e0b" strokeWidth="3" strokeLinecap="round">
        <path d="M62 35v-8" />
        <path d="M84 60h8" />
        <path d="M40 60h-8" />
        <path d="M78 44l6-6" />
        <path d="M46 44l-6-6" />
        <path d="M46 76l-6 6" />
      </g>

      {/* dymek rozmowy z sercem */}
      <path
        d="M234 82l-6 14 16-8Z"
        fill="#ffffff"
        stroke="#10b981"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="252" cy="64" rx="32" ry="23" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
      <path
        d="M252 74c-9-8-10-16-4-18 3-1 4 1 4 3 0-2 1-4 4-3 6 2 5 10-4 18Z"
        fill="#f59e0b"
      />

      {/* roślina w doniczce */}
      <rect x="256" y="180" width="40" height="8" rx="3" fill="#065f46" />
      <path d="M260 188h32l-5 22h-22Z" fill="#059669" />
      <path d="M276 188c-3-18-6-30-10-40" fill="none" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
      <path d="M266 168c-11-3-13-14-11-21 10 1 15 9 11 21Z" fill="#34d399" />
      <path d="M270 156c9-4 18 1 20 8-9 4-17 1-20-8Z" fill="#6ee7b7" />
      <path d="M266 150c-2-11 3-19 9-22 3 10-1 18-9 22Z" fill="#10b981" />

      {/* postać w medytacji */}
      <ellipse cx="160" cy="184" rx="55" ry="13" fill="#a7f3d0" />
      <path d="M116 180c14-24 74-24 88 0-16 14-44 14-44 14s-28 0-44-14Z" fill="#34d399" />
      <path d="M134 178c-4-48 26-52 26-52s30 4 26 52Z" fill="url(#heroCalm-body)" />
      <path d="M138 150c-12 18 14 24 14 24" fill="none" stroke="#10b981" strokeWidth="9" strokeLinecap="round" />
      <path d="M182 150c12 18-14 24-14 24" fill="none" stroke="#10b981" strokeWidth="9" strokeLinecap="round" />
      <circle cx="160" cy="110" r="16" fill="#6ee7b7" stroke="#065f46" strokeWidth="2.5" />
      <circle cx="160" cy="92" r="6" fill="#047857" />
      <path d="M152 110c1.5 2.5 4.5 2.5 6 0" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <path d="M162 110c1.5 2.5 4.5 2.5 6 0" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <path d="M154 118c3 4 9 4 12 0" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />

      {/* drobne akcenty */}
      <path d="M96 70c-8-3-10-11-8-16 8 1 12 8 8 16Z" fill="#6ee7b7" />
      <path d="M210 40l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#34d399" />
      <path d="M104 148l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" fill="#f59e0b" />
      <circle cx="120" cy="60" r="3" fill="#a7f3d0" />
      <circle cx="196" cy="112" r="3" fill="#6ee7b7" />
      <circle cx="88" cy="120" r="2.5" fill="#34d399" />
    </svg>
  );
}
