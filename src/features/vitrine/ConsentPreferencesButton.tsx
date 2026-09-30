/**
 * Footer "Cookie preferences" button (client island).
 *
 * Reopens the consent banner via the `karti:open-consent` event so the
 * visitor can change their choice later. Kept as a tiny island so the
 * server-rendered `SiteFooter` stays a server component.
 */
"use client";

import { CONSENT_OPEN_EVENT } from "./consent";

export function ConsentPreferencesButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      data-testid="cookie-preferences"
      onClick={() => window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT))}
      className="underline hover:text-text"
    >
      {label}
    </button>
  );
}
