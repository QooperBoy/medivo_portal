import type { Metadata } from 'next';
import './globals.css';
import { MswProvider } from '@/mocks/MswProvider';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { BeInspector } from '@/components/be-inspector/BeInspector';

export const metadata: Metadata = {
  title: {
    default: 'ZnanyPsycholog — rezerwacja wizyt online (demo)',
    template: '%s · ZnanyPsycholog',
  },
  description:
    'Marketplace rezerwacji wizyt u psychologów i psychoterapeutów — demo front-endu na zamockowanym backendzie (MSW).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {/* MswProvider startuje worker MSW po stronie klienta i renderuje resztę */}
        <MswProvider>
          {/* AuthProvider trzyma sesję klienta (localStorage) dla całego drzewa */}
          <AuthProvider>
            <AppShell>{children}</AppShell>
            {/* Wysuwany panel logujący każde żądanie do zamockowanego backendu */}
            <BeInspector />
          </AuthProvider>
        </MswProvider>
      </body>
    </html>
  );
}
