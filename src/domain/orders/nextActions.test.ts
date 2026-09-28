import { describe, expect, it } from "vitest";
import { getOrderNextActions, primaryOrderAction } from "./nextActions";

describe("order next actions", () => {
  it("offers contact for NEW and confirm for CONTACTED", () => {
    expect(
      primaryOrderAction({
        status: "NEW",
        paymentStatus: "PENDING",
        fulfillmentStatus: "NOT_STARTED",
        pricingStatus: "QUOTE_REQUIRED",
      }),
    ).toBe("MARK_CONTACTED");
    expect(
      primaryOrderAction({
        status: "CONTACTED",
        paymentStatus: "PENDING",
        fulfillmentStatus: "NOT_STARTED",
        pricingStatus: "QUOTE_REQUIRED",
      }),
    ).toBe("CONFIRM_ORDER");
  });

  it("offers fulfillment advancement once confirmed or in progress", () => {
    expect(
      primaryOrderAction({
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        fulfillmentStatus: "NOT_STARTED",
        pricingStatus: "PRICED",
      }),
    ).toBe("ADVANCE_FULFILLMENT");
    expect(
      primaryOrderAction({
        status: "IN_PROGRESS",
        paymentStatus: "PARTIALLY_PAID",
        fulfillmentStatus: "PRODUCTION",
        pricingStatus: "PRICED",
      }),
    ).toBe("ADVANCE_FULFILLMENT");
  });

  it("exposes completion for IN_PROGRESS and nothing primary when terminal", () => {
    const actions = getOrderNextActions({
      status: "IN_PROGRESS",
      paymentStatus: "PAID",
      fulfillmentStatus: "READY",
      pricingStatus: "PRICED",
    });
    expect(actions).toContain("COMPLETE_ORDER");
    expect(actions).toContain("CANCEL_ORDER");
    expect(
      primaryOrderAction({
        status: "COMPLETED",
        paymentStatus: "PAID",
        fulfillmentStatus: "DELIVERED",
        pricingStatus: "PRICED",
      }),
    ).toBeNull();
  });

  it("keeps terminal orders read-only except notes", () => {
    expect(
      getOrderNextActions({
        status: "COMPLETED",
        paymentStatus: "PAID",
        fulfillmentStatus: "DELIVERED",
        pricingStatus: "PRICED",
      }),
    ).toEqual(["EDIT_INTERNAL_NOTE", "EDIT_CUSTOMER_NOTE"]);
    expect(
      getOrderNextActions({
        status: "CANCELLED",
        paymentStatus: "PENDING",
        fulfillmentStatus: "NOT_STARTED",
        pricingStatus: "QUOTE_REQUIRED",
      }),
    ).toEqual(["EDIT_INTERNAL_NOTE", "EDIT_CUSTOMER_NOTE"]);
  });
});
