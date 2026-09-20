"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { LuUserPlus } from "react-icons/lu";
import { foregroundOnAccent } from "./ProfilePreview";

/**
 * Save Contact action — progressive direct-open of the canonical vCard endpoint.
 *
 * The anchor stays a real same-tab link (`/api/vcard/{slug}.vcf`, no `download`
 * attribute) so the page works with JS disabled: iOS Safari receives a genuine
 * `text/vcard` response and opens the native contact preview. On top of that,
 * the click handler attempts faster paths first (ADR-038):
 *
 * 1. Web Share Level 2 with a `.vcf` File — the OS share sheet offers
 *    “Save to Contacts / Create New Contact” directly, with no
 *    Files/Downloads detour;
 * 2. Chrome-on-Android `intent:// … type=text/x-vcard` fast-path (UA-gated;
 *    never used on Samsung Internet / Firefox / desktop);
 * 3. Classic same-tab navigation to the `inline` vCard response.
 *
 * Share success (or dismissal) resets quietly — the 4s “still visible”
 * fallback only appears when a navigation/intent genuinely went nowhere.
 * Every path reuses the same canonical endpoint: there is no second contact
 * system and no `intent://` default.
 */

/** How long to wait before concluding the native flow did not open. */
export const SAVE_CONTACT_OPENING_TIMEOUT_MS = 4000;

type SaveContactState = "idle" | "opening" | "failed";

type ShareDataWithFiles = {
  files?: File[];
  title?: string;
  text?: string;
};

type FileShareNavigator = {
  share?: (data: ShareDataWithFiles) => Promise<void>;
  canShare?: (data: ShareDataWithFiles) => boolean;
};

type NavigatorWithUserAgentData = {
  userAgent?: string;
  userAgentData?: { platform?: string };
};

/**
 * Filename for the shared File, derived from the endpoint href.
 * `/api/vcard/ahmed-benali.vcf` → `ahmed-benali.vcf`; extension-less hrefs
 * gain the suffix. Exported for unit tests.
 */
export function vcardShareFilename(href: string): string {
  const path = href.split("?")[0].split("#")[0];
  const segments = path.split("/").filter((segment) => segment !== "");
  const last = segments.length > 0 ? segments[segments.length - 1] : "";
  if (last.trim() === "") return "karti-contact.vcf";
  return /\.vcf$/i.test(last) ? last : `${last}.vcf`;
}

/**
 * Build a Chrome-Android `intent://` URL that opens the vCard directly in
 * the Contacts/import handler, with the profile page as the browser
 * fallback. Returns null for non-HTTP(S) inputs. Exported for unit tests.
 */
export function buildVCardIntentUrl(
  absoluteVCardUrl: string,
  absoluteFallbackUrl: string,
): string | null {
  let vcard: URL;
  let fallback: URL;
  try {
    vcard = new URL(absoluteVCardUrl);
    fallback = new URL(absoluteFallbackUrl);
  } catch {
    return null;
  }
  if (vcard.protocol !== "http:" && vcard.protocol !== "https:") return null;
  if (fallback.protocol !== "http:" && fallback.protocol !== "https:") return null;
  const scheme = vcard.protocol.slice(0, -1);
  const path = `${vcard.host}${vcard.pathname}${vcard.search}`;
  return (
    `intent://${path}` +
    "#Intent" +
    `;scheme=${scheme}` +
    ";action=android.intent.action.VIEW" +
    ";category=android.intent.category.BROWSABLE" +
    ";type=text/x-vcard" +
    `;S.browser_fallback_url=${encodeURIComponent(fallback.toString())}` +
    ";end"
  );
}

/**
 * True only for Chrome on Android, excluding Samsung Internet, Firefox,
 * Opera, and Edge — where `intent://` is unreliable or hijacks the flow.
 * Exported for unit tests.
 */
export function shouldAttemptAndroidIntent(userAgent: string, platform?: string): boolean {
  const onAndroid = platform === "Android" || /android/i.test(userAgent);
  if (!onAndroid) return false;
  if (!/chrome/i.test(userAgent)) return false;
  if (/samsungbrowser|firefox|fxios|\bopr\/|\bopera\b|\bedg/i.test(userAgent)) return false;
  return true;
}

/**
 * True when the Web Share Level 2 file path can be attempted (share +
 * canShare present and the platform accepts a `.vcf` file). Probing is
 * wrapped so SSR/old browsers simply report false. Exported for unit tests.
 */
export function supportsVCardFileShare(nav: FileShareNavigator): boolean {
  try {
    if (typeof File === "undefined") return false;
    if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
    const probe = new File(["BEGIN:VCARD"], "probe.vcf", { type: "text/vcard" });
    return nav.canShare({ files: [probe] }) === true;
  } catch {
    return false;
  }
}

const ACCENT_GRADIENT =
  "linear-gradient(135deg, var(--karti-accent), color-mix(in srgb, var(--karti-accent) 58%, black))";

/** Graceful fallback shown only when the native flow did not open. */
export function SaveContactFallback({ href }: { href: string }) {
  return (
    <p className="mt-2 text-center text-[13px] font-medium" role="status">
      Couldn&apos;t open Contacts.{" "}
      <a href={href} className="font-bold underline underline-offset-2">
        Download contact
      </a>
    </p>
  );
}

export function SaveContactAction({
  href,
  accent,
  variant,
}: {
  /** Canonical vCard endpoint, e.g. `/api/vcard/ahmed-benali.vcf`. */
  href: string;
  accent: string | null;
  /** `cta` = in-flow button, `sticky` = bottom sticky bar. */
  variant: "cta" | "sticky";
}) {
  const [state, setState] = useState<SaveContactState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clear() {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    }
    window.addEventListener("pagehide", clear);
    return () => {
      window.removeEventListener("pagehide", clear);
      clear();
    };
  }, []);

  function armFallbackTimer() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // A successful tap leaves this page for the native contact preview.
      // If we are still visible, the navigation was blocked — offer fallback.
      if (document.visibilityState === "visible") setState("failed");
    }, SAVE_CONTACT_OPENING_TIMEOUT_MS);
  }

  /** Chrome-Android `intent://` fast-path. Returns true when attempted. */
  function openAndroidIntent(vcardHref: string): boolean {
    try {
      const nav = navigator as unknown as FileShareNavigator & NavigatorWithUserAgentData;
      const userAgent = nav.userAgent ?? navigator.userAgent;
      if (!shouldAttemptAndroidIntent(userAgent, nav.userAgentData?.platform)) return false;
      const absoluteVCard = new URL(vcardHref, window.location.href).toString();
      const intent = buildVCardIntentUrl(absoluteVCard, window.location.href);
      if (!intent) return false;
      window.location.href = intent;
      return true;
    } catch {
      return false;
    }
  }

  async function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (state === "failed") return;
    const nav = navigator as unknown as FileShareNavigator;

    // 1. Share-sheet fast-path: no Downloads detour on supporting phones.
    if (supportsVCardFileShare(nav)) {
      e.preventDefault();
      setState("opening");
      try {
        const response = await fetch(href, { credentials: "same-origin" });
        if (!response.ok) throw new Error(`vCard fetch failed: ${response.status}`);
        const blob = await response.blob();
        const file = new File([blob], vcardShareFilename(href), { type: "text/vcard" });
        if (typeof nav.canShare !== "function" || nav.canShare({ files: [file] }) !== true) {
          throw new Error("file share rejected");
        }
        if (typeof nav.share !== "function") throw new Error("share unavailable");
        await nav.share({ files: [file], title: document.title });
        // Back from the sheet (saved or dismissed): quiet reset, no failure UI.
        if (timer.current !== null) clearTimeout(timer.current);
        setState("idle");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (timer.current !== null) clearTimeout(timer.current);
          setState("idle");
          return;
        }
        if (openAndroidIntent(href)) {
          armFallbackTimer();
          return;
        }
        armFallbackTimer();
        window.location.assign(href);
      }
      return;
    }

    // 2. Chrome-Android intent fast-path (gated; never the default).
    if (openAndroidIntent(href)) {
      e.preventDefault();
      setState("opening");
      armFallbackTimer();
      return;
    }

    // 3. Classic same-tab navigation to the `inline` vCard (iOS preview path).
    setState("opening");
    armFallbackTimer();
  }

  const label = state === "opening" ? "Opening…" : "Save Contact";

  if (variant === "sticky") {
    return (
      <div aria-live="polite">
        <a
          href={href}
          onClick={handleClick}
          aria-label="Save contact"
          className="pointer-events-auto flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl px-6 text-[16px] font-extrabold shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] transition hover:brightness-110 active:scale-[0.99]"
          style={{
            backgroundImage: ACCENT_GRADIENT,
            color: foregroundOnAccent(accent),
          }}
        >
          <LuUserPlus size={22} aria-hidden="true" className="shrink-0" />
          {label}
        </a>
        {state === "failed" ? <SaveContactFallback href={href} /> : null}
      </div>
    );
  }

  return (
    <div aria-live="polite">
      <a
        href={href}
        onClick={handleClick}
        className="karti-rise flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[18px] px-6 text-[16px] font-extrabold transition hover:brightness-110 active:scale-[0.99]"
        style={{
          animationDelay: "60ms",
          backgroundImage: ACCENT_GRADIENT,
          color: foregroundOnAccent(accent),
          boxShadow: "0 14px 28px -12px color-mix(in srgb, var(--karti-accent) 65%, transparent)",
        }}
      >
        <LuUserPlus size={22} aria-hidden="true" className="shrink-0" />
        {label}
      </a>
      {state === "failed" ? <SaveContactFallback href={href} /> : null}
    </div>
  );
}
