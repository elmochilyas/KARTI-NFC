/**
 * Operational attention derivation (specs/specs-vitrin/04 §9).
 *
 * Centralized, deterministic, unit-tested. No `needs_action` boolean is
 * ever persisted — every consumer derives from status columns.
 *
 * The same predicate is also serialized for PostgREST
 * (`needsActionOrFilter`) so the Needs-Action view and its counts stay
 * server-side without duplicating logic in SQL. Parity between the two
 * is pinned by attention.test.ts over the full state matrix.
 */

import type { FulfillmentStatus, OrderStatus } from "./lifecycle";
import type { PricingStatus } from "./pricing";

export const ATTENTION_STATES = [
  "NEEDS_OPERATOR_ACTION",
  "WAITING_CUSTOMER",
  "IN_PROGRESS",
  "DONE",
] as const;

export type AttentionState = (typeof ATTENTION_STATES)[number];

export const ATTENTION_REASONS = [
  "CONTACT_CUSTOMER",
  "SET_PRICE",
  "START_FULFILLMENT",
  "REVISE_DESIGN",
  "SHIP_OR_DELIVER",
  "AWAITING_CONFIRMATION",
  "AWAITING_CUSTOMER_INFO",
  "AWAITING_APPROVAL",
] as const;

export type AttentionReason = (typeof ATTENTION_REASONS)[number];

export type OrderAttention = {
  state: AttentionState;
  reason?: AttentionReason;
};

export type AttentionInput = {
  status: OrderStatus;
  pricingStatus: PricingStatus;
  fulfillmentStatus: FulfillmentStatus;
};

export function deriveOrderAttention(input: AttentionInput): OrderAttention {
  const { status, pricingStatus, fulfillmentStatus } = input;

  if (status === "COMPLETED" || status === "CANCELLED") {
    return { state: "DONE" };
  }

  if (status === "NEW") {
    return { state: "NEEDS_OPERATOR_ACTION", reason: "CONTACT_CUSTOMER" };
  }

  // Fulfillment-driven needs win over status waits (except NEW above):
  // rework or a ready order is actionable whatever the order status says.
  if (fulfillmentStatus === "CHANGES_REQUESTED") {
    return { state: "NEEDS_OPERATOR_ACTION", reason: "REVISE_DESIGN" };
  }
  if (fulfillmentStatus === "READY") {
    return { state: "NEEDS_OPERATOR_ACTION", reason: "SHIP_OR_DELIVER" };
  }

  if (status === "CONTACTED") {
    if (pricingStatus === "QUOTE_REQUIRED") {
      return { state: "NEEDS_OPERATOR_ACTION", reason: "SET_PRICE" };
    }
    return { state: "WAITING_CUSTOMER", reason: "AWAITING_CONFIRMATION" };
  }

  if (status === "CONFIRMED" && fulfillmentStatus === "NOT_STARTED") {
    return { state: "NEEDS_OPERATOR_ACTION", reason: "START_FULFILLMENT" };
  }

  // Remaining fulfillment waits (IN_PROGRESS, or CONFIRMED with started
  // fulfillment).
  switch (fulfillmentStatus) {
    case "AWAITING_APPROVAL":
      return { state: "WAITING_CUSTOMER", reason: "AWAITING_APPROVAL" };
    case "AWAITING_CUSTOMER_INFO":
      return { state: "WAITING_CUSTOMER", reason: "AWAITING_CUSTOMER_INFO" };
    case "DELIVERED":
      // The DELIVERED → COMPLETED sync should already have fired; safety net.
      return { state: "DONE" };
    default:
      return { state: "IN_PROGRESS" };
  }
}

export function isNeedsOrderAction(input: AttentionInput): boolean {
  return deriveOrderAttention(input).state === "NEEDS_OPERATOR_ACTION";
}

/**
 * PostgREST `.or()` serialization of the NEEDS_OPERATOR_ACTION predicate.
 * Expresses exactly the conditions above using only column operators so
 * list filtering and counts run in the database.
 */
export function needsActionOrFilter(): string {
  return [
    "and(status.eq.NEW,fulfillment_status.not.in.(CHANGES_REQUESTED,READY))",
    "and(status.eq.CONTACTED,pricing_status.eq.QUOTE_REQUIRED,fulfillment_status.not.in.(CHANGES_REQUESTED,READY))",
    "and(status.eq.CONFIRMED,fulfillment_status.eq.NOT_STARTED)",
    "and(fulfillment_status.in.(CHANGES_REQUESTED,READY),status.not.in.(COMPLETED,CANCELLED))",
  ].join(",");
}

/** Human operator-facing line for an attention value (dashboard copy). */
export function attentionLabel(attention: OrderAttention): string {
  switch (attention.reason) {
    case "CONTACT_CUSTOMER":
      return "Needs action · contact customer";
    case "SET_PRICE":
      return "Needs action · set price";
    case "START_FULFILLMENT":
      return "Needs action · start fulfillment";
    case "REVISE_DESIGN":
      return "Needs action · revise design";
    case "SHIP_OR_DELIVER":
      return "Needs action · ship or deliver";
    case "AWAITING_CONFIRMATION":
      return "Waiting · customer confirmation";
    case "AWAITING_CUSTOMER_INFO":
      return "Waiting · customer info";
    case "AWAITING_APPROVAL":
      return "Waiting · customer approval";
    default:
      switch (attention.state) {
        case "NEEDS_OPERATOR_ACTION":
          return "Needs action";
        case "WAITING_CUSTOMER":
          return "Waiting on customer";
        case "IN_PROGRESS":
          return "In progress";
        case "DONE":
          return "Done";
      }
  }
}
