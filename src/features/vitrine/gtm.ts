/**
 * Google Tag Manager primitives (public vitrine only).
 *
 * Framework-appropriate equivalent of Google's raw GTM snippet for the
 * Next.js App Router: dataLayer + Consent Mode defaults are established
 * first (see `GtmBootstrap`), then the container script loads with
 * `next/script afterInteractive` (never render-blocking), with a
 * `<noscript>` iframe fallback.
 *
 * Container: GTM-PCXTLTM7 via `NEXT_PUBLIC_GTM_ID` (public, not a secret).
 * GA4 is configured INSIDE GTM — never add a direct gtag.js script.
 *
 * This module is pure/testable (no `window` access except through the
 * explicitly guarded helpers). Browser effects live in `GtmBootstrap`.
 */

import { VITRINE_LOCALES } from "./i18n/dict";

/** Container IDs look like `GTM-XXXXXXX` (uppercase alphanumerics). */
export const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export function isValidGtmId(value: unknown): value is string {
  return typeof value === "string" && GTM_ID_PATTERN.test(value.trim());
}

/** Exact container script URL (equivalent of Google's `gtm.js?id=` snippet). */
export function buildGtmScriptUrl(gtmId: string): string {
  return `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
}

/** Noscript fallback URL (equivalent of Google's `ns.html?id=` snippet). */
export function buildGtmNoscriptUrl(gtmId: string): string {
  return `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
}

/** DOM id for the injected GTM script (exactly one per page). */
export const GTM_SCRIPT_ID = "karti-gtm";

/** DOM id for the blocking pre-GTM Consent Mode init script. */
export const CONSENT_SCRIPT_ID = "karti-consent-default";

/** Window flag proving GTM bootstrap ran once (no duplicate init). */
export const GTM_LOADED_FLAG = "__kartiGtmLoaded";

declare global {
  // Minimal dataLayer/gtag surface; GTM itself extends this at runtime.
  var dataLayer: Array<Record<string, unknown> | unknown[]> | undefined;
  var gtag: ((...args: unknown[]) => void) | undefined;
}

export type DataLayerEntry = Record<string, unknown> | unknown[];

/**
 * Ensure `window.dataLayer` exists before analytics pushes events.
 * Safe to call during hydration and when GTM is blocked: never throws,
 * never loads anything, just guarantees the queue array.
 */
export function ensureDataLayer(): Array<DataLayerEntry> {
  try {
    if (typeof window === "undefined") return [];
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }
    return window.dataLayer as Array<DataLayerEntry>;
  } catch {
    return [];
  }
}

/** Google Consent Mode v2 defaults: everything denied until the visitor chooses. */
export const CONSENT_DEFAULTS = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

/**
 * Consent update payload for a stored visitor choice. Advertising
 * categories intentionally stay denied — Karti runs no Google Ads /
 * remarketing through this integration.
 */
export function consentUpdateFor(analyticsAccepted: boolean): {
  analytics_storage: "granted" | "denied";
  ad_storage: "denied";
  ad_user_data: "denied";
  ad_personalization: "denied";
} {
  return {
    analytics_storage: analyticsAccepted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };
}

/**
 * Push a `gtag('consent', mode, params)` command using Google's standard
 * dataLayer/gtag semantics. Defines the `gtag` shim when GTM has not
 * loaded yet — the exact Google snippet shape
 * (`function gtag(){dataLayer.push(arguments);}`), so the queued entry is
 * the `arguments` object, not a plain event object. Never throws — consent
 * must never break the page, including when GTM is blocked.
 */
export function pushGtagConsent(mode: "default" | "update", params: Record<string, string>): void {
  try {
    if (typeof window === "undefined") return;
    ensureDataLayer();
    if (typeof window.gtag !== "function") {
      // Google's canonical gtag shim: queues the `arguments` object itself.
      window.gtag = function gtagShim(): void {
        try {
          // eslint-disable-next-line prefer-rest-params
          (window.dataLayer as unknown[]).push(arguments);
        } catch {
          // DataLayer unavailable — analytics stays silent, page keeps working.
        }
      };
    }
    window.gtag("consent", mode, params);
  } catch {
    // Consent/bookkeeping must never break application functionality.
  }
}

/**
 * True when dataLayer already holds a `gtag('consent', mode, …)` command.
 *
 * Accepts both encodings: a real array (`["consent", mode, params]`) and
 * the `arguments` object queued by Google's
 * `function gtag(){dataLayer.push(arguments);}` shim. Plain
 * `{event: …}` objects never match — consent commands are not events.
 */
export function dataLayerHasConsent(mode: "default" | "update"): boolean {
  try {
    if (typeof window === "undefined") return false;
    const layer = window.dataLayer;
    if (!Array.isArray(layer)) return false;
    return layer.some((entry) => {
      if (entry === null || typeof entry !== "object") return false;
      const cmd = entry as unknown as ArrayLike<unknown>;
      return cmd[0] === "consent" && cmd[1] === mode;
    });
  } catch {
    return false;
  }
}

/**
 * Blocking pre-GTM Consent Mode init script (inner JS for the
 * `#karti-consent-default` inline `<script>`, rendered synchronously in
 * the document before the GTM container loads).
 *
 * Runtime order in the actual browser:
 *   1. receipt routes (`/fr|en|ar/order/success`) bail out first — no
 *      dataLayer, no consent, no footprint (private credential URLs);
 *   2. `window.dataLayer` exists;
 *   3. `window.gtag` exists (Google's canonical
 *      `function gtag(){dataLayer.push(arguments);}` shim);
 *   4. `gtag('consent', 'default', …)` — all four categories denied;
 *   5. stored `karti_consent` choice: fresh `analytics=1` →
 *      `gtag('consent', 'update', …)` granting analytics only (ads stay
 *      denied); anything else keeps the denied defaults.
 *
 * Deliberately regex-free so the builder needs no escape juggling. The
 * 15552000s freshness window mirrors `CONSENT_MAX_AGE_SECONDS` from
 * `./consent` (pinned by unit test).
 */
export function buildConsentInitScript(): string {
  return (
    "(function(){" +
    "try{" +
    'var segs=(window.location.pathname||"/").split("/");' +
    'if((segs[1]==="fr"||segs[1]==="en"||segs[1]==="ar")&&segs[2]==="order"&&segs[3]==="success"){return;}' +
    "}catch(e){}" +
    "window.dataLayer=window.dataLayer||[];" +
    "function gtag(){window.dataLayer.push(arguments);}" +
    "window.gtag=gtag;" +
    'window.gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});' +
    "try{" +
    'var parts=document.cookie.split(";");' +
    "var raw=null;" +
    "for(var i=0;i<parts.length;i++){" +
    'var kv=parts[i].split("=");' +
    'if(kv[0].trim()==="karti_consent"){raw=kv.slice(1).join("=");break;}' +
    "}" +
    "if(raw){" +
    "var val=raw;" +
    "try{val=decodeURIComponent(raw);}catch(d){}" +
    'var prefix="v1:analytics=1:ts=";' +
    "if(val.indexOf(prefix)===0){" +
    "var rest=val.substring(prefix.length);" +
    "var ts=parseInt(rest,10);" +
    "if(String(ts)===rest&&ts>0){" +
    "var now=Math.floor(Date.now()/1000);" +
    "if(now-ts>=0&&now-ts<=15552000){" +
    'window.gtag("consent","update",{analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});' +
    "}" +
    "}" +
    "}" +
    "}" +
    "}catch(e){}" +
    "})();"
  );
}

/**
 * Localized order-success receipt routes carry a private credential
 * (`?r=&t=`). GA4 can auto-collect `page_location` from the browser URL,
 * so sanitizing our own events is not enough: GTM must not load there at
 * all — no script, no iframe, no transport, no page_view.
 */
const RECEIPT_ROUTE_PATTERN = new RegExp(`^/(${VITRINE_LOCALES.join("|")})/order/success(?=/|$)`);

/** True for `/fr|en|ar/order/success` (query/hash ignored). */
export function isReceiptRoute(pathname: string | null | undefined): boolean {
  try {
    if (!pathname) return false;
    const clean = pathname.split("#", 1)[0]?.split("?", 1)[0] ?? "";
    return RECEIPT_ROUTE_PATTERN.test(clean);
  } catch {
    return false;
  }
}

/**
 * Sanitize a route for analytics: pathname only, no query string, no hash.
 * The order-success receipt URL carries private credentials (`?r=&t=`), so
 * query values must NEVER reach dataLayer (see `gtmTransport` + regression
 * tests). Caps length defensively.
 */
export function sanitizePagePath(raw: string): string {
  try {
    const withoutHash = raw.split("#", 1)[0] ?? "";
    const withoutQuery = withoutHash.split("?", 1)[0] ?? "";
    const trimmed = withoutQuery.trim();
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const collapsed = path.replace(/\/{2,}/g, "/");
    return collapsed.slice(0, 200) || "/";
  } catch {
    return "/";
  }
}

/**
 * Coarse page category for the centralized `page_view` event. Derived from
 * the sanitized path only — never from query values.
 */
export function pageTypeForPath(sanitizedPath: string): string {
  const segments = sanitizedPath.split("/").filter(Boolean);
  // [locale, ...rest]
  const rest = segments.slice(1);
  const first = rest[0] ?? "";
  const second = rest[1] ?? "";
  if (rest.length === 0) return "home";
  if (first === "order" && second === "success") return "order_success";
  if (first === "order") return "order";
  if (first === "products") return rest.length > 1 ? "product" : "product_hub";
  if (first === "solutions") return "solution";
  if (first === "how-it-works") return "how_it_works";
  if (first === "pricing") return "pricing";
  if (first === "examples") return "examples";
  if (first === "faq") return "faq";
  if (first === "resources") return rest.length > 1 ? "article" : "resources";
  if (first === "contact") return "contact";
  if (first === "privacy" || first === "terms" || first === "delivery") return "legal";
  return "content";
}
