import { describe, expect, it } from "vitest";
import {
  attentionLabel,
  deriveOrderAttention,
  isNeedsOrderAction,
  type AttentionInput,
} from "./attention";
import type { FulfillmentStatus, OrderStatus } from "./lifecycle";
import { FULFILLMENT_STATUSES, ORDER_STATUSES } from "./lifecycle";

/** Independent row-level mirror of the needsActionOrFilter() OR string. */
function matchesOrFilter(input: AttentionInput): boolean {
  const reworkOrReady =
    input.fulfillmentStatus === "CHANGES_REQUESTED" || input.fulfillmentStatus === "READY";
  if (input.status === "NEW" && !reworkOrReady) return true;
  if (input.status === "CONFIRMED" && input.fulfillmentStatus === "NOT_STARTED") return true;
  if (reworkOrReady && input.status !== "COMPLETED" && input.status !== "CANCELLED") {
    return true;
  }
  return false;
}

describe("order attention", () => {
  it("flags NEW orders for customer contact", () => {
    expect(
      deriveOrderAttention({
        status: "NEW",
        fulfillmentStatus: "NOT_STARTED",
      }),
    ).toEqual({ state: "NEEDS_OPERATOR_ACTION", reason: "CONTACT_CUSTOMER" });
  });

  it("treats CONTACTED orders as waiting on the customer (no quote step exists)", () => {
    expect(
      deriveOrderAttention({
        status: "CONTACTED",
        fulfillmentStatus: "NOT_STARTED",
      }),
    ).toEqual({ state: "WAITING_CUSTOMER", reason: "AWAITING_CONFIRMATION" });
  });

  it("flags CONFIRMED orders with no fulfillment to start", () => {
    expect(
      deriveOrderAttention({
        status: "CONFIRMED",
        fulfillmentStatus: "NOT_STARTED",
      }),
    ).toEqual({ state: "NEEDS_OPERATOR_ACTION", reason: "START_FULFILLMENT" });
  });

  it("flags CHANGES_REQUESTED and READY for operator action", () => {
    expect(
      deriveOrderAttention({
        status: "IN_PROGRESS",
        fulfillmentStatus: "CHANGES_REQUESTED",
      }),
    ).toEqual({ state: "NEEDS_OPERATOR_ACTION", reason: "REVISE_DESIGN" });
    expect(
      deriveOrderAttention({
        status: "IN_PROGRESS",
        fulfillmentStatus: "READY",
      }),
    ).toEqual({ state: "NEEDS_OPERATOR_ACTION", reason: "SHIP_OR_DELIVER" });
  });

  it("treats approval/info waits as waiting on the customer", () => {
    expect(
      deriveOrderAttention({
        status: "IN_PROGRESS",
        fulfillmentStatus: "AWAITING_APPROVAL",
      }).state,
    ).toBe("WAITING_CUSTOMER");
    expect(
      deriveOrderAttention({
        status: "IN_PROGRESS",
        fulfillmentStatus: "AWAITING_CUSTOMER_INFO",
      }).state,
    ).toBe("WAITING_CUSTOMER");
  });

  it("treats terminal orders as done", () => {
    for (const status of ["COMPLETED", "CANCELLED"] as const) {
      expect(
        deriveOrderAttention({
          status,
          fulfillmentStatus: "NOT_STARTED",
        }),
      ).toEqual({ state: "DONE" });
    }
  });

  it("agrees with the PostgREST filter predicate on the full state matrix", () => {
    for (const status of ORDER_STATUSES as readonly OrderStatus[]) {
      for (const fulfillmentStatus of FULFILLMENT_STATUSES as readonly FulfillmentStatus[]) {
        const input = { status, fulfillmentStatus };
        expect(isNeedsOrderAction(input), `${status}/${fulfillmentStatus}`).toBe(
          matchesOrFilter(input),
        );
      }
    }
  });

  it("renders human labels without relying on color", () => {
    expect(
      attentionLabel({ state: "NEEDS_OPERATOR_ACTION", reason: "CONTACT_CUSTOMER" }),
    ).toContain("contact customer");
    expect(attentionLabel({ state: "DONE" })).toBe("Done");
  });
});
