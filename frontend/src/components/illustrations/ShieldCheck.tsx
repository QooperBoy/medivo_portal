/**
 * ShieldCheck — motyw zaufania i weryfikacji (np. PWZ / zweryfikowany profil):
 * tarcza z „ptaszkiem", delikatny połysk i iskry. Dekoracyjna.
 */
export function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="shieldCheck-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* miękkie tło */}
      <circle cx="120" cy="118" r="86" fill="#ecfdf5" />

      {/* tarcza */}
      <path
        d="M120 40l68 26v52c0 48-30 76-68 90-38-14-68-42-68-90V66Z"
        fill="url(#shieldCheck-body)"
        stroke="#047857"
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* połysk */}
      <path d="M120 52l-42 16v42c0 34 18 56 42 68Z" fill="#6ee7b7" opacity="0.45" />

      {/* ptaszek */}
      <path d="M92 120l20 22 40-48" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />

      {/* iskry */}
      <path d="M196 66l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5Z" fill="#f59e0b" />
      <path d="M44 78l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#34d399" />
      <circle cx="60" cy="150" r="4" fill="#6ee7b7" />
      <circle cx="182" cy="146" r="4" fill="#a7f3d0" />
    </svg>
  );
}
