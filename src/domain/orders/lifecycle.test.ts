import { describe, expect, it } from "vitest";
import {
  canTransitionFulfillment,
  canTransitionOrder,
  canTransitionPayment,
  isFulfillmentStatus,
  isOrderStatus,
  isPaymentStatus,
  isTerminalOrderStatus,
  syncOrderStatusOnFulfillmentChange,
} from "./lifecycle";

describe("order lifecycle", () => {
  it("allows the valid NEW → CONTACTED → CONFIRMED → IN_PROGRESS → COMPLETED chain", () => {
    expect(canTransitionOrder("NEW", "CONTACTED")).toBe(true);
    expect(canTransitionOrder("CONTACTED", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("CONFIRMED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionOrder("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("rejects skips and backward jumps", () => {
    expect(canTransitionOrder("NEW", "CONFIRMED")).toBe(false);
    expect(canTransitionOrder("NEW", "COMPLETED")).toBe(false);
    expect(canTransitionOrder("CONTACTED", "NEW")).toBe(false);
    expect(canTransitionOrder("IN_PROGRESS", "CONFIRMED")).toBe(false);
  });

  it("allows cancellation from non-terminal states only", () => {
    for (const from of ["NEW", "CONTACTED", "CONFIRMED", "IN_PROGRESS"] as const) {
      expect(canTransitionOrder(from, "CANCELLED")).toBe(true);
    }
    expect(canTransitionOrder("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "NEW")).toBe(false);
  });

  it("treats COMPLETED/CANCELLED as terminal", () => {
    expect(isTerminalOrderStatus("COMPLETED")).toBe(true);
    expect(isTerminalOrderStatus("CANCELLED")).toBe(true);
    expect(isTerminalOrderStatus("IN_PROGRESS")).toBe(false);
  });
});

describe("payment lifecycle", () => {
  it("allows PENDING → PARTIALLY_PAID → PAID and PENDING → PAID", () => {
    expect(canTransitionPayment("PENDING", "PARTIALLY_PAID")).toBe(true);
    expect(canTransitionPayment("PARTIALLY_PAID", "PAID")).toBe(true);
    expect(canTransitionPayment("PENDING", "PAID")).toBe(true);
  });

  it("allows PAID → REFUNDED and forbids the rest", () => {
    expect(canTransitionPayment("PAID", "REFUNDED")).toBe(true);
    expect(canTransitionPayment("PENDING", "REFUNDED")).toBe(false);
    expect(canTransitionPayment("REFUNDED", "PAID")).toBe(false);
    expect(canTransitionPayment("PAID", "PENDING")).toBe(false);
  });
});

describe("fulfillment lifecycle (explicit map, no ordinal jumps)", () => {
  it("allows the documented happy path", () => {
    expect(canTransitionFulfillment("NOT_STARTED", "DESIGN")).toBe(true);
    expect(canTransitionFulfillment("DESIGN", "AWAITING_APPROVAL")).toBe(true);
    expect(canTransitionFulfillment("AWAITING_APPROVAL", "APPROVED")).toBe(true);
    expect(canTransitionFulfillment("APPROVED", "PRODUCTION")).toBe(true);
    expect(canTransitionFulfillment("PRODUCTION", "NFC_CONFIGURATION")).toBe(true);
    expect(canTransitionFulfillment("NFC_CONFIGURATION", "READY")).toBe(true);
    expect(canTransitionFulfillment("READY", "SHIPPED")).toBe(true);
    expect(canTransitionFulfillment("SHIPPED", "DELIVERED")).toBe(true);
  });

  it("allows explicit legitimate skips", () => {
    // Simple direct-action card skips design approval.
    expect(canTransitionFulfillment("DESIGN", "PRODUCTION")).toBe(true);
    // Hand-delivered order skips shipping.
    expect(canTransitionFulfillment("READY", "DELIVERED")).toBe(true);
    // Operator requests missing info before design/NFC work.
    expect(canTransitionFulfillment("DESIGN", "AWAITING_CUSTOMER_INFO")).toBe(true);
    expect(canTransitionFulfillment("NFC_CONFIGURATION", "AWAITING_CUSTOMER_INFO")).toBe(true);
  });

  it("rejects transitions that are not explicitly listed", () => {
    // Backward rework outside the approval loop.
    expect(canTransitionFulfillment("PRODUCTION", "DESIGN")).toBe(false);
    // Skipping straight from start to shipped/delivered.
    expect(canTransitionFulfillment("NOT_STARTED", "SHIPPED")).toBe(false);
    expect(canTransitionFulfillment("NOT_STARTED", "DELIVERED")).toBe(false);
    // Reopening a delivered order.
    expect(canTransitionFulfillment("DELIVERED", "READY")).toBe(false);
    // Approval loop misuse.
    expect(canTransitionFulfillment("CHANGES_REQUESTED", "APPROVED")).toBe(false);
  });
});

describe("fulfillment → order auto-synchronization", () => {
  it("moves CONFIRMED to IN_PROGRESS when fulfillment begins", () => {
    expect(
      syncOrderStatusOnFulfillmentChange({
        orderStatus: "CONFIRMED",
        fulfillmentStatus: "DESIGN",
      }),
    ).toBe("IN_PROGRESS");
  });

  it("keeps CONFIRMED while fulfillment is NOT_STARTED", () => {
    expect(
      syncOrderStatusOnFulfillmentChange({
        orderStatus: "CONFIRMED",
        fulfillmentStatus: "NOT_STARTED",
      }),
    ).toBe("CONFIRMED");
  });

  it("completes the order on DELIVERED unless cancelled", () => {
    expect(
      syncOrderStatusOnFulfillmentChange({
        orderStatus: "IN_PROGRESS",
        fulfillmentStatus: "DELIVERED",
      }),
    ).toBe("COMPLETED");
    expect(
      syncOrderStatusOnFulfillmentChange({
        orderStatus: "CANCELLED",
        fulfillmentStatus: "DELIVERED",
      }),
    ).toBe("CANCELLED");
  });
});

describe("status guards", () => {
  it("narrows stored strings to domain unions", () => {
    expect(isOrderStatus("NEW")).toBe(true);
    expect(isOrderStatus("SHIPPED")).toBe(false);
    expect(isOrderStatus(null)).toBe(false);
    expect(isPaymentStatus("PAID")).toBe(true);
    expect(isPaymentStatus("NEW")).toBe(false);
    expect(isFulfillmentStatus("READY")).toBe(true);
    expect(isFulfillmentStatus("PAID")).toBe(false);
  });
});
