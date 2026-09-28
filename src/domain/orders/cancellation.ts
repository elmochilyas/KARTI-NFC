/**
 * Structured cancellation reasons (specs/specs-vitrin/03 §21).
 * Stored in ORDER_CANCELLED event metadata with an optional operator
 * note. The order itself is never deleted.
 */

export const ORDER_CANCEL_REASONS = [
  "CUSTOMER_CHANGED_MIND",
  "UNREACHABLE",
  "DUPLICATE",
  "INVALID_SUBMISSION",
  "PRICE",
  "OTHER",
] as const;

export type OrderCancelReason = (typeof ORDER_CANCEL_REASONS)[number];

export function isOrderCancelReason(value: unknown): value is OrderCancelReason {
  return typeof value === "string" && (ORDER_CANCEL_REASONS as readonly string[]).includes(value);
}

const CANCEL_REASON_LABELS: Record<OrderCancelReason, string> = {
  CUSTOMER_CHANGED_MIND: "Customer changed mind",
  UNREACHABLE: "Unreachable",
  DUPLICATE: "Duplicate",
  INVALID_SUBMISSION: "Invalid submission",
  PRICE: "Price",
  OTHER: "Other",
};

export function orderCancelReasonLabel(reason: OrderCancelReason): string {
  return CANCEL_REASON_LABELS[reason];
}
