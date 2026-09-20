/**
 * Public Karti brand landing page.
 *
 * Intentionally minimal: brand + consumer-facing message only. No sign-in,
 * admin, dashboard, or implementation wording lives here — operator access
 * stays available at its direct URL and is deliberately not linked.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
      <p
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-text text-xl font-bold text-background"
      >
        K
      </p>
      <h1 className="mt-8 text-4xl font-bold tracking-tight text-text">Karti</h1>
      <p className="mt-2 text-lg font-medium text-text">Your smart contact card.</p>
      <p className="mt-4 max-w-xs text-base leading-relaxed text-muted">
        Share your contact details, social links and business information with one simple tap.
      </p>
      <p className="mt-10 text-xs font-medium tracking-[0.18em] text-muted uppercase">
        NFC&ensp;•&ensp;QR&ensp;•&ensp;Always up to date
      </p>
    </main>
  );
}
