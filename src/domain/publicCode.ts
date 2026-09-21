import { CARD_SHORT_CODE_ALPHABET, normalizeShortCode } from "./cards";

/**
 * Stable public identity codes (wallet / `/u/{publicCode}`).
 *
 * Unlike slugs (human-readable, renamable), a public code never changes, so
 * saved wallet cards and shared identity links keep working forever. Same
 * Crockford-style alphabet as card short codes, longer (10 chars) since the
 * space is per-profile, not per-card. Stored uppercase; lookups normalize.
 * NOT an authorization secret — ACTIVE-only gating still applies everywhere.
 */

export const PUBLIC_CODE_LENGTH = 10;

const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;

export function normalizePublicCode(input: string): string {
  return normalizeShortCode(input);
}

export function isValidPublicCodeFormat(input: string): boolean {
  return CODE_PATTERN.test(normalizePublicCode(input));
}

/**
 * Generate a random public code (Web Crypto). Accepts injected bytes for
 * tests. Reuses the card-code generator over a longer byte window.
 */
export function generatePublicCode(randomBytes?: Uint8Array): string {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(PUBLIC_CODE_LENGTH));
  let code = "";
  for (let i = 0; i < PUBLIC_CODE_LENGTH; i += 1) {
    const byte = bytes[i % bytes.length] ?? 0;
    code += CARD_SHORT_CODE_ALPHABET[byte % CARD_SHORT_CODE_ALPHABET.length];
  }
  return code;
}

/** Canonical identity URL for a profile — the only URL wallet cards embed. */
export function identityUrlForPublicCode(appUrl: string, publicCode: string): string {
  return `${appUrl.replace(/\/+$/, "")}/u/${normalizePublicCode(publicCode)}`;
}
