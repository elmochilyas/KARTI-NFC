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
 *    never used on Samsung Internet / Firefox / desktop; declares no
 *    category so Contacts-style DEFAULT-only filters resolve);
 * 3. Classic same-tab navigation to the `inline` vCard response.
 *
 * Share success (or dismissal) resets quietly — the 4s “still visible”
 * fallback only appears when a navigation/intent genuinely went nowhere.
 * The fallback names the real next step (open the file from notifications)
 * and carries a subtle reason code (`S`/`I`/`D`) so one on-device tap
 * reports exactly which delivery path died. The intent path runs only
 * synchronously inside the tap gesture; post-await share failures fall
 * back to plain navigation because expired user activation gets intent
 * navigations silently dropped. Every path reuses the same canonical
 * endpoint: there is no second contact system and no `intent://` default.
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
 *
 * Deliberately declares NO category: Android resolves an intent only
 * against filters containing every category the intent carries, while an
 * intent with no categories passes every filter's category test (the
 * framework treats it as CATEGORY_DEFAULT for startActivity). Declaring
 * BROWSABLE here actively broke resolution against Contacts-style
 * DEFAULT-only filters and produced a silent fallback reload.
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

/**
 * Which delivery path died, surfaced as a short code in the fallback so a
 * single on-device tap becomes a precise bug report: `S` = share sheet path,
 * `I` = Android intent path, `D` = plain download navigation.
 */
export type SaveContactFailureReason = "S" | "I" | "D";

/** Graceful fallback shown only when the native flow did not open. */
export function SaveContactFallback({
  href,
  reason,
}: {
  href: string;
  /** Delivery path that failed; shown as a subtle diagnostic code. */
  reason?: SaveContactFailureReason;
}) {
  return (
    <p className="mt-2 text-center text-[13px] font-medium" role="status">
      Couldn&apos;t open Contacts.{" "}
      <a href={href} className="font-bold underline underline-offset-2">
        Download the file, then open it from your notifications to save it
      </a>
      {reason ? <span className="opacity-60"> ({reason})</span> : null}
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
  const [reason, setReason] = useState<SaveContactFailureReason | null>(null);
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
        setReason(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (timer.current !== null) clearTimeout(timer.current);
          setState("idle");
          setReason(null);
          return;
        }
        // Share failed after an await: user activation has expired, so an
        // intent navigation may be silently dropped by Chrome. Plain
        // navigation always works — take it and report the share failure.
        setReason("S");
        armFallbackTimer();
        window.location.assign(href);
      }
      return;
    }

    // 2. Chrome-Android intent fast-path (gated; never the default). Runs
    // synchronously inside the tap gesture, which intent handling requires.
    if (openAndroidIntent(href)) {
      e.preventDefault();
      setState("opening");
      setReason("I");
      armFallbackTimer();
      return;
    }

    // 3. Classic same-tab navigation to the `inline` vCard (iOS preview path).
    setState("opening");
    setReason("D");
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
        {state === "failed" ? (
          <SaveContactFallback href={href} reason={reason ?? undefined} />
        ) : null}
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
      {state === "failed" ? <SaveContactFallback href={href} reason={reason ?? undefined} /> : null}
    </div>
  );
}
