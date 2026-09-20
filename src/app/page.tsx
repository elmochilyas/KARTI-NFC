import Link from "next/link";

/** Minimal MVP landing page — public profiles arrive in a later phase. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-4xl font-bold tracking-tight text-text">Karti</p>
      <p className="mt-3 max-w-md text-base text-muted">
        Premium NFC digital contact cards. Tap a card, meet the person, take action.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 font-medium text-accent-contrast hover:bg-accent-strong"
        >
          Admin sign in
        </Link>
      </div>
      <p className="mt-6 text-xs text-muted">
        One permanent URL per card — the destination can change without rewriting the tag.
      </p>
    </main>
  );
}
