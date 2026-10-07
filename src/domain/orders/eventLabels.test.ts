import { describe, expect, it } from "vitest";
import { humanizeStatusValue, orderEventActorLabel, orderEventLabel } from "./eventLabels";

describe("order event labels", () => {
  it("labels lifecycle events in human language", () => {
    expect(orderEventLabel("ORDER_CREATED")).toBe("Order created");
    expect(orderEventLabel("CUSTOMER_CONTACTED")).toBe("Customer contacted");
    expect(orderEventLabel("ORDER_CONFIRMED")).toBe("Order confirmed");
    expect(orderEventLabel("ORDER_CANCELLED")).toBe("Order cancelled");
    expect(orderEventLabel("ORDER_COMPLETED")).toBe("Order completed");
    expect(orderEventLabel("PRICE_ADJUSTED")).toBe("Delivery / discount updated");
    expect(orderEventLabel("INTERNAL_NOTE_UPDATED")).toBe("Internal note updated");
  });

  it("renders payment and fulfillment transitions with from/to", () => {
    expect(orderEventLabel("PAYMENT_STATUS_CHANGED", "PENDING", "PAID")).toBe(
      "Payment changed from Pending to Paid",
    );
    expect(orderEventLabel("FULFILLMENT_STATUS_CHANGED", "DESIGN", "AWAITING_APPROVAL")).toBe(
      "Fulfillment changed from Design to Awaiting approval",
    );
  });

  it("falls back to the raw type for unknown future events", () => {
    expect(orderEventLabel("SOME_FUTURE_EVENT")).toBe("SOME_FUTURE_EVENT");
  });

  it("humanizes status values", () => {
    expect(humanizeStatusValue("PARTIALLY_PAID")).toBe("Partially paid");
    expect(humanizeStatusValue("NOT_STARTED")).toBe("Not started");
    expect(humanizeStatusValue(null)).toBe("—");
  });

  it("labels actors", () => {
    expect(orderEventActorLabel("ADMIN")).toBe("Operator");
    expect(orderEventActorLabel("CUSTOMER")).toBe("Customer");
    expect(orderEventActorLabel("SYSTEM")).toBe("System");
  });
});
