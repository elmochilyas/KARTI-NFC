/**
 * First/last-touch attribution persistence (spec 06 §§2-6).
 *
 * Privacy-conscious: only marketing context is stored (landing path,
 * referrer host, UTM params, locale). No customer PII, no fingerprinting.
 * Raw signals are stored; `classifyAcquisitionSource()` derives the
 * canonical source server-side at order time — never trust a stored enum.
 */

export const ATTRIBUTION_COOKIE = "karti_attr";
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export type TouchContext = {
  path: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

export type AttributionSnapshot = {
  first: TouchContext | null;
  last: TouchContext | null;
};

export function emptyTouch(): TouchContext {
  return {
    path: null,
    referrerHost: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
  };
}

/** A touch is "meaningful" when it carries an external referrer or any UTM. */
export function isMeaningfulTouch(touch: TouchContext): boolean {
  return (
    touch.referrerHost !== null ||
    touch.utmSource !== null ||
    touch.utmMedium !== null ||
    touch.utmCampaign !== null
  );
}

function sanitizeTouch(value: unknown): TouchContext | null {
  if (value === null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const pick = (key: string): string | null => {
    const raw = record[key];
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim().slice(0, 500);
    return trimmed === "" ? null : trimmed;
  };
  return {
    path: pick("path"),
    referrerHost: pick("referrerHost"),
    utmSource: pick("utmSource"),
    utmMedium: pick("utmMedium"),
    utmCampaign: pick("utmCampaign"),
    utmContent: pick("utmContent"),
    utmTerm: pick("utmTerm"),
  };
}

/** Parse the raw cookie value; malformed input yields an empty snapshot. */
export function parseAttributionCookie(value: unknown): AttributionSnapshot {
  const fallback: AttributionSnapshot = { first: null, last: null };
  if (typeof value !== "string" || value === "") return fallback;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== "object") return fallback;
    const record = parsed as Record<string, unknown>;
    return {
      first: sanitizeTouch(record.first),
      last: sanitizeTouch(record.last),
    };
  } catch {
    return fallback;
  }
}

export function serializeAttributionCookie(snapshot: AttributionSnapshot): string {
  return JSON.stringify({
    first: snapshot.first ?? null,
    last: snapshot.last ?? null,
  });
}

/**
 * Merge a freshly observed touch into the snapshot:
 * - first is set once and never overwritten by later navigation;
 * - last updates only on a meaningful external/campaign entry that
 *   differs from the stored last touch.
 */
export function mergeTouch(
  snapshot: AttributionSnapshot,
  touch: TouchContext,
): AttributionSnapshot {
  const first = snapshot.first ?? (isMeaningfulTouch(touch) ? touch : touch);
  let last = snapshot.last;
  if (isMeaningfulTouch(touch) && touchesDiffer(last, touch)) {
    last = touch;
  }
  return { first, last };
}

function touchesDiffer(a: TouchContext | null, b: TouchContext): boolean {
  if (a === null) return true;
  return (
    a.referrerHost !== b.referrerHost ||
    a.utmSource !== b.utmSource ||
    a.utmMedium !== b.utmMedium ||
    a.utmCampaign !== b.utmCampaign ||
    a.utmContent !== b.utmContent ||
    a.utmTerm !== b.utmTerm
  );
}

/** `document.cookie` assignment value for the browser tracker island. */
export function attributionCookieHeader(snapshot: AttributionSnapshot): string {
  return `${ATTRIBUTION_COOKIE}=${encodeURIComponent(
    serializeAttributionCookie(snapshot),
  )}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

/**
 * Build a TouchContext from browser-observed values. Internal
 * (same-origin) referrers are dropped so plain navigation never
 * overwrites attribution.
 */
export function buildTouch(args: {
  path: string;
  referrer: string;
  origin: string;
  params: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
}): TouchContext {
  const { path, referrer, origin, params } = args;
  let referrerHost: string | null = null;
  if (referrer) {
    try {
      const parsed = new URL(referrer);
      const current = new URL(origin);
      if (parsed.hostname !== current.hostname) {
        referrerHost = parsed.hostname.toLowerCase();
      }
    } catch {
      referrerHost = null;
    }
  }
  const clean = (v: string | null | undefined): string | null => {
    if (!v) return null;
    const t = v.trim().slice(0, 200);
    return t === "" ? null : t;
  };
  return {
    path: path.slice(0, 500),
    referrerHost,
    utmSource: clean(params.utm_source),
    utmMedium: clean(params.utm_medium),
    utmCampaign: clean(params.utm_campaign),
    utmContent: clean(params.utm_content),
    utmTerm: clean(params.utm_term),
  };
}
