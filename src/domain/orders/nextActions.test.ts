import { describe, expect, it } from "vitest";
import { getOrderNextActions, primaryOrderAction } from "./nextActions";

describe("order next actions", () => {
  it("offers contact for NEW and confirm for CONTACTED", () => {
    expect(
      primaryOrderAction({
        status: "NEW",
        paymentStatus: "PENDING",
        fulfillmentStatus: "NOT_STARTED",
      }),
    ).toBe("MARK_CONTACTED");
    expect(
      primaryOrderAction({
        status: "CONTACTED",
        paymentStatus: "PENDING",
        fulfillmentStatus: "NOT_STARTED",
      }),
    ).toBe("CONFIRM_ORDER");
  });

  it("offers fulfillment advancement once confirmed or in progress", () => {
    expect(
      primaryOrderAction({
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        fulfillmentStatus: "NOT_STARTED",
      }),
    ).toBe("ADVANCE_FULFILLMENT");
    expect(
      primaryOrderAction({
        status: "IN_PROGRESS",
        paymentStatus: "PARTIALLY_PAID",
        fulfillmentStatus: "PRODUCTION",
      }),
    ).toBe("ADVANCE_FULFILLMENT");
  });

  it("exposes completion for IN_PROGRESS and nothing primary when terminal", () => {
    const actions = getOrderNextActions({
      status: "IN_PROGRESS",
      paymentStatus: "PAID",
      fulfillmentStatus: "READY",
    });
    expect(actions).toContain("COMPLETE_ORDER");
    expect(actions).toContain("CANCEL_ORDER");
    expect(
      primaryOrderAction({
        status: "COMPLETED",
        paymentStatus: "PAID",
        fulfillmentStatus: "DELIVERED",
      }),
    ).toBeNull();
  });

  it("always offers delivery/discount adjustments while operational", () => {
    const actions = getOrderNextActions({
      status: "CONTACTED",
      paymentStatus: "PENDING",
      fulfillmentStatus: "NOT_STARTED",
    });
    expect(actions).toContain("UPDATE_ADJUSTMENTS");
    expect(actions).not.toContain("SET_PRICE"); // pricing-guard-allow: SET_PRICE
  });

  it("keeps terminal orders read-only except notes", () => {
    expect(
      getOrderNextActions({
        status: "COMPLETED",
        paymentStatus: "PAID",
        fulfillmentStatus: "DELIVERED",
      }),
    ).toEqual(["EDIT_INTERNAL_NOTE", "EDIT_CUSTOMER_NOTE"]);
    expect(
      getOrderNextActions({
        status: "CANCELLED",
        paymentStatus: "PENDING",
        fulfillmentStatus: "NOT_STARTED",
      }),
    ).toEqual(["EDIT_INTERNAL_NOTE", "EDIT_CUSTOMER_NOTE"]);
  });
});
