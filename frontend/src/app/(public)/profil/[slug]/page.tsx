/**
 * (public) /profil/[slug] — publiczny profil specjalisty (A4).
 *
 * Cienki server component: wyłuskuje `params.slug` i deleguje całą logikę
 * (fetch po stronie klienta przez MSW) do komponentu `ProfileClient`.
 */
import { ProfileClient } from '@/components/patient/ProfileClient';

export default function Page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { slot?: string };
}) {
  const slot = typeof searchParams.slot === 'string' ? searchParams.slot : undefined;
  return <ProfileClient slug={params.slug} initialSlotId={slot} />;
}
