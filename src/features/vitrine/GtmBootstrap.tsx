/**
 * GTM bootstrap island (public vitrine only — mounted in `VitrineShell`).
 *
 * Receipt routes (`/fr|en|ar/order/success`) are fully excluded: the URL
 * carries a private credential that GA4 could auto-collect as
 * `page_location`, so no script, no iframe, no transport, and no consent
 * bookkeeping run there. (The order flow hard-navigates to the receipt,
 * so a suppressed mount always means a clean document.)
 *
 * Consent-gated loading (PageSpeed + privacy):
 *   1. `dataLayer` exists — created by the blocking `ConsentInit` inline
 *      script during document parsing (before hydration, before gtm.js)
 *   2. Consent Mode default = denied via `gtag('consent', 'default', …)`
 *      in that same inline script, before any Google tag executes
 *   3. Stored consent preference is read + applied (`gtag('consent',
 *      'update', …)` — analytics only; ads stay denied) by the inline
 *      script; this effect re-applies it only as a fallback if the inline
 *      script did not run (never downgrading an existing command)
 *   4. GTM container loads (`lazyOnload`, exactly once, only with a valid
 *      ID **and** a granted analytics choice). No consent (or reject) →
 *      no `gtm.js`, no `gtag.js` (~155 KiB saved), no preconnect: first
 *      paint stays third-party-free. Accepting the banner fires
 *      `karti:consent-change`, which flips this island to load the
 *      container without a reload.
 *   5. Analytics events flow via the centralized adapter transport
 *      (dataLayer pushes are cheap and stay wired so pre-consent funnel
 *      events queue; the vendor download is what is gated)
 *
 * When `NEXT_PUBLIC_GTM_ID` is absent (or GTM is blocked by the browser),
 * this renders nothing and the app keeps working: steps 1–3 + the safe
 * no-op/queue behavior still hold, so no runtime error is possible.
 */
"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getGtmId } from "@/lib/env";
import { setAnalyticsTransport } from "./analytics";
import { CONSENT_CHANGE_EVENT, isFreshConsent, readConsentCookie } from "./consent";
import {
  buildGtmNoscriptUrl,
  buildGtmScriptUrl,
  CONSENT_DEFAULTS,
  consentUpdateFor,
  dataLayerHasConsent,
  ensureDataLayer,
  GTM_LOADED_FLAG,
  GTM_SCRIPT_ID,
  hasGrantedAnalyticsConsent,
  isReceiptRoute,
  isValidGtmId,
  pushGtagConsent,
} from "./gtm";
import { gtmTransport } from "./gtmTransport";

export function GtmBootstrap() {
  // Public container ID only; absent/invalid → GTM stays disabled, app works.
  const [gtmId] = useState<string | null>(() => getGtmId() ?? null);
  const pathname = usePathname();
  const suppressed = isReceiptRoute(pathname);
  // Consent-gated: the container (and its preconnect) render only here.
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    // Receipt route: never initialize any GA transport (clean document by
    // construction — the order flow hard-navigates here). Unwire on SPA
    // arrival so no further event can flow.
    if (suppressed) {
      setAnalyticsTransport(null);
      return;
    }
    // 1. dataLayer exists before any event.
    ensureDataLayer();
    // 2. Consent Mode default = denied. The blocking ConsentInit script
    // already pushed it during parsing (before gtm.js); re-push only when
    // it is genuinely absent so a granted update is never downgraded.
    if (!dataLayerHasConsent("default")) {
      pushGtagConsent("default", { ...CONSENT_DEFAULTS });
    }
    // 3. Stored preference (analytics only — advertising stays denied).
    // ConsentInit already applied it pre-container; this is the fallback
    // for documents where the inline script did not run.
    try {
      const stored = readConsentCookie(typeof document !== "undefined" ? document.cookie : null);
      if (
        stored &&
        isFreshConsent(stored, Math.floor(Date.now() / 1000)) &&
        stored.analytics &&
        !dataLayerHasConsent("update")
      ) {
        pushGtagConsent("update", consentUpdateFor(true));
      }
    } catch {
      // No stored consent — defaults (denied) stand.
    }
    // 4. Consent state: returning acceptors load immediately; new visitors
    // load only after the banner Accept fires `karti:consent-change`.
    try {
      if (hasGrantedAnalyticsConsent()) setConsented(true);
    } catch {
      // Consent unreadable — stay unloaded, page keeps working.
    }
    const onConsentChange = (event: Event) => {
      try {
        const detail = (event as CustomEvent<{ analytics?: unknown }>).detail;
        if (detail?.analytics === true) setConsented(true);
        else if (hasGrantedAnalyticsConsent()) setConsented(true);
      } catch {
        // Consent bookkeeping must never break the page.
      }
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
    // 5. Wire the ONE GTM transport (events queue even before gtm.js arrives).
    setAnalyticsTransport(gtmTransport);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
      setAnalyticsTransport(null);
    };
  }, [suppressed]);

  useEffect(() => {
    // Mark the container claimed exactly once, and only when it will
    // load (Script dedups by id; this flag guards re-mounts).
    if (suppressed || !consented || !gtmId || !isValidGtmId(gtmId)) return;
    try {
      const w = window as unknown as Record<string, unknown>;
      if (!w[GTM_LOADED_FLAG]) {
        w[GTM_LOADED_FLAG] = true;
      }
    } catch {
      // GTM unavailable — application keeps working without it.
    }
  }, [suppressed, consented, gtmId]);

  if (suppressed || !gtmId || !isValidGtmId(gtmId)) return null;

  // No consent yet (or rejected): render nothing — no vendor bytes, no
  // preconnect, no iframe. The transport above still queues dataLayer
  // events cheaply; the 155 KiB download waits for an explicit Accept.
  if (!consented) return null;

  return (
    <>
      <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      <Script id={GTM_SCRIPT_ID} strategy="lazyOnload" src={buildGtmScriptUrl(gtmId)} />
      <noscript>
        <iframe
          src={buildGtmNoscriptUrl(gtmId)}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
