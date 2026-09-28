import { describe, expect, it } from "vitest";
import { ORDER_EVENT_TYPES, isOrderEventType } from "./events";
import { idempotencyKeySchema, isIdempotencyKey } from "./idempotency";

describe("order event types", () => {
  it("exposes the sixteen required canonical names", () => {
    expect(ORDER_EVENT_TYPES).toEqual([
      "ORDER_CREATED",
      "CUSTOMER_CONTACTED",
      "ORDER_CONFIRMED",
      "ORDER_CANCELLED",
      "ORDER_COMPLETED",
      "PAYMENT_STATUS_CHANGED",
      "PRICE_SET",
      "FULFILLMENT_STATUS_CHANGED",
      "CLIENT_LINKED",
      "CLIENT_CREATED",
      "PROFILE_CREATED",
      "PROFILE_LINKED",
      "CARD_LINKED",
      "CARD_CONFIGURED",
      "CUSTOMER_NOTE_UPDATED",
      "INTERNAL_NOTE_UPDATED",
    ]);
  });

  it("guards event names", () => {
    expect(isOrderEventType("ORDER_CREATED")).toBe(true);
    expect(isOrderEventType("ORDER_DELETED")).toBe(false);
    expect(isOrderEventType(null)).toBe(false);
  });
});

describe("idempotency key contract", () => {
  it("accepts UUID keys and rejects the rest", () => {
    const key = "123e4567-e89b-12d3-a456-426614174000";
    expect(idempotencyKeySchema.safeParse(key).success).toBe(true);
    expect(isIdempotencyKey(key)).toBe(true);
    expect(isIdempotencyKey("not-a-uuid")).toBe(false);
    expect(isIdempotencyKey("KARTI-000001")).toBe(false);
    expect(isIdempotencyKey(null)).toBe(false);
  });
});
