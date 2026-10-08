/**
 * Sheet → Karti status webhook (machine-to-machine, no browser session).
 *
 * Authentication: HMAC-SHA256(secret, timestamp + "." + rawBody) via
 * X-Karti-Timestamp / X-Karti-Signature (constant-time compare, ≤5 min
 * skew) + durable PostgreSQL nonce replay protection. Only whitelisted
 * status fields/values reach the domain layer, which re-validates
 * transitions and writes through the service_role-only sheets_apply_* RPCs.
 */

import { getDeliverySheetsConfig, getSheetsWebhookSecret } from "@/lib/env-server";
import {
  applySheetStatusUpdate,
  claimWebhookNonce,
} from "@/features/integrations/google-sheets/webhook";
import { verifySheetsWebhookSignature } from "@/features/integrations/google-sheets/signatures";

export const dynamic = "force-dynamic";

// Modest per-instance rate limit (HMAC is the primary protection —
// documented tradeoff: each serverless instance holds its own bucket).
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_GLOBAL = 120;
const RATE_MAX_PER_ORDER = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string, max: number, nowMs: number): boolean {
  const current = buckets.get(key);
  if (!current || nowMs >= current.resetAt) {
    if (buckets.size > 1000) buckets.clear();
    buckets.set(key, { count: 1, resetAt: nowMs + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > max;
}

/** Test-only reset for the module-level buckets. */
export function resetSheetsWebhookRateLimitForTests(): void {
  buckets.clear();
}

export type OrderStatusWebhookDeps = {
  verify?: typeof verifySheetsWebhookSignature;
  claim?: typeof claimWebhookNonce;
  apply?: typeof applySheetStatusUpdate;
};

type RouteDeps = OrderStatusWebhookDeps;

export async function handleOrderStatusWebhook(
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  deps?: RouteDeps,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const nowMs = Date.now();
  if (rateLimited("global", RATE_MAX_GLOBAL, nowMs)) {
    return { status: 429, body: { ok: false, code: "RATE_LIMITED" } };
  }

  if (!getDeliverySheetsConfig().enabled) {
    return { status: 503, body: { ok: false, code: "NOT_CONFIGURED" } };
  }

  let secret: string;
  try {
    secret = getSheetsWebhookSecret();
  } catch {
    return { status: 503, body: { ok: false, code: "NOT_CONFIGURED" } };
  }

  const verify = deps?.verify ?? verifySheetsWebhookSignature;
  const verdict = verify({ secret, timestampHeader, signatureHeader, rawBody, nowMs });
  if (!verdict.ok) {
    return { status: 401, body: { ok: false, code: verdict.code } };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return { status: 400, body: { ok: false, code: "VALIDATION" } };
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { status: 400, body: { ok: false, code: "VALIDATION" } };
  }
  const orderId = (payload as Record<string, unknown>).orderId;
  if (typeof orderId === "string" && rateLimited(`order:${orderId}`, RATE_MAX_PER_ORDER, nowMs)) {
    return { status: 429, body: { ok: false, code: "RATE_LIMITED" } };
  }

  const nonce = (payload as Record<string, unknown>).nonce;
  if (typeof nonce !== "string") {
    return { status: 400, body: { ok: false, code: "VALIDATION" } };
  }
  const claim = deps?.claim ?? claimWebhookNonce;
  let claimed: boolean;
  try {
    claimed = await claim(nonce, nowMs);
  } catch {
    return { status: 503, body: { ok: false, code: "UNAVAILABLE" } };
  }
  if (!claimed) {
    return { status: 409, body: { ok: false, code: "REPLAY" } };
  }

  const apply = deps?.apply ?? applySheetStatusUpdate;
  const result = await apply(payload);
  if (result.ok) {
    return {
      status: 200,
      body: {
        ok: true,
        orderStatus: result.orderStatus,
        paymentStatus: result.paymentStatus,
        fulfillmentStatus: result.fulfillmentStatus,
      },
    };
  }
  const httpStatus =
    result.code === "NOT_FOUND"
      ? 404
      : result.code === "CONFLICT" || result.code === "ORDER_MISMATCH"
        ? 409
        : result.code === "INVALID_TRANSITION" || result.code === "FORBIDDEN_FIELD"
          ? 422
          : result.code === "UNAVAILABLE"
            ? 503
            : 400;
  return { status: httpStatus, body: { ok: false, code: result.code } };
}

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const outcome = await handleOrderStatusWebhook(
    rawBody,
    req.headers.get("x-karti-timestamp"),
    req.headers.get("x-karti-signature"),
  );
  return Response.json(outcome.body, { status: outcome.status });
}
