/**
 * HMAC webhook authentication (server-only + Apps Script mirror).
 *
 * Signature: HMAC-SHA256(secret, timestamp + "." + rawRequestBody), hex.
 * Headers: X-Karti-Timestamp (unix ms), X-Karti-Signature (hex).
 *
 * Skew ≤ 5 minutes; replay protection is DURABLE (PostgreSQL nonce table,
 * not in-memory — Vercel runs many serverless instances).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const SHEETS_WEBHOOK_SKEW_MS = 5 * 60 * 1000;
export const SHEETS_WEBHOOK_NONCE_TTL_MS = 10 * 60 * 1000;

const NONCE_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export function isWebhookNonceShape(value: unknown): value is string {
  return typeof value === "string" && NONCE_PATTERN.test(value);
}

export function signSheetsWebhook(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

export type WebhookSignatureVerdict =
  | { ok: true; timestampMs: number }
  | { ok: false; code: "MISSING_AUTH" | "INVALID_TIMESTAMP" | "EXPIRED" | "INVALID_SIGNATURE" };

/**
 * Verify timestamp freshness + HMAC in constant time. Returns the parsed
 * timestamp on success for downstream use.
 */
export function verifySheetsWebhookSignature(args: {
  secret: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  rawBody: string;
  nowMs?: number;
}): WebhookSignatureVerdict {
  const { secret, timestampHeader, signatureHeader, rawBody } = args;
  const nowMs = args.nowMs ?? Date.now();
  if (!timestampHeader || !signatureHeader) return { ok: false, code: "MISSING_AUTH" };
  const timestampMs = Number(timestampHeader);
  if (!Number.isSafeInteger(timestampMs)) return { ok: false, code: "INVALID_TIMESTAMP" };
  if (Math.abs(nowMs - timestampMs) > SHEETS_WEBHOOK_SKEW_MS) {
    return { ok: false, code: "EXPIRED" };
  }
  const expected = signSheetsWebhook(secret, timestampHeader, rawBody);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return { ok: false, code: "INVALID_SIGNATURE" };
  if (!timingSafeEqual(a, b)) return { ok: false, code: "INVALID_SIGNATURE" };
  return { ok: true, timestampMs };
}

/** Timing-safe Bearer comparison for the CRON_SECRET boundary. */
export function verifyBearerToken(expected: string, header: string | null): boolean {
  if (!header) return false;
  const match = /^Bearer (.+)$/.exec(header.trim());
  if (!match) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(match[1], "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Karti → Apps Script signed envelope.
//
// Apps Script Web Apps cannot reliably read custom HTTP headers, so auth
// rides in the JSON body:
//
//   { timestamp, nonce, payload, signature }
//
// where `payload` is a STRING of canonical JSON and
//   signature = HMAC-SHA256(secret, timestamp + "." + nonce + "." + payload).
// Skew ≈ 5 minutes. Replays of UPSERT envelopes are harmless: Apps Script
// always upserts by Order ID (idempotent), with a best-effort CacheService
// nonce check as extra protection (correctness never depends on the cache).
// ---------------------------------------------------------------------------

export const DELIVERY_ENVELOPE_SKEW_MS = 5 * 60 * 1000;

export type DeliveryEnvelope = {
  timestamp: string;
  nonce: string;
  payload: string;
  signature: string;
};

export function signDeliveryEnvelope(
  secret: string,
  timestamp: string,
  nonce: string,
  payload: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${payload}`, "utf8")
    .digest("hex");
}

export function createDeliveryEnvelope(
  secret: string,
  payloadObject: Record<string, unknown>,
  nowMs?: number,
  nonce?: string,
): DeliveryEnvelope {
  const timestamp = String(nowMs ?? Date.now());
  const resolvedNonce = nonce ?? createDeliveryNonce();
  // Canonical payload: JSON with sorted keys for a deterministic signature.
  const payload = JSON.stringify(sortJsonKeys(payloadObject));
  return {
    timestamp,
    nonce: resolvedNonce,
    payload,
    signature: signDeliveryEnvelope(secret, timestamp, resolvedNonce, payload),
  };
}

/** Cryptographically random nonce (uuid v4, no external dependency). */
export function createDeliveryNonce(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortJsonKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export type DeliveryEnvelopeVerdict =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; code: "MALFORMED" | "EXPIRED" | "INVALID_SIGNATURE" };

/**
 * Test/reference mirror of the Apps Script doPost validation (the .gs file
 * is the runtime authority; this keeps the protocol pinned in CI without
 * claiming to execute Apps Script).
 */
export function verifyDeliveryEnvelope(
  secret: string,
  envelope: { timestamp?: unknown; nonce?: unknown; payload?: unknown; signature?: unknown },
  nowMs?: number,
): DeliveryEnvelopeVerdict {
  const now = nowMs ?? Date.now();
  const { timestamp, nonce, payload, signature } = envelope;
  if (
    typeof timestamp !== "string" ||
    typeof nonce !== "string" ||
    typeof payload !== "string" ||
    typeof signature !== "string"
  ) {
    return { ok: false, code: "MALFORMED" };
  }
  if (!isWebhookNonceShape(nonce) && !/^[0-9a-f-]{8,128}$/i.test(nonce)) {
    return { ok: false, code: "MALFORMED" };
  }
  const timestampMs = Number(timestamp);
  if (!Number.isSafeInteger(timestampMs)) return { ok: false, code: "MALFORMED" };
  if (Math.abs(now - timestampMs) > DELIVERY_ENVELOPE_SKEW_MS) {
    return { ok: false, code: "EXPIRED" };
  }
  const expected = signDeliveryEnvelope(secret, timestamp, nonce, payload);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, code: "INVALID_SIGNATURE" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload) as unknown;
  } catch {
    return { ok: false, code: "MALFORMED" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, code: "MALFORMED" };
  }
  return { ok: true, payload: parsed as Record<string, unknown> };
}
