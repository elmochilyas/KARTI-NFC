/**
 * Centralized privacy-safe `page_view` island (public vitrine only).
 *
 * ONE navigation-measurement mechanism for the whole public site: fires a
 * single `page_view {page_path, locale, page_type}` on pathname change.
 * This complements (never duplicates) the explicit funnel events
 * (`homepage_view`, `product_page_view`, …) and the order funnel — the
 * GA4 base tag must have automatic `page_view` disabled (see docs).
 *
 * Privacy: `page_path` is pathname-only — receipt credentials on
 * `/order/success?r=&t=` and any other query values never reach dataLayer.
 */
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackEvent } from "./analytics";
import { pageTypeForPath, sanitizePagePath } from "./gtm";
import type { VitrineLocale } from "./i18n";

export function PageViewTracker({ locale }: { locale: VitrineLocale }) {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    try {
      const pagePath = sanitizePagePath(pathname ?? "/");
      // No duplicate page-view mechanism: one push per distinct path.
      if (lastTracked.current === pagePath) return;
      lastTracked.current = pagePath;
      trackEvent("page_view", {
        page_path: pagePath,
        locale,
        page_type: pageTypeForPath(pagePath),
      });
    } catch {
      // Analytics must never break navigation.
    }
  }, [pathname, locale]);

  return null;
}
