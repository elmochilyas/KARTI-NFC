import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  applySheetStatusUpdate,
  claimWebhookNonce,
  webhookPayloadSchema,
  type WebhookDeps,
} from "./webhook";

const ORDER_ID = "123e4567-e89b-12d3-a456-426614174000";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    orderId: ORDER_ID,
    orderNumber: "KARTI-000123",
    field: "order_status",
    value: "CONFIRMED",
    changedAt: "2026-10-08T00:00:00.000Z",
    nonce: "test-nonce-123456",
    ...overrides,
  };
}

function deps(
  state: { status: string; paymentStatus: string; fulfillmentStatus: string } = {
    status: "CONTACTED",
    paymentStatus: "PENDING",
    fulfillmentStatus: "READY",
  },
): WebhookDeps & { applyRpc: ReturnType<typeof vi.fn> } {
  const applyRpc = vi.fn(async () => ({ ok: true as const }));
  return {
    loadOrderState: async () => ({
      id: ORDER_ID,
      orderNumber: "KARTI-000123",
      ...state,
    }),
    applyRpc,
  };
}

describe("webhook payload validation", () => {
  it("rejects arbitrary fields and malformed bodies", () => {
    expect(webhookPayloadSchema.safeParse(payload({ field: "total_minor" })).success).toBe(false);
    expect(webhookPayloadSchema.safeParse(payload({ field: "customer_name" })).success).toBe(false);
    expect(webhookPayloadSchema.safeParse(payload({ value: "" })).success).toBe(false);
    expect(webhookPayloadSchema.safeParse(payload({ orderId: "not-a-uuid" })).success).toBe(false);
    expect(webhookPayloadSchema.safeParse(payload({ nonce: "x" })).success).toBe(false);
    expect(webhookPayloadSchema.safeParse(payload({ extra: 1 })).success).toBe(false);
  });
});

describe("applySheetStatusUpdate domain rules", () => {
  it("accepts CONTACTED → CONFIRMED via the guarded RPC", async () => {
    const d = deps();
    const result = await applySheetStatusUpdate(payload(), d);
    expect(result).toMatchObject({ ok: true, orderStatus: "CONFIRMED" });
    expect(d.applyRpc).toHaveBeenCalledWith("order_status", {
      orderId: ORDER_ID,
      expected: "CONTACTED",
      target: "CONFIRMED",
      changedAt: "2026-10-08T00:00:00.000Z",
    });
  });

  it("accepts CANCELLED from an open state", async () => {
    const d = deps({ status: "NEW", paymentStatus: "PENDING", fulfillmentStatus: "NOT_STARTED" });
    const result = await applySheetStatusUpdate(payload({ value: "CANCELLED" }), d);
    expect(result).toMatchObject({ ok: true, orderStatus: "CANCELLED" });
  });

  it("rejects NEW → CONFIRMED skips (no dropdown bypass)", async () => {
    const d = deps({ status: "NEW", paymentStatus: "PENDING", fulfillmentStatus: "NOT_STARTED" });
    const result = await applySheetStatusUpdate(payload(), d);
    expect(result).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });
    expect(d.applyRpc).not.toHaveBeenCalled();
  });

  it("never lets the Sheet write CONTACTED/IN_PROGRESS/COMPLETED", async () => {
    const d = deps();
    for (const value of ["CONTACTED", "IN_PROGRESS", "COMPLETED", "NEW"]) {
      const result = await applySheetStatusUpdate(payload({ value }), d);
      expect(result).toMatchObject({ ok: false, code: "FORBIDDEN_FIELD" });
    }
    expect(d.applyRpc).not.toHaveBeenCalled();
  });

  it("rejects row mismatches (sorted Sheet rows never hit the wrong order)", async () => {
    const d = deps();
    const result = await applySheetStatusUpdate(payload({ orderNumber: "KARTI-000999" }), d);
    expect(result).toMatchObject({ ok: false, code: "ORDER_MISMATCH" });
    expect(d.applyRpc).not.toHaveBeenCalled();
  });

  it("returns safe NOT_FOUND for unknown orders", async () => {
    const result = await applySheetStatusUpdate(payload(), {
      loadOrderState: async () => null,
      applyRpc: vi.fn(),
    });
    expect(result).toEqual({ ok: false, code: "NOT_FOUND", message: "Order not found." });
  });

  it("refuses changes on closed orders", async () => {
    const d = deps({ status: "COMPLETED", paymentStatus: "PAID", fulfillmentStatus: "DELIVERED" });
    const result = await applySheetStatusUpdate(
      payload({ field: "fulfillment_status", value: "RETURNED" }),
      d,
    );
    expect(result).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });
    expect(d.applyRpc).not.toHaveBeenCalled();
  });

  it("enforces payment rules (PENDING→PAID ok, PENDING→REFUNDED rejected)", async () => {
    const d = deps();
    const okResult = await applySheetStatusUpdate(
      payload({ field: "payment_status", value: "PAID" }),
      d,
    );
    expect(okResult).toMatchObject({ ok: true, paymentStatus: "PAID" });
    const bad = await applySheetStatusUpdate(
      payload({ field: "payment_status", value: "REFUNDED" }),
      deps(),
    );
    expect(bad).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });
  });

  it("supports the delivery flow READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED", async () => {
    const flow: Array<[string, string]> = [
      ["READY", "PICKED_UP"],
      ["PICKED_UP", "OUT_FOR_DELIVERY"],
      ["OUT_FOR_DELIVERY", "DELIVERED"],
    ];
    for (const [from, to] of flow) {
      const d = deps({ status: "IN_PROGRESS", paymentStatus: "PENDING", fulfillmentStatus: from });
      const result = await applySheetStatusUpdate(
        payload({ field: "fulfillment_status", value: to }),
        d,
      );
      expect(result.ok).toBe(true);
    }
    // DELIVERED auto-completes the visible order status.
    const d = deps({
      status: "IN_PROGRESS",
      paymentStatus: "PAID",
      fulfillmentStatus: "OUT_FOR_DELIVERY",
    });
    const delivered = await applySheetStatusUpdate(
      payload({ field: "fulfillment_status", value: "DELIVERED" }),
      d,
    );
    expect(delivered).toMatchObject({
      ok: true,
      orderStatus: "COMPLETED",
      fulfillmentStatus: "DELIVERED",
    });
  });

  it("rejects backward delivery jumps and SHIPPED writes from the Sheet scope", async () => {
    const d = deps({
      status: "IN_PROGRESS",
      paymentStatus: "PENDING",
      fulfillmentStatus: "DELIVERED",
    });
    const back = await applySheetStatusUpdate(
      payload({ field: "fulfillment_status", value: "READY" }),
      d,
    );
    expect(back).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });
    // SHIPPED is compatibility-only: never writable from the Sheet.
    const shipped = await applySheetStatusUpdate(
      payload({ field: "fulfillment_status", value: "SHIPPED" }),
      deps({ status: "IN_PROGRESS", paymentStatus: "PENDING", fulfillmentStatus: "READY" }),
    );
    expect(shipped).toMatchObject({ ok: false, code: "FORBIDDEN_FIELD" });
  });

  it("maps RPC CONFLICT to a safe retryable error", async () => {
    const applyRpc = vi.fn(async () => ({ ok: false as const, code: "CONFLICT" }));
    const result = await applySheetStatusUpdate(payload(), {
      loadOrderState: async () => ({
        id: ORDER_ID,
        orderNumber: "KARTI-000123",
        status: "CONTACTED",
        paymentStatus: "PENDING",
        fulfillmentStatus: "READY",
      }),
      applyRpc,
    });
    expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
  });
});

describe("claimWebhookNonce shape gate", () => {
  it("rejects malformed nonces without touching the database", async () => {
    await expect(claimWebhookNonce("x")).resolves.toBe(false);
    await expect(claimWebhookNonce("")).resolves.toBe(false);
  });
});
