/**
 * State-aware operator actions for the order detail command center
 * (specs/specs-vitrin/04 §19). Derived centrally from the lifecycle
 * maps — never duplicated in UI components.
 */

import type { FulfillmentStatus, OrderStatus, PaymentStatus } from "./lifecycle";
import type { PricingStatus } from "./pricing";

export const ORDER_ACTION_KEYS = [
  "MARK_CONTACTED",
  "CONFIRM_ORDER",
  "COMPLETE_ORDER",
  "CANCEL_ORDER",
  "SET_PRICE",
  "UPDATE_PAYMENT",
  "ADVANCE_FULFILLMENT",
  "EDIT_INTERNAL_NOTE",
  "EDIT_CUSTOMER_NOTE",
] as const;

export type OrderActionKey = (typeof ORDER_ACTION_KEYS)[number];

export type NextActionsInput = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  pricingStatus: PricingStatus;
};

/** Primary lifecycle action for the current status (if any). */
export function primaryOrderAction(input: NextActionsInput): OrderActionKey | null {
  switch (input.status) {
    case "NEW":
      return "MARK_CONTACTED";
    case "CONTACTED":
      return "CONFIRM_ORDER";
    case "CONFIRMED":
    case "IN_PROGRESS":
      return input.fulfillmentStatus === "DELIVERED" ? null : "ADVANCE_FULFILLMENT";
    case "COMPLETED":
    case "CANCELLED":
      return null;
  }
}

/**
 * Full ordered action set for the detail page. Terminal orders expose
 * notes only (read-only lifecycle, no reopen workflow in V1).
 */
export function getOrderNextActions(input: NextActionsInput): OrderActionKey[] {
  const { status } = input;
  if (status === "COMPLETED" || status === "CANCELLED") {
    return ["EDIT_INTERNAL_NOTE", "EDIT_CUSTOMER_NOTE"];
  }

  const actions: OrderActionKey[] = [];
  const primary = primaryOrderAction(input);
  if (primary) actions.push(primary);

  // Quote/payment/fulfillment live in their own sections but stay
  // available while the order is operational.
  if (!actions.includes("SET_PRICE")) actions.push("SET_PRICE");
  actions.push("UPDATE_PAYMENT");
  if (status === "CONFIRMED" || status === "IN_PROGRESS") {
    if (!actions.includes("ADVANCE_FULFILLMENT") && input.fulfillmentStatus !== "DELIVERED") {
      actions.push("ADVANCE_FULFILLMENT");
    }
    if (status === "IN_PROGRESS") actions.push("COMPLETE_ORDER");
  }
  actions.push("CANCEL_ORDER");
  actions.push("EDIT_INTERNAL_NOTE", "EDIT_CUSTOMER_NOTE");
  return actions;
}
