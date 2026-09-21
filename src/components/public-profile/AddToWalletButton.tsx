"use client";

import { useEffect, useRef, useState } from "react";
import { LuCopy, LuWallet, LuX } from "react-icons/lu";
import { detectPlatform } from "@/features/wallet/detectPlatform";
import type { WalletPlatform } from "@/features/wallet/types";

/**
 * Add to Wallet tap target — the only client JS of the wallet card.
 *
 * One CTA, platform auto-detected; the visitor never chooses a wallet:
 * - iOS (Apple configured) → plain anchor to /api/wallet/{code}, which
 *   answers the signed .pkpass (direct navigation keeps the native
 *   Add-to-Wallet sheet; no fetch/blob tricks).
 * - Android (Google configured) → same anchor; the route 302s to the
 *   signed Google Wallet save link.
 * - Desktop or unconfigured backend → modal: "Open this page on your
 *   phone…", QR of the current page, Copy Profile Link. Never a fake
 *   button, never a dead anchor.
 */

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: { platform?: string; mobile?: boolean };
};

function clientPlatform(): WalletPlatform {
  const nav = navigator as NavigatorWithUserAgentData;
  return detectPlatform(navigator.userAgent, {
    platform: nav.userAgentData?.platform,
    mobile: nav.userAgentData?.mobile,
  });
}

export function AddToWalletButton({
  publicCode,
  displayName,
  appleReady,
  googleReady,
  dark,
  accent = null,
}: {
  publicCode: string;
  displayName: string;
  appleReady: boolean;
  googleReady: boolean;
  dark: boolean;
  accent?: string | null;
}) {
  // Lazy initializer (not an effect): navigator is absent during SSR, so
  // the first render is platform-agnostic and hydration resolves it.
  const [platform] = useState<WalletPlatform | null>(() =>
    typeof navigator === "undefined" ? null : clientPlatform(),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (modalOpen) closeRef.current?.focus();
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen || qrUrl) return;
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(window.location.href, { width: 480, margin: 2 }),
      )
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, qrUrl]);

  const ready =
    platform !== null &&
    ((platform === "ios" && appleReady) || (platform === "android" && googleReady));

  async function copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback("Profile link copied");
    } catch {
      setCopyFeedback("Copy this page URL to share");
    }
  }

  const buttonClass =
    "flex min-h-[68px] w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left shadow-[0_18px_40px_-14px_var(--karti-accent)] transition duration-150 hover:-translate-y-px hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current active:scale-[0.98]";
  const buttonStyle = {
    backgroundColor: accent ?? "var(--karti-accent, #0e7c5b)",
    color: "#ffffff",
  };

  const label = (
    <>
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
      >
        <LuWallet size={23} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[16px] leading-tight font-extrabold break-words">
          Add to Wallet
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug font-medium break-words text-white/85">
          Keep {displayName.trim() === "" ? "this card" : displayName} on your phone
        </span>
      </span>
    </>
  );

  const onDesktop = platform === "desktop";

  return (
    <>
      {ready ? (
        <a
          href={`/api/wallet/${publicCode}`}
          aria-label="Add to Wallet — save this card on your phone"
          title="Add to Wallet"
          className={buttonClass}
          style={buttonStyle}
        >
          {label}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => {
            setCopyFeedback(null);
            setModalOpen(true);
          }}
          aria-label="Add to Wallet — save this card on your phone"
          aria-haspopup="dialog"
          title="Add to Wallet"
          className={buttonClass}
          style={buttonStyle}
        >
          {label}
        </button>
      )}

      {modalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add to Wallet on your phone"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setModalOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setModalOpen(false);
          }}
        >
          <div
            className={`w-full max-w-sm rounded-[24px] p-5 ${
              dark ? "bg-neutral-900 text-neutral-50" : "bg-white text-text"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[17px] leading-snug font-extrabold">
                {onDesktop || platform === null
                  ? "Open this page on your phone to add your Karti card to Wallet."
                  : "Wallet isn't available for this card yet."}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-black/5"
              >
                <LuX size={18} aria-hidden="true" />
              </button>
            </div>
            {onDesktop || platform === null ? (
              <p className={`mt-2 text-sm ${dark ? "text-neutral-400" : "text-muted"}`}>
                Wallet is available on mobile devices. Scan the code to continue on your phone.
              </p>
            ) : (
              <p className={`mt-2 text-sm ${dark ? "text-neutral-400" : "text-muted"}`}>
                Copy the profile link below and open it on your phone instead.
              </p>
            )}
            <div className="mt-4 flex justify-center">
              {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="QR code to open this profile on your phone"
                  width={200}
                  height={200}
                  className="block h-[200px] w-[200px] rounded-2xl border border-black/10 bg-white p-2"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="h-[200px] w-[200px] animate-pulse rounded-2xl bg-black/5"
                />
              )}
            </div>
            <button
              type="button"
              onClick={copyLink}
              aria-live="polite"
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-black/10 px-4 text-[15px] font-bold"
            >
              <LuCopy size={17} aria-hidden="true" />
              {copyFeedback ?? "Copy Profile Link"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
