import { describe, expect, it } from "vitest";
import {
  isWebhookNonceShape,
  signSheetsWebhook,
  verifyBearerToken,
  verifySheetsWebhookSignature,
} from "./signatures";

const SECRET = "test-webhook-secret-with-at-least-32-chars!!";
const BODY = '{"orderId":"123e4567-e89b-12d3-a456-426614174000"}';

describe("webhook HMAC signatures", () => {
  it("accepts a valid signature", () => {
    const ts = String(Date.now());
    const sig = signSheetsWebhook(SECRET, ts, BODY);
    expect(
      verifySheetsWebhookSignature({
        secret: SECRET,
        timestampHeader: ts,
        signatureHeader: sig,
        rawBody: BODY,
      }).ok,
    ).toBe(true);
  });

  it("rejects missing/invalid signatures", () => {
    const ts = String(Date.now());
    expect(
      verifySheetsWebhookSignature({
        secret: SECRET,
        timestampHeader: null,
        signatureHeader: null,
        rawBody: BODY,
      }).ok,
    ).toBe(false);
    expect(
      verifySheetsWebhookSignature({
        secret: SECRET,
        timestampHeader: ts,
        signatureHeader: "deadbeef",
        rawBody: BODY,
      }).ok,
    ).toBe(false);
    // Wrong body ⇒ signature mismatch.
    const sig = signSheetsWebhook(SECRET, ts, BODY);
    expect(
      verifySheetsWebhookSignature({
        secret: SECRET,
        timestampHeader: ts,
        signatureHeader: sig,
        rawBody: `${BODY} `,
      }).ok,
    ).toBe(false);
    // Wrong secret ⇒ mismatch.
    expect(
      verifySheetsWebhookSignature({
        secret: `${SECRET}x`,
        timestampHeader: ts,
        signatureHeader: sig,
        rawBody: BODY,
      }).ok,
    ).toBe(false);
  });

  it("rejects expired timestamps (replay window ≤ 5 min)", () => {
    const old = String(Date.now() - 6 * 60 * 1000);
    const sig = signSheetsWebhook(SECRET, old, BODY);
    const verdict = verifySheetsWebhookSignature({
      secret: SECRET,
      timestampHeader: old,
      signatureHeader: sig,
      rawBody: BODY,
    });
    expect(verdict).toEqual({ ok: false, code: "EXPIRED" });
    expect(
      verifySheetsWebhookSignature({
        secret: SECRET,
        timestampHeader: "not-a-number",
        signatureHeader: sig,
        rawBody: BODY,
      }),
    ).toEqual({ ok: false, code: "INVALID_TIMESTAMP" });
  });
});

describe("nonce shape + cron bearer", () => {
  it("validates nonce shape", () => {
    expect(isWebhookNonceShape("abc123-_XYZ9")).toBe(true);
    expect(isWebhookNonceShape("short")).toBe(false);
    expect(isWebhookNonceShape("has space")).toBe(false);
    expect(isWebhookNonceShape(null)).toBe(false);
  });

  it("compares bearer tokens in constant time", () => {
    expect(verifyBearerToken("secret-123", "Bearer secret-123")).toBe(true);
    expect(verifyBearerToken("secret-123", "Bearer secret-124")).toBe(false);
    expect(verifyBearerToken("secret-123", null)).toBe(false);
    expect(verifyBearerToken("secret-123", "Token secret-123")).toBe(false);
  });
});
