/**
 * First-party attribution tracker island (spec 06).
 *
 * Runs on marketing pages only — never on the NFC tap path. Captures
 * sanitized landing context (path, external referrer host, UTM params)
 * into the `karti_attr` cookie on every route change. No PII, no
 * fingerprinting.
 */
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  ATTRIBUTION_COOKIE,
  attributionCookieHeader,
  buildTouch,
  mergeTouch,
  parseAttributionCookie,
} from "./attribution";

function readCookie(name: string): string | null {
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key.trim() === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function AttributionTracker() {
  const path = usePathname();
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const touch = buildTouch({
        path,
        referrer: document.referrer,
        origin: window.location.origin,
        params: {
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          utm_content: params.get("utm_content"),
          utm_term: params.get("utm_term"),
        },
      });
      const snapshot = parseAttributionCookie(readCookie(ATTRIBUTION_COOKIE));
      const merged = mergeTouch(snapshot, touch);
      document.cookie = attributionCookieHeader(merged);
    } catch {
      // Attribution must never break the page.
    }
  }, [path]);

  return null;
}
