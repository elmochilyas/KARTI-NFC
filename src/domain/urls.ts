/**
 * Safe external-URL validation for card destinations and profile links
 * (specs/SECURITY.md, specs/ROUTES_API.md).
 *
 * Accepts only http: and https: schemes. Uses the platform URL parser —
 * never fragile prefix checks — and re-normalizes the stored value.
 * Revalidate at redirect time, not only at save time.
 */

const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

/**
 * Returns the normalized URL string when `input` is a safe external URL,
 * otherwise null. Accepts only absolute http(s) URLs.
 */
export function validateSafeExternalUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  if (!parsed.hostname) return null;
  return parsed.toString();
}
