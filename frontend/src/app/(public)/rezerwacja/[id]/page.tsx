/**
 * (public) /rezerwacja/[id] — potwierdzenie rezerwacji (A7).
 *
 * Cienki server component: wyłuskuje `params.id` i deleguje fetch po stronie
 * klienta (przez MSW) do komponentu `ConfirmationClient`.
 */
import { ConfirmationClient } from '@/components/patient/ConfirmationClient';

export default function Page({ params }: { params: { id: string } }) {
  return <ConfirmationClient id={params.id} />;
}
