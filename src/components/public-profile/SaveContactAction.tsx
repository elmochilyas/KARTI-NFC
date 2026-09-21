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
 * the click handler attempts faster paths first:
 *
 * 1. Chrome-on-Android INSERT `intent://` (ADR-041) — opens the Contacts
 *    editor directly with fields prefilled. Synchronous in the tap gesture:
 *    no fetch, no activation race, immune to subrequest blockers. The
 *    attempt is armed in sessionStorage so a fallback reload restores the
 *    failure UI instead of a silent refresh;
 * 2. Web Share Level 2 with a `.vcf` File (non-Chrome-Android, iOS where
 *    capable) — the OS share sheet offers “Save to Contacts / Create New
 *    Contact” directly. The fetch is warmed on pointerdown/focus so `share()`
 *    stays inside the tap's user activation window;
 * 3. Classic same-tab navigation to the `inline` vCard response.
 *
 * Share success (or dismissal) resets quietly — the 4s “still visible”
 * fallback only appears when a navigation genuinely went nowhere. The
 * fallback names the real next step (open the file from notifications)
 * and carries a subtle reason code (`S`/`I`/`D`) so one on-device tap
 * reports exactly which delivery path died.
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
 * Contact fields for the Android INSERT intent (Contacts editor, prefilled).
 * Keys follow the ContactsContract.Intents.Insert contract.
 */
export type InsertContactFields = {
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  title?: string | null;
};

/**
 * Build a Chrome-Android `intent://` URL that opens the Contacts editor
 * directly with fields prefilled (`action.INSERT`, type-only opaque URI).
 * Type-only (no data URI) sidesteps scheme/host filter matching entirely;
 * no category is declared so DEFAULT-only editor filters resolve (an intent
 * with no categories passes every filter's category test). Returns null
 * when the name is blank or the fallback is not HTTP(S). Exported for unit
 * tests.
 */
export function buildInsertContactIntentUrl(
  fields: InsertContactFields,
  absoluteFallbackUrl: string,
): string | null {
  const name = fields.name.trim();
  if (name === "") return null;
  let fallback: URL;
  try {
    fallback = new URL(absoluteFallbackUrl);
  } catch {
    return null;
  }
  if (fallback.protocol !== "http:" && fallback.protocol !== "https:") return null;
  const extras: Array<[string, string | null | undefined]> = [
    ["phone", fields.phone],
    ["email", fields.email],
    ["company", fields.company],
    ["job_title", fields.title],
  ];
  let url =
    "intent://vnd.android.cursor.dir/raw_contact/" +
    "#Intent" +
    ";action=android.intent.action.INSERT" +
    `;S.name=${encodeURIComponent(name)}`;
  for (const [key, value] of extras) {
    const trimmed = value?.trim();
    if (trimmed) url += `;S.${key}=${encodeURIComponent(trimmed)}`;
  }
  return url + `;S.browser_fallback_url=${encodeURIComponent(fallback.toString())};end`;
}

/** sessionStorage key arming the reload-proof fallback (intent attempts). */
export const SAVE_CONTACT_ATTEMPT_KEY = "karti:save-contact:attempt";

/** Attempts older than this are ignored (stale tab revisited much later). */
export const SAVE_CONTACT_ATTEMPT_MAX_AGE_MS = 120_000;

export type SaveContactAttemptKind = "insert" | "view";

type SaveAttemptStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Record an intent attempt so a fallback reload restores the failure UI
 * instead of a silent refresh. Best-effort: private mode may throw.
 * Exported for unit tests.
 */
export function markSaveAttempt(storage: SaveAttemptStorage, kind: SaveContactAttemptKind): void {
  try {
    storage.setItem(SAVE_CONTACT_ATTEMPT_KEY, JSON.stringify({ kind, ts: Date.now() }));
  } catch {
    // Storage unavailable — the reload just shows a fresh page.
  }
}

/**
 * Consume a recorded attempt (single-shot); null when absent, stale, or
 * malformed. Exported for unit tests.
 */
export function consumeSaveAttempt(
  storage: SaveAttemptStorage,
  now: number = Date.now(),
): SaveContactAttemptKind | null {
  try {
    const raw = storage.getItem(SAVE_CONTACT_ATTEMPT_KEY);
    storage.removeItem(SAVE_CONTACT_ATTEMPT_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as { kind?: unknown; ts?: unknown };
    if (record.kind !== "insert" && record.kind !== "view") return null;
    if (typeof record.ts !== "number" || Number.isNaN(record.ts)) return null;
    if (now - record.ts > SAVE_CONTACT_ATTEMPT_MAX_AGE_MS) return null;
    return record.kind;
  } catch {
    return null;
  }
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
  contact,
}: {
  /** Canonical vCard endpoint, e.g. `/api/vcard/ahmed-benali.vcf`. */
  href: string;
  accent: string | null;
  /** `cta` = in-flow button, `sticky` = bottom sticky bar. */
  variant: "cta" | "sticky";
  /** Prefilled editor fields for the Android INSERT fast-path. */
  contact: InsertContactFields;
}) {
  const [state, setState] = useState<SaveContactState>("idle");
  const [reason, setReason] = useState<SaveContactFailureReason | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Warmed vCard fetch, started on pointerdown/focus so the tap-time await
   * resolves ~instantly. `navigator.share()` must run inside the tap's user
   * activation window; awaiting a cold fetch first lets it expire (slow
   * mobile networks, cold serverless boots) and Chrome rejects without ever
   * showing UI. Keyboard-only users skip warming and use the fetch-in-tap
   * path. Single-use per attempt; a press that never becomes a tap costs one
   * tiny same-origin GET against a `no-store` endpoint.
   */
  const warmedFetch = useRef<Promise<Response> | null>(null);

  function warmFetch() {
    if (warmedFetch.current !== null) return;
    try {
      const pending = fetch(href, { credentials: "same-origin" });
      // Swallow here to avoid unhandled-rejection noise when the press never
      // becomes a tap; the click path still observes the real outcome below.
      pending.catch(() => {});
      warmedFetch.current = pending;
    } catch {
      warmedFetch.current = null;
    }
  }

  useEffect(() => {
    function clear() {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    }
    window.addEventListener("pagehide", clear);
    // A fallback reload after an intent attempt restores the failure UI
    // (with its reason code) instead of a silent refresh. Deferred past the
    // first client render so hydration matches SSR and no cascading render
    // fires inside the effect body.
    const restore = setTimeout(() => {
      if (consumeSaveAttempt(window.sessionStorage) !== null) {
        setState("failed");
        setReason("I");
      }
    }, 0);
    return () => {
      window.removeEventListener("pagehide", clear);
      clearTimeout(restore);
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

  /**
   * Chrome-Android INSERT fast-path: opens the Contacts editor directly
   * with fields prefilled. Synchronous in the tap gesture (no fetch, no
   * activation race) and armed in sessionStorage so a fallback reload
   * restores the failure UI. Returns true when attempted.
   */
  function openInsertContactIntent(fields: InsertContactFields): boolean {
    try {
      const nav = navigator as unknown as FileShareNavigator & NavigatorWithUserAgentData;
      const userAgent = nav.userAgent ?? navigator.userAgent;
      if (!shouldAttemptAndroidIntent(userAgent, nav.userAgentData?.platform)) return false;
      const intent = buildInsertContactIntentUrl(fields, window.location.href);
      if (!intent) return false;
      markSaveAttempt(window.sessionStorage, "insert");
      window.location.href = intent;
      return true;
    } catch {
      return false;
    }
  }

  async function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (state === "failed") return;

    // 1. Android-Chrome INSERT fast-path: Contacts editor, prefilled.
    if (openInsertContactIntent(contact)) {
      e.preventDefault();
      setState("opening");
      setReason("I");
      armFallbackTimer();
      return;
    }

    const nav = navigator as unknown as FileShareNavigator;

    // 2. Share-sheet path: no Downloads detour on supporting phones.
    if (supportsVCardFileShare(nav)) {
      e.preventDefault();
      setState("opening");
      try {
        // Prefer the pointerdown-warmed fetch so share() stays inside user
        // activation; fall back to a tap-time fetch (keyboard users).
        const pending = warmedFetch.current;
        warmedFetch.current = null;
        const response = await (pending ?? fetch(href, { credentials: "same-origin" }));
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
          onPointerDown={warmFetch}
          onFocus={warmFetch}
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
        onPointerDown={warmFetch}
        onFocus={warmFetch}
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
