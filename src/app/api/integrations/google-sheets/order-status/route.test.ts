import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  handleOrderStatusWebhook,
  resetSheetsWebhookRateLimitForTests,
  type OrderStatusWebhookDeps,
} from "./route";

const BODY = JSON.stringify({
  orderId: "123e4567-e89b-12d3-a456-426614174000",
  orderNumber: "KARTI-000123",
  field: "order_status",
  value: "CONFIRMED",
  changedAt: "2026-10-08T00:00:00.000Z",
  nonce: "route-test-nonce-1",
});

function validDeps(): Required<OrderStatusWebhookDeps> {
  return {
    verify: vi.fn<NonNullable<OrderStatusWebhookDeps["verify"]>>(() => ({
      ok: true as const,
      timestampMs: Date.now(),
    })),
    claim: vi.fn<NonNullable<OrderStatusWebhookDeps["claim"]>>(async () => true),
    apply: vi.fn<NonNullable<OrderStatusWebhookDeps["apply"]>>(async () => ({
      ok: true as const,
      orderStatus: "CONFIRMED",
      paymentStatus: "PENDING",
      fulfillmentStatus: "READY",
    })),
  };
}

beforeEach(() => {
  process.env.DELIVERY_SHEETS_ENABLED = "true";
  process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
  process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET = "route-test-apps-secret-32-chars-minimum!";
  process.env.DELIVERY_SHEETS_WEBHOOK_SECRET = "route-test-secret-with-at-least-32-chars!!";
  process.env.CRON_SECRET = "route-test-cron-16";
  resetSheetsWebhookRateLimitForTests();
});

afterEach(() => {
  delete process.env.DELIVERY_SHEETS_ENABLED;
  delete process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL;
  delete process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET;
  delete process.env.DELIVERY_SHEETS_WEBHOOK_SECRET;
  delete process.env.CRON_SECRET;
});

describe("order-status webhook route", () => {
  it("returns 503 when the integration is disabled", async () => {
    delete process.env.DELIVERY_SHEETS_ENABLED;
    const outcome = await handleOrderStatusWebhook(BODY, "ts", "sig", validDeps());
    expect(outcome).toEqual({ status: 503, body: { ok: false, code: "NOT_CONFIGURED" } });
  });

  it("accepts an authenticated request", async () => {
    const outcome = await handleOrderStatusWebhook(BODY, "ts", "sig", validDeps());
    expect(outcome.status).toBe(200);
    expect(outcome.body).toMatchObject({ ok: true, orderStatus: "CONFIRMED" });
  });

  it("rejects bad signatures with 401", async () => {
    const deps = validDeps();
    deps.verify = vi.fn<NonNullable<OrderStatusWebhookDeps["verify"]>>(() => ({
      ok: false as const,
      code: "INVALID_SIGNATURE" as const,
    }));
    const outcome = await handleOrderStatusWebhook(BODY, "ts", "bad", deps);
    expect(outcome).toEqual({ status: 401, body: { ok: false, code: "INVALID_SIGNATURE" } });
    expect(deps.apply).not.toHaveBeenCalled();
  });

  it("rejects expired timestamps with 401", async () => {
    const deps = validDeps();
    deps.verify = vi.fn<NonNullable<OrderStatusWebhookDeps["verify"]>>(() => ({
      ok: false as const,
      code: "EXPIRED" as const,
    }));
    const outcome = await handleOrderStatusWebhook(BODY, "old", "sig", deps);
    expect(outcome.status).toBe(401);
  });

  it("rejects replayed nonces with 409", async () => {
    const deps = validDeps();
    deps.claim = vi.fn<NonNullable<OrderStatusWebhookDeps["claim"]>>(async () => false);
    const outcome = await handleOrderStatusWebhook(BODY, "ts", "sig", deps);
    expect(outcome).toEqual({ status: 409, body: { ok: false, code: "REPLAY" } });
    expect(deps.apply).not.toHaveBeenCalled();
  });

  it("maps domain rejections to safe HTTP codes", async () => {
    const deps = validDeps();
    deps.apply = vi.fn<NonNullable<OrderStatusWebhookDeps["apply"]>>(async () => ({
      ok: false as const,
      code: "INVALID_TRANSITION",
      message: "nope",
    }));
    expect((await handleOrderStatusWebhook(BODY, "ts", "sig", deps)).status).toBe(422);
    deps.apply = vi.fn<NonNullable<OrderStatusWebhookDeps["apply"]>>(async () => ({
      ok: false as const,
      code: "NOT_FOUND",
      message: "nope",
    }));
    expect((await handleOrderStatusWebhook(BODY, "ts", "sig", deps)).status).toBe(404);
    deps.apply = vi.fn<NonNullable<OrderStatusWebhookDeps["apply"]>>(async () => ({
      ok: false as const,
      code: "CONFLICT",
      message: "nope",
    }));
    expect((await handleOrderStatusWebhook(BODY, "ts", "sig", deps)).status).toBe(409);
  });

  it("rejects malformed JSON with 400", async () => {
    const outcome = await handleOrderStatusWebhook("not json", "ts", "sig", validDeps());
    expect(outcome.status).toBe(400);
  });

  it("rate-limits floods with 429", async () => {
    const deps = validDeps();
    let last = { status: 200, body: {} };
    for (let i = 0; i < 130; i += 1) {
      last = await handleOrderStatusWebhook(BODY, "ts", "sig", deps);
    }
    expect(last.status).toBe(429);
  });
});
