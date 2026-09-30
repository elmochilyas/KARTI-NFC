/**
 * Receipt-token utilities (server-only).
 *
 * The human order number (KARTI-XXXXXX) is not authorization. The token
 * is DERIVED deterministically per idempotency key:
 *
 *   token = HMAC-SHA256(RECEIPT_TOKEN_SECRET, "karti-receipt-v1:<key>")
 *
 * Why deterministic: only `receipt_token_hash` is stored (never
 * plaintext), so a lost-response retry cannot recover the original
 * random token — but it CAN re-derive the same one. The commit-then-
 * retry and concurrent same-key cases therefore always resolve to a
 * WORKING receipt. Unforgeable without the server secret; the stored
 * SHA-256 adds a second layer if the database leaks. The raw token
 * travels to the browser once (success URL) and is never logged.
 */
import "server-only";

import { createHash, createHmac } from "node:crypto";
import { getReceiptTokenSecret } from "@/lib/env-server";

const RECEIPT_TOKEN_DOMAIN = "karti-receipt-v1:";

export function deriveReceiptToken(idempotencyKey: string): string {
  return createHmac("sha256", getReceiptTokenSecret())
    .update(`${RECEIPT_TOKEN_DOMAIN}${idempotencyKey}`, "utf8")
    .digest("hex");
}

export function hashReceiptToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isReceiptTokenShape(token: unknown): token is string {
  return typeof token === "string" && /^[0-9a-f]{64}$/.test(token);
}
