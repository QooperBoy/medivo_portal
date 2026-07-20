/**
 * EmptySlots — pusty grafik terminów: kalendarz z pustymi „oczkami", mały
 * zegar i delikatne „zzz" (rysowane ścieżkami, nie tekstem). Dekoracyjna.
 */
export function EmptySlots({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* miękkie tło */}
      <ellipse cx="160" cy="130" rx="120" ry="92" fill="#ecfdf5" />

      {/* korpus kalendarza */}
      <rect x="86" y="70" width="132" height="112" rx="14" fill="#ffffff" stroke="#047857" strokeWidth="5" />
      <path d="M86 96c0-14 6-26 20-26h92c14 0 20 12 20 26v4H86Z" fill="#10b981" />

      {/* kółka spinające */}
      <rect x="112" y="56" width="8" height="24" rx="4" fill="#065f46" />
      <rect x="184" y="56" width="8" height="24" rx="4" fill="#065f46" />

      {/* puste „oczka" grafiku */}
      <circle cx="116" cy="126" r="7" fill="#d1fae5" />
      <circle cx="146" cy="126" r="7" fill="#d1fae5" />
      <circle cx="176" cy="126" r="7" fill="#a7f3d0" />
      <circle cx="116" cy="154" r="7" fill="#d1fae5" />
      <circle cx="146" cy="154" r="7" fill="#d1fae5" />
      <circle cx="176" cy="154" r="7" fill="#d1fae5" />

      {/* zegarek w rogu */}
      <circle cx="220" cy="172" r="30" fill="#ffffff" stroke="#065f46" strokeWidth="5" />
      <path d="M220 172v-14" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
      <path d="M220 172l11 7" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
      <circle cx="220" cy="172" r="3" fill="#065f46" />

      {/* „zzz" — senny grafik */}
      <path d="M232 62h12l-12 14h12" fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M252 44h9l-9 10h9" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M268 32h6l-6 7h6" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
