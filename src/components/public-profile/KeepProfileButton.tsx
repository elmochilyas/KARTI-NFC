"use client";

import { useEffect, useRef, useState } from "react";
import { LuChevronRight, LuPlus, LuShare2, LuSmartphone, LuX } from "react-icons/lu";

/**
 * Keep Profile island — "keep this digital card on your phone".
 *
 * The second (and last) `"use client"` boundary on the public page; the
 * rest stays server-rendered. Behavior per environment:
 *
 * - Android + `beforeinstallprompt` available → tap fires the native
 *   Chrome install prompt directly. No manual instructions in this path.
 * - Android without a captured prompt → short manual hint (Chrome menu →
 *   Add to Home screen).
 * - iOS Safari (no programmatic install) → premium illustrated guide:
 *   Share → Add to Home Screen → Add. No technical wording.
 * - iOS non-Safari (Chrome/Firefox/Edge on iOS) → the same guide with a
 *   leading "open in Safari first" note. Only Safari on iOS can install —
 *   the CTA never pretends otherwise.
 * - Desktop → a plain note: open the profile on a phone to keep it.
 * - Already running standalone → nothing renders (already kept).
 *
 * Security: no data beyond the current page is touched — installation
 * identity comes from the server-rendered manifest link.
 */

export type InstallPlatform = "ios" | "android" | "desktop";

/** Finer split: only Safari on iOS supports Add to Home Screen. */
export type InstallEnvironment = "ios-safari" | "ios-other" | "android" | "desktop";

export const DESKTOP_KEEP_MESSAGE = "Open this profile on your phone to keep it.";
export const ANDROID_MANUAL_HINT =
  "To keep this card: open this profile in Chrome, tap the menu, then Add to Home screen.";
export const IOS_NON_SAFARI_NOTE =
  "Only Safari on iPhone can add to Home Screen — open this page in Safari first.";

/** UA-only platform split. Pure — unit-tested. iPadOS included via iPad/iPod tokens. */
export function detectInstallPlatform(userAgent: string): InstallPlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

/**
 * Environment split. Pure — unit-tested. iOS Chrome/Firefox/Edge/Opera
 * carry their `*ios` tokens (CriOS/FxiOS/EdgiOS/OPiOS); plain iOS Safari
 * does not. Known limitation: iPadOS in desktop mode reports a Mac UA and
 * reads as desktop (no touch signal in a UA string).
 */
export function detectInstallEnvironment(userAgent: string): InstallEnvironment {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    if (/crios|fxios|edgios|opios|mercury|yabrowser/.test(ua)) return "ios-other";
    return "ios-safari";
  }
  if (/android/.test(ua)) return "android";
  return "desktop";
}

/** Primary CTA label per environment. Pre-hydration (null) gets the generic label. */
export function ctaTitleForEnvironment(
  env: InstallEnvironment | null,
  installing: boolean,
): string {
  if (installing) return "Preparing…";
  switch (env) {
    case "ios-safari":
      return "Add to Home Screen";
    case "ios-other":
      return "Open in Safari to save this card";
    case "android":
      return "Install Digital Card";
    default:
      return "Add to Phone";
  }
}

/** True when the page already runs inside the installed standalone app. */
export function isRunningStandalone(
  matcher?: { matches: boolean },
  standaloneFlag?: boolean,
): boolean {
  // Injectable args keep this pure for tests; the component passes the
  // real browser values.
  if (matcher && matcher.matches) return true;
  if (standaloneFlag === true) return true;
  if (typeof window === "undefined") return false;
  try {
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      return true;
    }
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return true;
  } catch {
    // A hostile or minimal browser must never break the page.
  }
  return false;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function KeepProfileButton({
  dark,
  accent = null,
}: {
  dark: boolean;
  accent?: string | null;
}) {
  // SSR-first: null/false matches the server markup exactly (no hydration
  // mismatch); the one-time browser read below upgrades after mount.
  const [environment, setEnvironment] = useState<InstallEnvironment | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [promptReady, setPromptReady] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showManualHint, setShowManualHint] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // One-time mount read of browser-only values (UA, display-mode):
    // intentional post-hydration upgrade; initial null/false matches SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnvironment(detectInstallEnvironment(window.navigator.userAgent));
    setStandalone(isRunningStandalone());
    const onPrompt = (event: Event) => {
      // Hold the native prompt for the Keep tap — never auto-fire it.
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      setPromptReady(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function onKeep() {
    if (environment === "ios-safari" || environment === "ios-other") {
      setShowIosHelp(true);
      return;
    }
    const promptEvent = deferred.current;
    if (environment === "android" && promptEvent) {
      // Sync-in-gesture prompt: the OS install sheet opens directly.
      setInstalling(true);
      try {
        await promptEvent.prompt();
        await promptEvent.userChoice.catch(() => undefined);
      } catch {
        // Dismissal is not an error worth surfacing.
      } finally {
        deferred.current = null;
        setPromptReady(false);
        setInstalling(false);
      }
      return;
    }
    if (environment === "android") {
      setShowManualHint(true);
      return;
    }
    // Desktop and pre-hydration taps: no install path — the note below
    // already says where to keep the card.
  }

  function closeIosHelp() {
    setShowIosHelp(false);
  }

  if (standalone) return null;

  const cardClass = dark
    ? "border-white/10 bg-neutral-900 text-neutral-50 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.6)]"
    : "border-[#E7EDF4] bg-white text-text shadow-[0_8px_24px_rgba(15,35,60,0.08)]";
  const mutedClass = dark ? "text-neutral-400" : "text-muted";
  const mockChromeClass = dark ? "bg-white/10" : "bg-black/5";
  const ctaTitle = ctaTitleForEnvironment(environment, installing);

  // Desktop: a plain guidance note, not a button — there is no install
  // path to trigger here.
  if (environment === "desktop") {
    return (
      <p
        className={`flex min-h-[60px] items-center gap-3 rounded-[18px] border px-3.5 py-2 text-[14px] leading-snug font-medium ${cardClass} ${mutedClass}`}
      >
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: "color-mix(in srgb, var(--karti-accent) 12%, transparent)",
            color: "var(--karti-accent)",
          }}
        >
          <LuSmartphone size={22} />
        </span>
        <span className="min-w-0 flex-1 break-words">{DESKTOP_KEEP_MESSAGE}</span>
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onKeep}
        disabled={installing}
        aria-label={`${ctaTitle} — keep this digital card on your phone`}
        aria-live="polite"
        title={`${ctaTitle} — keep this digital card on your phone`}
        className={`flex min-h-[68px] w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current active:scale-[0.98] disabled:opacity-70 ${cardClass}`}
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: "color-mix(in srgb, var(--karti-accent) 12%, transparent)",
            color: accent ?? "var(--karti-accent)",
          }}
        >
          <LuSmartphone size={23} />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[16px] leading-tight font-extrabold break-words">
            {ctaTitle}
          </span>
          <span
            className={`mt-0.5 block text-[13px] leading-snug font-medium break-words ${mutedClass}`}
          >
            Keep this digital card on your phone
          </span>
        </span>
        <LuChevronRight
          size={20}
          aria-hidden="true"
          className={`shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
        />
      </button>

      {environment === "android" && showManualHint && !promptReady ? (
        <p role="status" className={`mt-2 px-1 text-[13px] leading-snug break-words ${mutedClass}`}>
          {ANDROID_MANUAL_HINT}
        </p>
      ) : null}

      {environment === "ios-other" && !showIosHelp ? (
        <p role="note" className={`mt-2 px-1 text-[13px] leading-snug break-words ${mutedClass}`}>
          {IOS_NON_SAFARI_NOTE}
        </p>
      ) : null}

      {showIosHelp ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="keep-card-title"
          onClick={closeIosHelp}
        >
          <div
            className={`w-full max-w-sm rounded-[20px] border p-5 ${cardClass}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="keep-card-title" className="text-[17px] font-extrabold">
                Save this card to your iPhone
              </h2>
              <button
                type="button"
                onClick={closeIosHelp}
                autoFocus
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <LuX size={20} aria-hidden="true" />
              </button>
            </div>
            {environment === "ios-other" ? (
              <p
                role="note"
                className={`mt-2 rounded-xl px-3 py-2 text-[13px] leading-snug font-medium break-words ${mockChromeClass} ${mutedClass}`}
              >
                {IOS_NON_SAFARI_NOTE}
              </p>
            ) : null}
            <ol className="mt-3 flex list-none flex-col gap-4">
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white"
                  style={{ backgroundColor: "var(--karti-accent)" }}
                >
                  1
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-[15px]">
                    Tap the <strong>Share</strong> button
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-2 flex items-center gap-2 rounded-xl p-2 ${mockChromeClass}`}
                  >
                    <span
                      className={`h-9 min-w-0 flex-1 rounded-lg ${dark ? "bg-white/15" : "bg-black/10"}`}
                    />
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: "var(--karti-accent)" }}
                    >
                      <LuShare2 size={18} />
                    </span>
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white"
                  style={{ backgroundColor: "var(--karti-accent)" }}
                >
                  2
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-[15px]">
                    Choose <strong>Add to Home Screen</strong>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-2 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${dark ? "border-white/15" : "border-black/10"}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${mockChromeClass}`}
                    >
                      <LuPlus size={18} />
                    </span>
                    <span className="text-[14px] font-semibold">Add to Home Screen</span>
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white"
                  style={{ backgroundColor: "var(--karti-accent)" }}
                >
                  3
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-[15px]">
                    Tap <strong>Add</strong> — your card will appear like an app.
                  </span>
                </span>
              </li>
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
