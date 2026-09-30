/**
 * Durable public rate limiting (Phase 6).
 *
 * Replaces the Phase 2 per-instance in-memory bucket, which serverless
 * instances bypass. Abuse keys are derived server-side as
 * HMAC-SHA256(RATE_LIMIT_SECRET, "<normalized-ip>:<action>") so no raw IP
 * or PII ever reaches the database — only the 64-hex key hash is stored in
 * `public.rate_limits` via the atomic `check_rate_limit` RPC (fixed-window
 * bucket, single-statement upsert, opportunistic bounded cleanup).
 *
 * Limits (unchanged from Phase 2): orders 5 / 10 min, inquiries 10 / 10 min.
 * Fail-safe: RPC errors throw so callers map to UNAVAILABLE (fail closed)
 * instead of silently skipping abuse protection.
 */
import "server-only";

import { createHmac } from "node:crypto";
import { getRateLimitSecret } from "@/lib/env-server";
import { createOrderWriterClient } from "@/lib/supabase/orderWriter";

export const RATE_LIMIT_WINDOW_SECS = 600;
export const ORDER_RATE_LIMIT_MAX = 5;
export const INQUIRY_RATE_LIMIT_MAX = 10;

export type PublicRateLimitAction = "order" | "inquiry";

export type RateLimitVerdict = { allowed: true } | { allowed: false; retryAfterMs: number };

/** Non-reversible abuse key: HMAC(secret, normalized-IP + action). Never logged. */
export function deriveRateLimitKeyHash(ip: string, action: PublicRateLimitAction): string {
  const normalized = ip.trim().toLowerCase();
  return createHmac("sha256", getRateLimitSecret())
    .update(`${normalized}:${action}`, "utf8")
    .digest("hex");
}

function parseVerdict(data: unknown): RateLimitVerdict {
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (record.allowed === true) return { allowed: true };
    const retrySecs =
      typeof record.retry_after_secs === "number" && Number.isFinite(record.retry_after_secs)
        ? Math.max(1, Math.floor(record.retry_after_secs))
        : 60;
    return { allowed: false, retryAfterMs: retrySecs * 1000 };
  }
  throw new Error("check_rate_limit returned an unexpected shape");
}

/**
 * Atomic increment-and-check through the narrow order-writer client
 * (service_role, RPC-only per ADR-071). Throws on transport/RPC failure
 * so callers fail closed.
 */
export async function checkPublicRateLimit(
  action: PublicRateLimitAction,
  ip: string,
): Promise<RateLimitVerdict> {
  const keyHash = deriveRateLimitKeyHash(ip, action);
  const max = action === "order" ? ORDER_RATE_LIMIT_MAX : INQUIRY_RATE_LIMIT_MAX;
  const writer = createOrderWriterClient();
  const { data, error } = await writer.rpc("check_rate_limit", {
    p_key_hash: keyHash,
    p_action: action,
    p_window_secs: RATE_LIMIT_WINDOW_SECS,
    p_max: max,
  });
  if (error) throw new Error("check_rate_limit RPC failed");
  return parseVerdict(data);
}
