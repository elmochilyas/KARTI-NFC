/**
 * Minimal first-party analytics consent banner (public vitrine only).
 *
 * Suppressed on receipt routes (`/fr|en|ar/order/success`): no analytics
 * runs there at all, so there is nothing to consent to on that page.
 *
 * Not a giant CMP: Accept analytics / Reject non-essential, localized
 * FR/EN/AR (RTL via the inherited `dir`), persisted in the `karti_consent`
 * first-party cookie (no identity). Accept grants `analytics_storage`
 * only — advertising categories stay denied. The footer "Cookie
 * preferences" button reopens the banner via `karti:open-consent`.
 */
"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isFreshConsent, readConsentCookie, writeConsentCookie, CONSENT_OPEN_EVENT } from "./consent";
import { consentUpdateFor, isReceiptRoute, pushGtagConsent } from "./gtm";
import type { VitrineDict } from "./i18n";

function hasFreshChoice(): boolean {
  try {
    const stored = readConsentCookie(typeof document !== "undefined" ? document.cookie : null);
    return !!stored && isFreshConsent(stored, Math.floor(Date.now() / 1000));
  } catch {
    return false;
  }
}

export function ConsentBanner({ dict }: { dict: VitrineDict }) {
  const [visible, setVisible] = useState(false);
  const suppressed = isReceiptRoute(usePathname());

  useEffect(() => {
    if (suppressed) return;
    // Do not repeatedly show the banner after a valid choice.
    if (hasFreshChoice()) return;
    // Small delay so first paint stays clean; returning visitors with a
    // choice never see the banner at all.
    const timer = setTimeout(() => {
      if (!hasFreshChoice()) setVisible(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [suppressed]);

  useEffect(() => {
    const reopen = () => setVisible(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  const decide = useCallback((analytics: boolean) => {
    try {
      writeConsentCookie(analytics);
      pushGtagConsent("update", consentUpdateFor(analytics));
    } finally {
      setVisible(false);
    }
  }, []);

  if (suppressed || !visible) return null;

  const copy = dict.consent;
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={copy.title}
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <p className="text-base font-bold text-text">{copy.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{copy.message}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-testid="consent-reject"
            onClick={() => decide(false)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium text-text hover:border-muted"
          >
            {copy.reject}
          </button>
          <button
            type="button"
            data-testid="consent-accept"
            onClick={() => decide(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-accent-contrast hover:bg-accent-strong"
          >
            {copy.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
