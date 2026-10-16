/**
 * First-party analytics consent (provider-neutral foundation).
 *
 * Stores only the visitor's choice — never identity. Cookie-based (not
 * localStorage) so the choice stays readable server-side later, matching
 * the existing `karti_attr` attribution-cookie pattern. Extensible to
 * Meta/TikTok consent without changing the storage shape.
 */

export const CONSENT_COOKIE = "karti_consent";

/** Consent choice survives 180 days; afterwards the banner asks again. */
export const CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

export const CONSENT_OPEN_EVENT = "karti:open-consent";

/**
 * Dispatched on `window` whenever the visitor makes a consent choice
 * (accept or reject). Lets deferred third-party loaders (GTM) react
 * without polling cookies: no choice → no vendor script; accept →
 * load lazily; reject → stay unloaded.
 */
export const CONSENT_CHANGE_EVENT = "karti:consent-change";

export type ConsentChangeDetail = {
  /** The visitor's new analytics choice. */
  analytics: boolean;
};

/** Notify in-page listeners that the visitor decided (never throws). */
export function notifyConsentChange(analytics: boolean): void {
  try {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(
      new CustomEvent<ConsentChangeDetail>(CONSENT_CHANGE_EVENT, { detail: { analytics } }),
    );
  } catch {
    // Consent bookkeeping must never break the page.
  }
}

export type ConsentChoice = {
  version: 1;
  /** Analytics (measurement) consent. Advertising always stays denied. */
  analytics: boolean;
  /** Unix epoch seconds when the visitor decided. */
  decidedAt: number;
};

/**
 * Serialize a choice to a cookie value: `v1:analytics=1:ts=<epoch>`.
 * Compact and greppable; no JSON quoting issues in cookie values.
 */
export function serializeConsentChoice(choice: ConsentChoice): string {
  return `v1:analytics=${choice.analytics ? "1" : "0"}:ts=${choice.decidedAt}`;
}

/** Parse a cookie value back to a choice; `null` = absent or malformed. */
export function parseConsentChoice(raw: string | null | undefined): ConsentChoice | null {
  try {
    if (!raw || typeof raw !== "string") return null;
    const match = /^v1:analytics=([01]):ts=(\d+)$/.exec(raw.trim());
    if (!match) return null;
    const decidedAt = Number(match[2]);
    if (!Number.isSafeInteger(decidedAt) || decidedAt <= 0) return null;
    return { version: 1, analytics: match[1] === "1", decidedAt };
  } catch {
    return null;
  }
}

/** A stored choice counts only while fresh (not older than max age). */
export function isFreshConsent(choice: ConsentChoice, nowSeconds: number): boolean {
  try {
    const age = nowSeconds - choice.decidedAt;
    return age >= 0 && age <= CONSENT_MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}

/** Full `Set-Cookie`-style header value for `document.cookie` assignment. */
export function consentCookieHeader(choice: ConsentChoice): string {
  return (
    `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsentChoice(choice))}; ` +
    `Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`
  );
}

/** Read the consent cookie from a raw `document.cookie` string. */
export function readConsentCookie(cookieString: string | null | undefined): ConsentChoice | null {
  try {
    if (!cookieString) return null;
    const parts = cookieString.split(";");
    for (const part of parts) {
      const [key, ...rest] = part.split("=");
      if (key.trim() === CONSENT_COOKIE) {
        return parseConsentChoice(decodeURIComponent(rest.join("=")));
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist the visitor's choice (first-party cookie, no identity). */
export function writeConsentCookie(analytics: boolean): void {
  try {
    if (typeof document === "undefined") return;
    const choice: ConsentChoice = {
      version: 1,
      analytics,
      decidedAt: Math.floor(Date.now() / 1000),
    };
    document.cookie = consentCookieHeader(choice);
  } catch {
    // Consent persistence must never break the page.
  }
}
