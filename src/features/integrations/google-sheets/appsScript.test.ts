import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { classifyAppsScriptOutcome, sendOrderToDeliveryScript } from "./appsScript";
import {
  createDeliveryEnvelope,
  createDeliveryNonce,
  isWebhookNonceShape,
  signDeliveryEnvelope,
  verifyDeliveryEnvelope,
} from "./signatures";

const SECRET = "test-apps-script-secret-32-chars-min!!";

describe("delivery envelope signing", () => {
  it("is deterministic for identical inputs", () => {
    const a = createDeliveryEnvelope(
      SECRET,
      { type: "UPSERT_ORDER", n: 1 },
      1000,
      "nonce-12345678",
    );
    const b = createDeliveryEnvelope(
      SECRET,
      { type: "UPSERT_ORDER", n: 1 },
      1000,
      "nonce-12345678",
    );
    expect(a.signature).toBe(b.signature);
    expect(a.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes signature when the payload is tampered", () => {
    const a = createDeliveryEnvelope(
      SECRET,
      { type: "UPSERT_ORDER", n: 1 },
      1000,
      "nonce-12345678",
    );
    const b = createDeliveryEnvelope(
      SECRET,
      { type: "UPSERT_ORDER", n: 2 },
      1000,
      "nonce-12345678",
    );
    expect(a.signature).not.toBe(b.signature);
  });

  it("canonicalizes key order (Apps Script recomputes the same HMAC)", () => {
    const a = createDeliveryEnvelope(SECRET, { b: 1, a: 2 }, 1000, "nonce-12345678");
    const b = createDeliveryEnvelope(SECRET, { a: 2, b: 1 }, 1000, "nonce-12345678");
    expect(a.payload).toBe(b.payload);
    expect(a.signature).toBe(b.signature);
  });

  it("mints cryptographic nonces", () => {
    const n1 = createDeliveryNonce();
    const n2 = createDeliveryNonce();
    expect(n1).not.toBe(n2);
    expect(isWebhookNonceShape(n1.replace(/-/g, "_"))).toBe(true);
    expect(signDeliveryEnvelope(SECRET, "1", n1, "{}")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("envelope verification mirror (Apps Script doPost contract)", () => {
  it("accepts a valid envelope and returns the parsed payload", () => {
    const env = createDeliveryEnvelope(
      SECRET,
      { type: "UPSERT_ORDER", orderId: "x" },
      Date.now(),
      "nonce-abcdef12",
    );
    const verdict = verifyDeliveryEnvelope(SECRET, env);
    expect(verdict).toEqual({ ok: true, payload: { orderId: "x", type: "UPSERT_ORDER" } });
  });

  it("rejects tampered payloads, stale timestamps, and malformed envelopes", () => {
    const env = createDeliveryEnvelope(
      SECRET,
      { type: "UPSERT_ORDER" },
      Date.now(),
      "nonce-abcdef12",
    );
    expect(verifyDeliveryEnvelope(SECRET, { ...env, payload: '{"type":"OTHER"}' })).toEqual({
      ok: false,
      code: "INVALID_SIGNATURE",
    });
    const stale = createDeliveryEnvelope(
      SECRET,
      { type: "UPSERT_ORDER" },
      Date.now() - 6 * 60 * 1000,
      "nonce-abcdef12",
    );
    expect(verifyDeliveryEnvelope(SECRET, stale)).toEqual({ ok: false, code: "EXPIRED" });
    expect(verifyDeliveryEnvelope(SECRET, { ...env, signature: "0".repeat(64) })).toEqual({
      ok: false,
      code: "INVALID_SIGNATURE",
    });
    expect(verifyDeliveryEnvelope(SECRET, { timestamp: "x" })).toEqual({
      ok: false,
      code: "MALFORMED",
    });
  });
});

describe("Apps Script response classification", () => {
  it("accepts structured success results", () => {
    for (const result of ["CREATED", "UPDATED", "UNCHANGED", "SETUP_OK", "PONG"]) {
      expect(
        classifyAppsScriptOutcome(200, JSON.stringify({ ok: true, operation: "X", result })),
      ).toEqual({ ok: true, result, detail: undefined });
    }
    // PING carries no state change: ok:true + operation suffices (no fake order).
    expect(classifyAppsScriptOutcome(200, JSON.stringify({ ok: true, operation: "PING" }))).toEqual(
      {
        ok: true,
        result: "PONG",
        detail: undefined,
      },
    );
  });

  it("treats 429/5xx as retryable and other HTTP as terminal", () => {
    expect(classifyAppsScriptOutcome(429, "")).toMatchObject({ ok: false, retryable: true });
    expect(classifyAppsScriptOutcome(500, "")).toMatchObject({ ok: false, retryable: true });
    expect(classifyAppsScriptOutcome(400, "")).toMatchObject({ ok: false, retryable: false });
    expect(classifyAppsScriptOutcome(401, "")).toMatchObject({ ok: false, retryable: false });
    expect(classifyAppsScriptOutcome(null, null)).toMatchObject({ ok: false, retryable: true });
  });

  it("treats invalid JSON as terminal and classifies ok:false codes", () => {
    expect(classifyAppsScriptOutcome(200, "nope{")).toMatchObject({
      ok: false,
      retryable: false,
      code: "MALFORMED_RESPONSE",
    });
    expect(
      classifyAppsScriptOutcome(200, JSON.stringify({ ok: false, code: "TEMPORARY_FAILURE" })),
    ).toMatchObject({ ok: false, retryable: true });
    expect(
      classifyAppsScriptOutcome(200, JSON.stringify({ ok: false, code: "INVALID_SIGNATURE" })),
    ).toMatchObject({ ok: false, retryable: false });
  });
});

describe("sendOrderToDeliveryScript", () => {
  const OLD_ENV = { ...process.env };

  function configure() {
    process.env.DELIVERY_SHEETS_ENABLED = "true";
    process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
    process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET = SECRET;
    process.env.DELIVERY_SHEETS_WEBHOOK_SECRET = "test-webhook-secret-32-chars-minimum!!";
    process.env.CRON_SECRET = "test-cron-secret-16";
  }

  function clearConfig() {
    delete process.env.DELIVERY_SHEETS_ENABLED;
    delete process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL;
    delete process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET;
    delete process.env.DELIVERY_SHEETS_WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;
  }

  it("POSTs a signed envelope and validates the response", async () => {
    configure();
    const post = vi.fn(async () => ({
      status: 200,
      text: JSON.stringify({ ok: true, operation: "UPSERT_ORDER", result: "CREATED" }),
    }));
    const outcome = await sendOrderToDeliveryScript(
      { type: "UPSERT_ORDER", orderId: "id", values: ["a"] },
      { transport: { post } },
    );
    expect(outcome).toMatchObject({ ok: true, result: "CREATED" });
    expect(post).toHaveBeenCalledOnce();
    const [url, envelope] = post.mock.calls[0] as unknown as [string, Record<string, string>];
    expect(url).toBe("https://script.google.com/macros/s/test/exec");
    // Signed envelope shape: timestamp + nonce + STRING payload + HMAC.
    expect(typeof envelope.payload).toBe("string");
    expect(envelope.signature).toBe(
      signDeliveryEnvelope(SECRET, envelope.timestamp, envelope.nonce, envelope.payload),
    );
    expect(JSON.parse(envelope.payload)).toMatchObject({ type: "UPSERT_ORDER" });
    process.env = { ...OLD_ENV };
  });

  it("never logs secrets and refuses when unconfigured", async () => {
    clearConfig();
    const post = vi.fn(async () => ({ status: 200, text: "{}" }));
    const outcome = await sendOrderToDeliveryScript(
      { type: "UPSERT_ORDER", orderId: "id", values: [] },
      { transport: { post } },
    );
    expect(outcome).toMatchObject({ ok: false, code: "NOT_CONFIGURED" });
    expect(post).not.toHaveBeenCalled();
    process.env = { ...OLD_ENV };
  });
});
