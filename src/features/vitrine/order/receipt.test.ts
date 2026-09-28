import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateReceiptToken, hashReceiptToken, isReceiptTokenShape } from "./receipt";

describe("receipt tokens", () => {
  it("mints 256-bit hex tokens with stable hashes", () => {
    const token = generateReceiptToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(generateReceiptToken()).not.toBe(token);
    expect(hashReceiptToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashReceiptToken(token)).toBe(hashReceiptToken(token));
  });

  it("validates token shape strictly", () => {
    expect(isReceiptTokenShape(generateReceiptToken())).toBe(true);
    expect(isReceiptTokenShape("KARTI-000001")).toBe(false);
    expect(isReceiptTokenShape("xyz")).toBe(false);
    expect(isReceiptTokenShape(null)).toBe(false);
  });
});
