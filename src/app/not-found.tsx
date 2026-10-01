import Link from "next/link";

/** Branded unavailable page for unknown/inactive profile slugs (and any unmatched route). */
export default function NotFound() {
  return (
    <main className="karti-hero-grid mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-3xl bg-ink text-2xl font-bold text-white shadow-[var(--shadow-lift)]"
      >
        K
      </p>
      <p className="mt-6 text-2xl font-bold tracking-tight text-balance text-text">
        This Karti profile is unavailable
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        The link may be mistyped, or the profile may have been deactivated.
      </p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Link
          href="/fr"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 font-semibold text-accent-contrast hover:bg-accent-strong"
        >
          Back to Karti
        </Link>
        <Link
          href="/fr/contact"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface px-6 font-semibold hover:border-muted"
        >
          Contact us
        </Link>
      </div>
    </main>
  );
}
