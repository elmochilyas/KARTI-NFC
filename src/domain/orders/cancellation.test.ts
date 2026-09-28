import { describe, expect, it } from "vitest";
import { isOrderCancelReason, orderCancelReasonLabel, ORDER_CANCEL_REASONS } from "./cancellation";

describe("cancellation reasons", () => {
  it("accepts the six structured reasons", () => {
    expect(ORDER_CANCEL_REASONS).toHaveLength(6);
    for (const reason of ORDER_CANCEL_REASONS) {
      expect(isOrderCancelReason(reason)).toBe(true);
    }
  });

  it("rejects unknown reasons and labels known ones", () => {
    expect(isOrderCancelReason("CUSTOMER_ANGRY")).toBe(false);
    expect(isOrderCancelReason(null)).toBe(false);
    expect(orderCancelReasonLabel("DUPLICATE")).toBe("Duplicate");
    expect(orderCancelReasonLabel("CUSTOMER_CHANGED_MIND")).toBe("Customer changed mind");
  });
});
