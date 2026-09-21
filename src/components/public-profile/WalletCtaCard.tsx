import { AddToWalletButton } from "./AddToWalletButton";

/**
 * Keep-this-card wallet CTA (server shell, ADR-046).
 *
 * Renders above Share Profile: eyebrow + live island. The island decides
 * anchor-vs-modal client-side from the readiness booleans computed
 * server-side (credential-gated — no fake button when backends are
 * unconfigured). Rendered only when `wallet` is provided; pages omit it
 * when the identity code is unavailable.
 */

export type WalletCtaProps = {
  publicCode: string;
  displayName: string;
  appleReady: boolean;
  googleReady: boolean;
  dark: boolean;
  accent?: string | null;
};

export function WalletCtaCard({
  publicCode,
  displayName,
  appleReady,
  googleReady,
  dark,
  accent = null,
}: WalletCtaProps) {
  return (
    <section aria-label="Keep this card" className="karti-rise" style={{ animationDelay: "240ms" }}>
      <p
        className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${
          dark ? "text-neutral-400" : "text-muted"
        }`}
      >
        Keep this card
      </p>
      <div className="mt-2.5">
        <AddToWalletButton
          publicCode={publicCode}
          displayName={displayName}
          appleReady={appleReady}
          googleReady={googleReady}
          dark={dark}
          accent={accent}
        />
      </div>
      <p
        className={`mt-2 px-1 text-center text-[13px] ${dark ? "text-neutral-400" : "text-muted"}`}
      >
        Keep this digital card on your phone.
      </p>
    </section>
  );
}
