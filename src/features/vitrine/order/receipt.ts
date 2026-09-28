/**
 * Receipt-token utilities (server-only).
 *
 * The human order number (KARTI-XXXXXX) is not authorization. A
 * high-entropy token is minted per order; only its SHA-256 hash is
 * stored in `orders.receipt_token_hash`. The raw token travels to the
 * browser once (success URL) and is never logged or persisted.
 */
import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const RECEIPT_TOKEN_BYTES = 32;

export function generateReceiptToken(): string {
  return randomBytes(RECEIPT_TOKEN_BYTES).toString("hex");
}

export function hashReceiptToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isReceiptTokenShape(token: unknown): token is string {
  return typeof token === "string" && /^[0-9a-f]{64}$/.test(token);
}
