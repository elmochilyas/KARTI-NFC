/**
 * Sheet → Karti status application (server-only).
 *
 * Only whitelisted status fields/values (see types.ts) can arrive here —
 * money, identity, address, notes, and order lifecycle states outside the
 * delivery scope are impossible by construction. Every change is validated
 * against the existing domain transition maps FIRST, then applied through
 * the narrow service_role-only `sheets_apply_*` RPCs (expected-state
 * guarded, SYSTEM actor, GOOGLE_SHEETS audit metadata). On success the row
 * is synced back to the Sheet so e.g. DELIVERED → COMPLETED auto-sync is
 * immediately visible to delivery operators.
 */
import "server-only";

import { z } from "zod";
import {
  canTransitionFulfillment,
  canTransitionOrder,
  canTransitionPayment,
  isFulfillmentStatus,
  isOrderStatus,
  isPaymentStatus,
} from "@/domain/orders";
import type { FulfillmentStatus, OrderStatus, PaymentStatus } from "@/domain/orders";
import { createDeliverySyncClient } from "@/lib/supabase/deliverySync";
import { isSheetWritableValue, isWebhookField, WEBHOOK_FIELDS, type WebhookField } from "./types";
import { isWebhookNonceShape, SHEETS_WEBHOOK_NONCE_TTL_MS } from "./signatures";
import { syncOrderToDeliverySheet, type SyncDeps } from "./sync";

export const webhookPayloadSchema = z.strictObject({
  orderId: z.uuid(),
  orderNumber: z.string().regex(/^KARTI-[0-9]{6}$/),
  field: z.enum(WEBHOOK_FIELDS),
  value: z.string().min(1).max(64),
  changedAt: z.iso.datetime(),
  nonce: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

export type WebhookApplyResult =
  | {
      ok: true;
      orderStatus: string;
      paymentStatus: string;
      fulfillmentStatus: string;
    }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): WebhookApplyResult {
  return { ok: false, code, message };
}

type CurrentOrderState = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
};

export type WebhookDeps = SyncDeps & {
  loadOrderState?: (orderId: string) => Promise<CurrentOrderState | null>;
  applyRpc?: (
    field: WebhookField,
    args: { orderId: string; expected: string; target: string; changedAt: string },
  ) => Promise<{ ok: boolean; code?: string; status?: string }>;
  claimNonce?: (nonce: string, expiresAtIso: string) => Promise<boolean>;
};

async function defaultLoadOrderState(orderId: string): Promise<CurrentOrderState | null> {
  const db = createDeliverySyncClient();
  const { data } = await db
    .from("orders")
    .select("id, order_number, status, payment_status, fulfillment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    orderNumber: data.order_number,
    status: data.status,
    paymentStatus: data.payment_status,
    fulfillmentStatus: data.fulfillment_status,
  };
}

function parseRpcEnvelope(raw: unknown): { ok: boolean; code?: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false };
  const record = raw as Record<string, unknown>;
  if (record.ok !== true) {
    return { ok: false, code: typeof record.code === "string" ? record.code : "UNKNOWN" };
  }
  return { ok: true };
}

async function defaultApplyRpc(
  field: WebhookField,
  args: { orderId: string; expected: string; target: string; changedAt: string },
): Promise<{ ok: boolean; code?: string; status?: string }> {
  const db = createDeliverySyncClient();
  const fn =
    field === "order_status"
      ? "sheets_apply_order_status"
      : field === "payment_status"
        ? "sheets_apply_payment_status"
        : "sheets_apply_fulfillment_status";
  const rpcArgs =
    field === "order_status"
      ? {
          p_order_id: args.orderId,
          p_expected_status: args.expected,
          p_target_status: args.target,
          p_changed_at: args.changedAt,
        }
      : field === "payment_status"
        ? {
            p_order_id: args.orderId,
            p_expected_payment: args.expected,
            p_target_payment: args.target,
            p_changed_at: args.changedAt,
          }
        : {
            p_order_id: args.orderId,
            p_expected_fulfillment: args.expected,
            p_target_fulfillment: args.target,
            p_changed_at: args.changedAt,
          };
  const { data, error } = await db.rpc(fn, rpcArgs as never);
  if (error || !data) return { ok: false, code: "UNKNOWN" };
  return parseRpcEnvelope(data);
}

/**
 * Durably claim a webhook nonce (cross-instance replay protection).
 * Returns false when the nonce was already consumed.
 */
export async function claimWebhookNonce(nonce: string, nowMs?: number): Promise<boolean> {
  if (!isWebhookNonceShape(nonce)) return false;
  const now = nowMs ?? Date.now();
  const db = createDeliverySyncClient();
  // Opportunistic bounded cleanup of expired nonces (no cron needed).
  await db
    .from("delivery_sheet_webhook_nonces")
    .delete()
    .lt("expires_at", new Date(now).toISOString());
  const { error } = await db.from("delivery_sheet_webhook_nonces").insert({
    nonce,
    expires_at: new Date(now + SHEETS_WEBHOOK_NONCE_TTL_MS).toISOString(),
  });
  // Unique violation ⇒ replay.
  return !error;
}

/**
 * Validate + apply one Sheet status edit. Pure domain checks first (no DB
 * touch on predictable rejections), then the guarded RPC, then sync-back.
 */
export async function applySheetStatusUpdate(
  rawPayload: unknown,
  deps?: WebhookDeps,
): Promise<WebhookApplyResult> {
  const parsed = webhookPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) return fail("VALIDATION", "The status change was rejected.");
  const payload = parsed.data;
  if (!isWebhookField(payload.field))
    return fail("FORBIDDEN_FIELD", "This field cannot be changed from the Sheet.");
  if (!isSheetWritableValue(payload.field, payload.value)) {
    return fail("FORBIDDEN_FIELD", "This value cannot be set from the Sheet.");
  }

  const loadOrderState = deps?.loadOrderState ?? defaultLoadOrderState;
  const applyRpc = deps?.applyRpc ?? defaultApplyRpc;
  let current: CurrentOrderState | null;
  try {
    current = await loadOrderState(payload.orderId);
  } catch {
    return fail("UNAVAILABLE", "Could not verify the order. Please try again.");
  }
  if (!current) return fail("NOT_FOUND", "Order not found.");
  if (current.orderNumber !== payload.orderNumber) {
    // Row mismatch (sorted/moved Sheet rows must never update the wrong order).
    return fail("ORDER_MISMATCH", "Order ID and order number do not match.");
  }
  if (current.status === "COMPLETED" || current.status === "CANCELLED") {
    return fail("INVALID_TRANSITION", "This order is closed and cannot be changed from the Sheet.");
  }

  // Domain transition pre-check (SQL re-enforces inside the RPC).
  if (payload.field === "order_status") {
    if (!isOrderStatus(current.status) || !isOrderStatus(payload.value)) {
      return fail("INVALID_TRANSITION", "This status change is not allowed.");
    }
    const from = current.status as OrderStatus;
    const to = payload.value as OrderStatus;
    // Sheet scope: CONFIRMED (CONTACTED → CONFIRMED) or CANCELLED only.
    if (to === "CONFIRMED" && from !== "CONTACTED") {
      return fail("INVALID_TRANSITION", "Only contacted orders can be confirmed from the Sheet.");
    }
    if (to === "CANCELLED" && !canTransitionOrder(from, "CANCELLED")) {
      return fail("INVALID_TRANSITION", "This order cannot be cancelled from its current state.");
    }
  } else if (payload.field === "payment_status") {
    if (!isPaymentStatus(current.paymentStatus) || !isPaymentStatus(payload.value)) {
      return fail("INVALID_TRANSITION", "This payment change is not allowed.");
    }
    if (
      !canTransitionPayment(current.paymentStatus as PaymentStatus, payload.value as PaymentStatus)
    ) {
      return fail("INVALID_TRANSITION", "This payment change is not allowed.");
    }
  } else {
    if (!isFulfillmentStatus(current.fulfillmentStatus) || !isFulfillmentStatus(payload.value)) {
      return fail("INVALID_TRANSITION", "This delivery change is not allowed.");
    }
    if (
      !canTransitionFulfillment(
        current.fulfillmentStatus as FulfillmentStatus,
        payload.value as FulfillmentStatus,
      )
    ) {
      return fail("INVALID_TRANSITION", "This delivery change is not allowed.");
    }
  }

  const expected =
    payload.field === "order_status"
      ? current.status
      : payload.field === "payment_status"
        ? current.paymentStatus
        : current.fulfillmentStatus;
  let applied: { ok: boolean; code?: string; status?: string };
  try {
    applied = await applyRpc(payload.field, {
      orderId: payload.orderId,
      expected,
      target: payload.value,
      changedAt: payload.changedAt,
    });
  } catch {
    return fail("UNAVAILABLE", "Could not update the order. Please try again.");
  }
  if (!applied.ok) {
    if (applied.code === "CONFLICT") {
      return fail("CONFLICT", "The order changed in Karti. Refresh the Sheet row and try again.");
    }
    if (applied.code === "NOT_FOUND") return fail("NOT_FOUND", "Order not found.");
    return fail("INVALID_TRANSITION", "This status change is not allowed.");
  }

  // Sync-back so Karti-side effects (e.g. DELIVERED → COMPLETED) land in
  // the Sheet immediately. Best-effort: the order change is already safe.
  try {
    await syncOrderToDeliverySheet(payload.orderId, deps);
  } catch {
    // Recorded inside sync; never fail the accepted webhook for it.
  }

  const next = {
    orderStatus: payload.field === "order_status" ? payload.value : current.status,
    paymentStatus: payload.field === "payment_status" ? payload.value : current.paymentStatus,
    fulfillmentStatus:
      payload.field === "fulfillment_status" ? payload.value : current.fulfillmentStatus,
  };
  if (payload.field === "fulfillment_status" && payload.value === "DELIVERED") {
    next.orderStatus = "COMPLETED";
  }
  return { ok: true, ...next };
}
