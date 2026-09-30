/**
 * Centralized normalization for the order domain
 * (specs/specs-vitrin/07-security-validation-edge-cases.md §§8-10).
 *
 * Phone behavior: format hygiene only. Supports Moroccan national input
 * (0XXXXXXXXX → +212XXXXXXXXX, any NDC — not just 06/07) plus valid
 * international E.164 input (+… / 00…). This is NOT a full telecom
 * validity proof; no libphonenumber dependency in V1.
 */

import { validateSafeExternalUrl } from "@/domain/urls";

export const MAX_EXTERNAL_URL_LENGTH = 2048;

const INSTAGRAM_USERNAME_PATTERN = /^[a-zA-Z0-9._]{1,30}$/;
const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);

/** trim + lowercase. No provider-specific tricks (no Gmail-dot stripping). */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmailShape(normalized: string): boolean {
  if (!normalized || normalized.length > 320) return false;
  if (/\s/.test(normalized)) return false;
  const at = normalized.indexOf("@");
  if (at <= 0 || at !== normalized.lastIndexOf("@")) return false;
  const domain = normalized.slice(at + 1);
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;
  return true;
}

function stripPhoneSeparators(input: string): string {
  return input.trim().replace(/[\s\-./()[\]]+/g, "");
}

/**
 * Normalize a phone/WhatsApp number to E.164 (+digits) or null.
 *
 * Accepted shapes:
 * - "+212612345678" (E.164, 7–15 digits after +)
 * - "00212612345678" (00 international prefix → +)
 * - "0612345678" (Moroccan national 0 + 9 digits → +212…)
 * - "612345678" (Moroccan national without trunk, 9 digits starting 6/7 → +212…)
 * - "212612345678" (country code without + → +212…)
 */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let value = stripPhoneSeparators(input);
  if (!value) return null;

  if (value.startsWith("00")) {
    value = `+${value.slice(2)}`;
  }

  if (value.startsWith("+")) {
    const digits = value.slice(1);
    if (!/^\d+$/.test(digits)) return null;
    if (digits.length < 7 || digits.length > 15) return null;
    if (digits.startsWith("0")) return null;
    return `+${digits}`;
  }

  if (!/^\d+$/.test(value)) return null;

  // Moroccan national with trunk: 0 + 9 digits → +212 + 9 digits.
  if (/^0\d{9}$/.test(value)) {
    return `+212${value.slice(1)}`;
  }

  // Moroccan national without trunk: 9 digits starting 6/7 → +212….
  if (/^[67]\d{8}$/.test(value)) {
    return `+212${value}`;
  }

  // Country code without +: 212 + 9 digits → +212….
  if (/^212\d{9}$/.test(value)) {
    return `+${value}`;
  }

  // Other national shapes we cannot safely map to E.164: reject rather
  // than guess. Callers treat null as a validation error.
  return null;
}

/** WhatsApp numbers follow the same E.164 hygiene as phones. */
export function normalizeWhatsApp(input: unknown): string | null {
  return normalizePhone(input);
}

/** Trim + shared safe-URL validation (http/https, no credentials/control chars). */
export function normalizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  return validateSafeExternalUrl(input.trim());
}

/**
 * Production-safe HTTPS destination: shared validation + https-only.
 * Rejects javascript:/data:/file:/vbscript: via the URL parser
 * (never prefix checks alone). Never fetches the URL.
 */
export function normalizeHttpsUrl(input: unknown): string | null {
  const normalized = normalizeUrl(input);
  if (!normalized) return null;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  return normalized;
}

/**
 * Accept a username, @username, or instagram.com profile URL and return the
 * canonical profile URL, or null. Rejects unrelated domains.
 */
export function normalizeInstagram(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  // URL shape: parse and verify host, then take the first path segment.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.includes("/")) {
    let candidate = trimmed;
    // Bare "instagram.com/user" without scheme.
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
      if (/^(www\.|m\.)?instagram\.com\//i.test(candidate)) {
        candidate = `https://${candidate}`;
      } else {
        return null;
      }
    }
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!INSTAGRAM_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    const segment = parsed.pathname.split("/").filter(Boolean)[0];
    if (!segment || !INSTAGRAM_USERNAME_PATTERN.test(segment)) return null;
    return `https://www.instagram.com/${segment}/`;
  }

  const username = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (!INSTAGRAM_USERNAME_PATTERN.test(username)) return null;
  return `https://www.instagram.com/${username}/`;
}

/** Server-side WhatsApp destination built from the normalized number. */
export function buildWhatsAppDestination(
  normalizedNumber: string,
  predefinedMessage?: string,
): string | null {
  const normalized = normalizePhone(normalizedNumber);
  if (!normalized) return null;
  const digits = normalized.slice(1);
  const base = `https://wa.me/${digits}`;
  if (predefinedMessage === undefined || predefinedMessage.trim() === "") {
    return base;
  }
  return `${base}?text=${encodeURIComponent(predefinedMessage)}`;
}

export function buildInstagramCanonicalUrl(username: string): string | null {
  return normalizeInstagram(username);
}
