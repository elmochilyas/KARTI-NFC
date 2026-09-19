import Link from "next/link";

/** Branded unavailable page for unknown/inactive profile slugs (and any unmatched route). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xl font-bold tracking-tight text-text">
        This Karti profile is unavailable
      </p>
      <p className="mt-2 text-sm text-muted">
        The link may be mistyped, or the profile may have been deactivated.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-surface-muted px-5 font-medium text-text hover:bg-border"
      >
        Back to Karti
      </Link>
    </main>
  );
}
