import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SECRET = "test-receipt-secret-32-chars-minimum";

beforeEach(() => {
  process.env.RECEIPT_TOKEN_SECRET = SECRET;
});

import { deriveReceiptToken, hashReceiptToken, isReceiptTokenShape } from "./receipt";
import { getReceiptTokenSecret } from "@/lib/env-server";

describe("receipt tokens", () => {
  it("derives a stable 256-bit token per idempotency key", () => {
    const key = "123e4567-e89b-12d3-a456-426614174000";
    const first = deriveReceiptToken(key);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    // Lost-response retry re-derives the SAME working credential.
    expect(deriveReceiptToken(key)).toBe(first);
    expect(deriveReceiptToken("223e4567-e89b-12d3-a456-426614174000")).not.toBe(first);
  });

  it("hashes deterministically for storage", () => {
    const token = deriveReceiptToken("123e4567-e89b-12d3-a456-426614174000");
    expect(hashReceiptToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashReceiptToken(token)).toBe(hashReceiptToken(token));
  });

  it("validates token shape strictly", () => {
    expect(isReceiptTokenShape(deriveReceiptToken("123e4567-e89b-12d3-a456-426614174000"))).toBe(
      true,
    );
    expect(isReceiptTokenShape("KARTI-000001")).toBe(false);
    expect(isReceiptTokenShape("xyz")).toBe(false);
    expect(isReceiptTokenShape(null)).toBe(false);
  });

  it("fails closed without a configured secret", () => {
    delete process.env.RECEIPT_TOKEN_SECRET;
    expect(() => getReceiptTokenSecret()).toThrow();
    process.env.RECEIPT_TOKEN_SECRET = SECRET;
  });
});
