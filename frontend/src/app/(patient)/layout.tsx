import type { ReactNode } from 'react';
import { PatientAccountShell } from '@/components/account/PatientAccountShell';

/**
 * Layout konta pacjenta (grupa B) — wspólny guard + nawigacja dla /moje-wizyty
 * oraz /konto/*.
 */
export default function PatientLayout({ children }: { children: ReactNode }) {
  return <PatientAccountShell>{children}</PatientAccountShell>;
}
