/**
 * GTM bootstrap island (public vitrine only — mounted in `VitrineShell`).
 *
 * Execution order (consent ordering is critical):
 *   1. `dataLayer` exists (queue, so early-hydration events never throw)
 *   2. Consent Mode default = denied (before any Google tag executes)
 *   3. Stored consent preference is read + applied (analytics only; ads stay denied)
 *   4. GTM container loads (`afterInteractive`, exactly once, only with a valid ID)
 *   5. Analytics events flow via the centralized adapter transport
 *
 * When `NEXT_PUBLIC_GTM_ID` is absent (or GTM is blocked by the browser),
 * this renders nothing and the app keeps working: steps 1–3 + the safe
 * no-op/queue behavior still hold, so no runtime error is possible.
 */
"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { getGtmId } from "@/lib/env";
import { setAnalyticsTransport } from "./analytics";
import { isFreshConsent, readConsentCookie } from "./consent";
import {
  buildGtmNoscriptUrl,
  buildGtmScriptUrl,
  CONSENT_DEFAULTS,
  consentUpdateFor,
  ensureDataLayer,
  GTM_LOADED_FLAG,
  GTM_SCRIPT_ID,
  isValidGtmId,
  pushGtagConsent,
} from "./gtm";
import { gtmTransport } from "./gtmTransport";

export function GtmBootstrap() {
  // Public container ID only; absent/invalid → GTM stays disabled, app works.
  const [gtmId] = useState<string | null>(() => getGtmId() ?? null);

  useEffect(() => {
    // 1. dataLayer exists before any event.
    ensureDataLayer();
    // 2. Consent Mode default = denied, before Google tags execute.
    pushGtagConsent("default", { ...CONSENT_DEFAULTS });
    // 3. Stored preference (analytics only — advertising stays denied).
    try {
      const stored = readConsentCookie(typeof document !== "undefined" ? document.cookie : null);
      if (stored && isFreshConsent(stored, Math.floor(Date.now() / 1000)) && stored.analytics) {
        pushGtagConsent("update", consentUpdateFor(true));
      }
    } catch {
      // No stored consent — defaults (denied) stand.
    }
    // 5. Wire the ONE GTM transport (events queue even before gtm.js arrives).
    setAnalyticsTransport(gtmTransport);
    // 4. Mark the container claimed exactly once (Script dedups by id).
    try {
      const w = window as unknown as Record<string, unknown>;
      if (gtmId && isValidGtmId(gtmId) && !w[GTM_LOADED_FLAG]) {
        w[GTM_LOADED_FLAG] = true;
      }
    } catch {
      // GTM unavailable — application keeps working without it.
    }
    return () => {
      setAnalyticsTransport(null);
    };
  }, [gtmId]);

  if (!gtmId || !isValidGtmId(gtmId)) return null;

  return (
    <>
      <Script id={GTM_SCRIPT_ID} strategy="afterInteractive" src={buildGtmScriptUrl(gtmId)} />
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
