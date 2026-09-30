/**
 * Receipt-token production hardening regressions (Phase 6, spec §4).
 *
 * - Stored DB value is hash-only; raw token never enters the DB filter.
 * - Order number alone cannot retrieve a receipt.
 * - Malformed tokens fail safely with no DB access and no existence leak.
 * - Public projection stays minimal (no address/notes/IDs/attribution).
 * - Raw tokens are rejected by the analytics PII blocklist.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

process.env.RECEIPT_TOKEN_SECRET = "test-receipt-secret-32-chars-minimum";

import { scrubAnalyticsPayload } from "../analytics";
import { deriveReceiptToken, hashReceiptToken } from "./receipt";
import { getPublicReceipt } from "./receiptLookup";

const KEY = "123e4567-e89b-12d3-a456-426614174000";
const ORDER_NUMBER = "KARTI-000010";

function chain(final: () => Promise<unknown>) {
  const self: Record<string, unknown> = {};
  self.select = vi.fn(() => self);
  self.eq = vi.fn(() => self);
  self.order = vi.fn(() => self);
  self.limit = vi.fn(() => self);
  self.maybeSingle = vi.fn(final);
  return self;
}

/** Wire the admin mock: order row + first item row (null = not found). */
function mockReceiptRows(orderRow: unknown, itemRow: unknown) {
  fromMock.mockImplementation((table: string) => {
    if (table === "orders") return chain(() => Promise.resolve({ data: orderRow, error: null }));
    return chain(() => Promise.resolve({ data: itemRow, error: null }));
  });
}

function eqArgs(): [string, unknown][] {
  const orderChain = fromMock.mock.results[0].value as Record<
    string,
    { mock: { calls: unknown[][] } }
  >;
  return orderChain.eq.mock.calls.map((call) => call as unknown as [string, unknown]);
}

beforeEach(() => {
  fromMock.mockReset();
});

describe("receipt hardening", () => {
  it("stores hash-only: the DB filter uses the hash, never the raw token", async () => {
    const token = deriveReceiptToken(KEY);
    mockReceiptRows(
      { id: "order-uuid", order_number: ORDER_NUMBER },
      { product_type: "PERSONAL_CARD", quantity: 1 },
    );
    const receipt = await getPublicReceipt(ORDER_NUMBER, token);
    expect(receipt?.orderNumber).toBe(ORDER_NUMBER);
    const filters = eqArgs();
    expect(filters).toContainEqual(["order_number", ORDER_NUMBER]);
    expect(filters).toContainEqual(["receipt_token_hash", hashReceiptToken(token)]);
    expect(hashReceiptToken(token)).not.toBe(token);
    for (const [, value] of filters) {
      expect(value).not.toBe(token);
    }
  });

  it("order number alone cannot retrieve a receipt", async () => {
    mockReceiptRows(null, null);
    // Wrong token (right shape, wrong value) resolves nothing.
    expect(
      await getPublicReceipt(
        ORDER_NUMBER,
        deriveReceiptToken("223e4567-e89b-12d3-a456-426614174000"),
      ),
    ).toBeNull();
    // Missing token resolves nothing.
    expect(await getPublicReceipt(ORDER_NUMBER, null)).toBeNull();
    expect(await getPublicReceipt(ORDER_NUMBER, undefined)).toBeNull();
  });

  it("malformed tokens and order numbers fail safely without DB access", async () => {
    const token = deriveReceiptToken(KEY);
    for (const bad of ["xyz", "KARTI-000010", "", 42, {}, "0".repeat(63), "g".repeat(64)]) {
      expect(await getPublicReceipt(ORDER_NUMBER, bad)).toBeNull();
    }
    for (const badNumber of ["KARTI-1", "1", "", null, "karti-000010", "KARTI-000010 "]) {
      expect(await getPublicReceipt(badNumber, token)).toBeNull();
    }
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("projects only the minimal public-safe receipt (no private data)", async () => {
    const token = deriveReceiptToken(KEY);
    mockReceiptRows(
      { id: "order-uuid", order_number: ORDER_NUMBER },
      { product_type: "WHATSAPP_CARD", quantity: 2 },
    );
    const receipt = await getPublicReceipt(ORDER_NUMBER, token);
    expect(receipt).toEqual({
      orderNumber: ORDER_NUMBER,
      productType: "WHATSAPP_CARD",
      productSlug: "whatsapp-card",
      quantity: 2,
    });
    expect(JSON.stringify(receipt)).not.toMatch(
      /address|notes|client|profile|attribution|phone|email/i,
    );
  });

  it("rejects unknown products and missing items without leaking existence", async () => {
    const token = deriveReceiptToken(KEY);
    mockReceiptRows({ id: "order-uuid", order_number: ORDER_NUMBER }, null);
    expect(await getPublicReceipt(ORDER_NUMBER, token)).toBeNull();
    mockReceiptRows(
      { id: "order-uuid", order_number: ORDER_NUMBER },
      { product_type: "NOT_A_PRODUCT", quantity: 1 },
    );
    expect(await getPublicReceipt(ORDER_NUMBER, token)).toBeNull();
  });

  it("never lets receipt material reach marketing analytics", () => {
    for (const payload of [
      { receipt: "abc" },
      { token: "abc" },
      { order_number: "KARTI-000010" },
    ]) {
      expect(() => scrubAnalyticsPayload(payload)).toThrow();
    }
  });
});
