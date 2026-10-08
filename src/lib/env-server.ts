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

export type DeliverySheetsConfig = {
  enabled: boolean;
  /** Apps Script Web App `/exec` URL (never the `/dev` test URL in prod). */
  webAppUrl: string;
  /** HMAC secret for Karti → Apps Script signed envelopes. */
  webAppSecret: string;
};

export const DELIVERY_APPS_SCRIPT_SECRET_MIN = 32;
export const DELIVERY_WEBHOOK_SECRET_MIN = 32;
export const DELIVERY_CRON_SECRET_MIN = 16;

/**
 * Central Apps Script URL validation (HTTPS + script.google.com + /exec;
 * rejects /dev). Pure — unit-tested.
 */
export function isValidDeliveryWebAppUrl(raw: string): boolean {
  const trimmed = (raw ?? "").trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.hostname !== "script.google.com" && !parsed.hostname.endsWith(".script.google.com")) {
    return false;
  }
  const path = `${parsed.pathname}${parsed.search}`;
  if (/\/dev(\?|$)/.test(path)) return false;
  return /\/exec(\?|$)/.test(path);
}

/**
 * Delivery-mirror configuration (server-only, Apps Script transport).
 *
 * SOLE source: server environment variables. The dashboard never writes
 * configuration — it is operational only. Enabled only when
 * `DELIVERY_SHEETS_ENABLED=true` AND the URL validates AND every secret
 * meets its minimum length; anything else degrades to disabled so public
 * pages and order flows never crash. Local is disabled by default (no env
 * = no-op PENDING rows, retried later). Never expose to the browser.
 */
export function getDeliverySheetsConfig(): DeliverySheetsConfig {
  if (process.env.DELIVERY_SHEETS_ENABLED?.trim().toLowerCase() !== "true") {
    return { enabled: false, webAppUrl: "", webAppSecret: "" };
  }
  const webAppUrl = process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL?.trim() ?? "";
  const webAppSecret = process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET?.trim() ?? "";
  const webhookSecret = process.env.DELIVERY_SHEETS_WEBHOOK_SECRET?.trim() ?? "";
  const cronSecrets = getDeliveryCronSecrets();
  if (
    !isValidDeliveryWebAppUrl(webAppUrl) ||
    webAppSecret.length < DELIVERY_APPS_SCRIPT_SECRET_MIN ||
    webhookSecret.length < DELIVERY_WEBHOOK_SECRET_MIN ||
    cronSecrets.length === 0
  ) {
    return { enabled: false, webAppUrl: "", webAppSecret: "" };
  }
  return { enabled: true, webAppUrl, webAppSecret };
}

/**
 * Dedicated signing secret for the delivery-Sheet → Karti webhook
 * (HMAC-SHA256 over timestamp + "." + raw body). Env-only; throws when
 * absent so verification fails closed. Never expose to the browser, never
 * log, never send to Google Sheets cells/code — it lives in Apps Script
 * Properties only.
 */
export function getSheetsWebhookSecret(): string {
  const secret = process.env.DELIVERY_SHEETS_WEBHOOK_SECRET?.trim() ?? "";
  if (secret.length < DELIVERY_WEBHOOK_SECRET_MIN) {
    throw new Error("DELIVERY_SHEETS_WEBHOOK_SECRET is not set (min 32 chars, see .env.example).");
  }
  return secret;
}

/**
 * Machine secret for the Sheets retry cron (`Authorization: Bearer
 * <CRON_SECRET>`). Single name only: Vercel cron sends `CRON_SECRET`
 * automatically, so scheduled retries need zero operator wiring.
 * Separate boundary from the dashboard admin session: the cron has no
 * browser session, and manual Resync stays behind requireAdmin().
 */
export function getDeliveryCronSecrets(): string[] {
  const value = process.env.CRON_SECRET?.trim() ?? "";
  return value.length >= DELIVERY_CRON_SECRET_MIN ? [value] : [];
}
