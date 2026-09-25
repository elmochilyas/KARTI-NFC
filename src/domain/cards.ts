/**
 * Physical-card short codes (specs/DATA_MODEL.md, specs/DOMAIN_RULES.md).
 *
 * A short code is a random, public, non-sequential, URL-safe identifier
 * used in the permanent card URL: https://karti.pro/t/{shortCode}.
 * It is NOT an authorization secret. Database uniqueness / collision retry
 * belongs to the persistence layer (Phase 2+), not here.
 */

export const CARD_SHORT_CODE_LENGTH = 8;

/** Crockford-style alphabet without ambiguous chars (0/O, 1/I/L). */
export const CARD_SHORT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;

/** Uppercase + trim so codes compare consistently. */
export function normalizeShortCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidShortCodeFormat(input: string): boolean {
  return CODE_PATTERN.test(normalizeShortCode(input));
}

/**
 * Generate a random short code with the Web Crypto API (available in
 * browsers, Node 19+, and edge runtimes). Accepts injected bytes for tests.
 */
export function generateCardShortCode(randomBytes?: Uint8Array): string {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(CARD_SHORT_CODE_LENGTH));
  const alphabet = CARD_SHORT_CODE_ALPHABET;
  let code = "";
  for (let i = 0; i < CARD_SHORT_CODE_LENGTH; i += 1) {
    const byte = bytes[i % bytes.length] ?? 0;
    code += alphabet[byte % alphabet.length];
  }
  return code;
}
