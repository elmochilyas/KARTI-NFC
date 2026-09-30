import "server-only";

/**
 * Server-only secrets. The `server-only` import above makes any client-side
 * (or browser-bundle) import a hard build error — stronger than the previous
 * runtime `typeof window` guard. Never add NEXT_PUBLIC_* reads here; those
 * belong in `./env`, which must stay browser-safe.
 */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (see .env.example).");
  }
  return key;
}

/**
 * Centralized Karti sales WhatsApp number (digits only, e.g. 212612345678).
 * Public sales contact, not a secret — but read server-side so the success
 * page can hide the CTA cleanly when unconfigured instead of rendering a
 * broken link. Returns null when unset or malformed.
 */
export function getSalesWhatsapp(): string | null {
  const raw = process.env.KARTI_SALES_WHATSAPP?.trim() ?? "";
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

/**
 * Server secret binding receipt tokens to idempotency keys
 * (HMAC-SHA256). Fail-closed like the service-role key: order creation
 * cannot mint valid receipts without it. Generate with
 * `openssl rand -hex 32`; never expose to the browser or logs.
 */
export function getReceiptTokenSecret(): string {
  const secret = process.env.RECEIPT_TOKEN_SECRET?.trim() ?? "";
  if (secret.length < 16) {
    throw new Error("RECEIPT_TOKEN_SECRET is not set (min 16 chars, see .env.example).");
  }
  return secret;
}

/**
 * Server secret for the durable rate limiter (Phase 6).
 *
 * Derives the non-reversible abuse key HMAC(secret, normalized-IP +
 * action) server-side so no raw IP or PII ever reaches the rate-limit
 * table. Fail-closed like the receipt secret: public submission cannot
 * rate-limit safely without it. Never expose to the browser or logs.
 */
export function getRateLimitSecret(): string {
  const secret = process.env.RATE_LIMIT_SECRET?.trim() ?? "";
  if (secret.length < 16) {
    throw new Error("RATE_LIMIT_SECRET is not set (min 16 chars, see .env.example).");
  }
  return secret;
}
