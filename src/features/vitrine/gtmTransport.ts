/**
 * The ONE GTM transport for the centralized analytics adapter.
 *
 * Architecture: Karti components → `track()` → this transport →
 * `window.dataLayer` → GTM-PCXTLTM7 → GA4 (configured inside GTM later).
 *
 * Components must NEVER call `window.dataLayer.push(...)` directly.
 * Privacy: payloads are already PII-scrubbed by `track()` before they
 * reach this transport; this layer additionally drops non-primitive
 * values (nested objects could smuggle PII) and re-sanitizes any
 * `page_path` so receipt credentials can never leak via URLs.
 */

import type { AnalyticsEventName, AnalyticsPayload } from "./analytics";
import { ensureDataLayer, sanitizePagePath } from "./gtm";

/**
 * Push an approved event to dataLayer. Safe when GTM is blocked or
 * unavailable: never throws, never loads anything, events simply queue
 * (or vanish) without breaking the application.
 */
export function gtmTransport(event: AnalyticsEventName, payload: AnalyticsPayload): void {
  try {
    const layer = ensureDataLayer();
    if (typeof window === "undefined") return;
    const safe: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null ||
        value === undefined
      ) {
        if (value === undefined) continue;
        // Defense in depth: page paths are pathname-only (no ?r=&t=).
        safe[key] =
          key === "page_path" && typeof value === "string" ? sanitizePagePath(value) : value;
      }
      // Non-primitive values are dropped silently (never pushed to GTM).
    }
    layer.push({ event, ...safe });
  } catch {
    // Analytics must never break application functionality.
  }
}
