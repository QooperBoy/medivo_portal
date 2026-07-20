import type { ReactNode } from 'react';
import { PanelProvider } from '@/components/specialist/PanelProvider';
import { PanelHeader } from '@/components/specialist/PanelHeader';
import { PanelNav } from '@/components/specialist/PanelNav';

/**
 * Layout panelu specjalisty (grupa E). Owija wszystkie trasy `/panel/*`
 * providerem „obecnego specjalisty" oraz wspólnym nagłówkiem i nawigacją.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <PanelProvider>
      <div className="flex flex-col gap-6">
        <PanelHeader />
        <PanelNav />
        <div>{children}</div>
      </div>
    </PanelProvider>
  );
}
