import type { Config } from 'tailwindcss';

/**
 * Design tokens dla ZnanyPsycholog — marka ZIELONA (duch ZnanyLekarz).
 * Paleta `brand` + tokeny semantyczne (success/warning/danger), powierzchnie,
 * atrament (tekst), promienie, miękkie cienie kart i systemowy stack fontów.
 * Kontrast dobrany pod AA. content globs pokrywają cały src/.
 */
const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Zielony primary (marka)
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857', // primary
          800: '#065f46', // hover / mocny
          900: '#064e3b',
        },
        // Powierzchnie (tło aplikacji jasne)
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f7faf9',
          subtle: '#eef4f2',
        },
        // Atrament (tekst)
        ink: {
          DEFAULT: '#0f172a',
          muted: '#475569',
          subtle: '#64748b',
        },
        // Semantyczne — statusy BE Inspectora i komunikaty
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      borderRadius: {
        xl2: '1rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 6px 20px -6px rgba(6, 78, 59, 0.12)',
        'card-hover':
          '0 2px 4px 0 rgba(15, 23, 42, 0.06), 0 14px 32px -10px rgba(6, 78, 59, 0.20)',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Inter',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
