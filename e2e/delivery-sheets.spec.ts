/**
 * Delivery-Sheet webhook/retry endpoint hardening (hermetic — no Google,
 * no database writes, no credentials).
 *
 * - Unauthenticated webhook calls are rejected (machine-to-machine only).
 * - Malformed/forged calls never reach the domain layer.
 * - The retry sweep requires the CRON_SECRET bearer (never an admin session).
 */
import { expect, test } from "@playwright/test";

const WEBHOOK = "/api/integrations/google-sheets/order-status";
const RETRY = "/api/integrations/google-sheets/retry";

test("webhook rejects missing/invalid/forged auth without touching orders", async ({ request }) => {
  const noAuth = await request.post(WEBHOOK, { data: { ping: 1 } });
  expect(noAuth.status()).toBe(401);

  const forged = await request.post(WEBHOOK, {
    headers: { "X-Karti-Timestamp": String(Date.now()), "X-Karti-Signature": "0".repeat(64) },
    data: {
      orderId: "123e4567-e89b-12d3-a456-426614174000",
      orderNumber: "KARTI-000123",
      field: "order_status",
      value: "CONFIRMED",
      changedAt: new Date().toISOString(),
      nonce: "e2e-nonce-00000001",
    },
  });
  expect(forged.status()).toBe(401);
});

test("webhook rejects expired timestamps", async ({ request }) => {
  const res = await request.post(WEBHOOK, {
    headers: {
      "X-Karti-Timestamp": String(Date.now() - 10 * 60 * 1000),
      "X-Karti-Signature": "0".repeat(64),
    },
    data: { nonce: "e2e-nonce-00000002" },
  });
  expect(res.status()).toBe(401);
});

test("retry sweep requires the cron secret", async ({ request }) => {
  expect((await request.get(RETRY)).status()).toBe(401);
  const bad = await request.get(RETRY, { headers: { Authorization: "Bearer wrong" } });
  expect(bad.status()).toBe(401);
});
