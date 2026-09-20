/**
 * Safe external-URL validation for card destinations and profile links
 * (specs/SECURITY.md, specs/ROUTES_API.md).
 *
 * Accepts only http: and https: schemes. Uses the platform URL parser —
 * never fragile prefix checks — and re-normalizes the stored value.
 * Revalidate at redirect time, not only at save time.
 */

const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

/** Upper bound for stored/redirected external URLs (header-injection hygiene). */
export const MAX_EXTERNAL_URL_LENGTH = 2048;

/**
 * Returns the normalized URL string when `input` is a safe external URL,
 * otherwise null. Accepts only absolute http(s) URLs.
 *
 * Defense-in-depth beyond the scheme check: rejects control characters
 * (CR/LF/NULL → header-injection hygiene), over-long values, and URLs
 * carrying credentials (`user:pass@host` is a phishing vector).
 */
export function validateSafeExternalUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_EXTERNAL_URL_LENGTH) return null;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  if (!parsed.hostname) return null;
  if (parsed.username !== "" || parsed.password !== "") return null;
  return parsed.toString();
}
