import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';

/**
 * Layout back office (grupa F) — wspólny guard (rola admin) + nawigacja dla /admin/*.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
