/**
 * Deterministic acquisition-source classifier
 * (specs/specs-vitrin/06 §§2-6).
 *
 * Derived server-side from sanitized referrer/UTM context. Never trust a
 * caller-provided enum. Never includes personal information.
 */

export const ACQUISITION_SOURCES = [
  "DIRECT",
  "ORGANIC_SEARCH",
  "PAID_SEARCH",
  "ORGANIC_SOCIAL",
  "PAID_SOCIAL",
  "REFERRAL",
  "OTHER",
  "UNKNOWN",
] as const;

export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export type AttributionSignals = {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  path?: string | null;
};

const SOCIAL_TOKENS = [
  "instagram",
  "tiktok",
  "facebook",
  "fb",
  "snapchat",
  "snap",
  "youtube",
  "linkedin",
  "twitter",
  "x",
];

const SEARCH_HOST_TOKENS = [
  "google.",
  "bing.",
  "yahoo.",
  "duckduckgo.",
  "ecosia.",
  "brave.",
  "yandex.",
  "baidu.",
];

function lowered(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function hostOf(referrer: string): string | null {
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isPaidMedium(medium: string): boolean {
  return (
    medium === "paid_search" ||
    medium === "paid-search" ||
    medium === "paid_social" ||
    medium === "paid-social" ||
    medium.includes("paid") ||
    medium === "cpc" ||
    medium === "ppc" ||
    medium === "cpm" ||
    medium.includes("cpc") ||
    medium.includes("ppc")
  );
}

function isSocialToken(value: string): boolean {
  return SOCIAL_TOKENS.some((token) => value === token || value.includes(token));
}

function isSocialMedium(medium: string): boolean {
  return (
    medium === "organic_social" ||
    medium === "organic-social" ||
    medium === "social" ||
    isSocialToken(medium)
  );
}

function isSearchHost(host: string): boolean {
  return SEARCH_HOST_TOKENS.some((token) => host.includes(token));
}

function isSocialHost(host: string): boolean {
  const base = host.replace(/^www\.|^m\./, "");
  return (
    base.startsWith("instagram.") ||
    base.startsWith("tiktok.") ||
    base.startsWith("facebook.") ||
    base.startsWith("fb.") ||
    base.startsWith("linkedin.") ||
    base.startsWith("youtube.") ||
    base.startsWith("snapchat.") ||
    base.startsWith("twitter.") ||
    base === "x.com"
  );
}

export function classifyAcquisitionSource(signals: AttributionSignals): AcquisitionSource {
  const utmSource = lowered(signals.utmSource);
  const utmMedium = lowered(signals.utmMedium);
  const utmCampaign = lowered(signals.utmCampaign);
  const referrerRaw = (signals.referrer ?? "").trim();

  const hasUtm = utmSource !== "" || utmMedium !== "" || utmCampaign !== "";
  const paid = isPaidMedium(utmMedium);
  const socialUtm = isSocialToken(utmSource) || isSocialMedium(utmMedium);

  // 1. Paid campaigns win over organic signals.
  if (paid) {
    if (socialUtm) return "PAID_SOCIAL";
    return "PAID_SEARCH";
  }

  // 2. Explicit organic-social UTMs.
  if (socialUtm) return "ORGANIC_SOCIAL";

  // 3. Any other explicit UTM campaign that is not search/social shaped.
  if (hasUtm) {
    if (utmSource !== "" || utmMedium !== "") return "OTHER";
  }

  // 4. Referrer-based derivation (sanitized to host only by the caller).
  if (referrerRaw !== "") {
    const host = hostOf(referrerRaw);
    if (host === null) return "UNKNOWN";
    if (isSearchHost(host)) return "ORGANIC_SEARCH";
    if (isSocialHost(host)) return "ORGANIC_SOCIAL";
    return "REFERRAL";
  }

  // 5. No signals at all → direct type-in/bookmark.
  if (!hasUtm) return "DIRECT";

  return "UNKNOWN";
}
