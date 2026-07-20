/**
 * Globalny stan ładowania (App Router) — pokazywany przy nawigacji między
 * trasami zanim wyrenderuje się treść. Neutralny, brandowy szkielet.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="h-8 w-64 max-w-full animate-pulse rounded-lg bg-surface-subtle" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-40 animate-pulse rounded-xl2 bg-surface-subtle" />
        <div className="h-40 animate-pulse rounded-xl2 bg-surface-subtle" />
        <div className="h-40 animate-pulse rounded-xl2 bg-surface-subtle" />
      </div>
      <div className="h-64 w-full animate-pulse rounded-xl2 bg-surface-subtle" />
    </div>
  );
}
