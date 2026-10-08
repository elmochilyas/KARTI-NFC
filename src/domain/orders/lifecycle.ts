/**
 * Order lifecycle transition rules (specs/specs-vitrin/01 §§7-9).
 *
 * Single centralized authority for V1. Fulfillment uses an EXPLICIT
 * allowed-transition map: legitimate skips are listed explicitly; state
 * ordering alone never makes a transition valid.
 */

export const ORDER_STATUSES = [
  "NEW",
  "CONTACTED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "NOT_REQUIRED",
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  "NOT_STARTED",
  "AWAITING_CUSTOMER_INFO",
  "DESIGN",
  "AWAITING_APPROVAL",
  "CHANGES_REQUESTED",
  "APPROVED",
  "PRODUCTION",
  "NFC_CONFIGURATION",
  "READY",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  // SHIPPED is compatibility only: existing rows/code keep working, but the
  // delivery-company flow (READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED)
  // never requires it.
  "SHIPPED",
  "DELIVERED",
  "FAILED",
  "RETURNED",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  NOT_REQUIRED: [],
  PENDING: ["PARTIALLY_PAID", "PAID"],
  PARTIALLY_PAID: ["PAID"],
  PAID: ["REFUNDED"],
  REFUNDED: [],
};

/**
 * Explicit fulfillment adjacency. Every legitimate skip is a listed edge
 * (e.g. DESIGN → PRODUCTION skips approval; READY → DELIVERED skips
 * shipping; * → AWAITING_CUSTOMER_INFO when the operator needs input
 * before design/production/NFC work). Backward rework other than the
 * approval loop and info requests is forbidden.
 */
export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  NOT_STARTED: [
    "AWAITING_CUSTOMER_INFO",
    "DESIGN",
    "AWAITING_APPROVAL",
    "APPROVED",
    "PRODUCTION",
    "NFC_CONFIGURATION",
    "READY",
  ],
  AWAITING_CUSTOMER_INFO: [
    "DESIGN",
    "AWAITING_APPROVAL",
    "APPROVED",
    "PRODUCTION",
    "NFC_CONFIGURATION",
    "READY",
  ],
  DESIGN: [
    "AWAITING_CUSTOMER_INFO",
    "AWAITING_APPROVAL",
    "APPROVED",
    "PRODUCTION",
    "NFC_CONFIGURATION",
    "READY",
  ],
  AWAITING_APPROVAL: ["AWAITING_CUSTOMER_INFO", "APPROVED", "CHANGES_REQUESTED", "DESIGN"],
  CHANGES_REQUESTED: ["DESIGN", "AWAITING_APPROVAL"],
  APPROVED: ["AWAITING_CUSTOMER_INFO", "PRODUCTION", "NFC_CONFIGURATION", "READY"],
  PRODUCTION: ["AWAITING_CUSTOMER_INFO", "NFC_CONFIGURATION", "READY", "SHIPPED"],
  NFC_CONFIGURATION: ["AWAITING_CUSTOMER_INFO", "READY", "SHIPPED", "DELIVERED"],
  // Delivery flow: READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED.
  // OUT_FOR_DELIVERY → SHIPPED → DELIVERED is NOT required; SHIPPED edges
  // below are compatibility only. Exception flow: READY / PICKED_UP /
  // OUT_FOR_DELIVERY → FAILED → RETURNED.
  READY: ["PICKED_UP", "OUT_FOR_DELIVERY", "SHIPPED", "DELIVERED", "FAILED"],
  PICKED_UP: ["OUT_FOR_DELIVERY", "SHIPPED", "DELIVERED", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "SHIPPED", "FAILED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  DELIVERED: [],
  FAILED: ["RETURNED"],
  RETURNED: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isFulfillmentStatus(value: unknown): value is FulfillmentStatus {
  return typeof value === "string" && (FULFILLMENT_STATUSES as readonly string[]).includes(value);
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function canTransitionFulfillment(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return FULFILLMENT_TRANSITIONS[from].includes(to);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

/**
 * Automatic synchronization (spec 01 §9):
 * - confirmed order begins fulfillment → IN_PROGRESS;
 * - fulfillment DELIVERED → COMPLETED unless already cancelled.
 * Returns the status the order should carry (may equal the input).
 */
export function syncOrderStatusOnFulfillmentChange(args: {
  orderStatus: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
}): OrderStatus {
  const { orderStatus, fulfillmentStatus } = args;

  if (orderStatus === "CANCELLED" || orderStatus === "COMPLETED") {
    return orderStatus;
  }

  if (fulfillmentStatus === "DELIVERED") {
    return "COMPLETED";
  }

  if (orderStatus === "CONFIRMED" && fulfillmentStatus !== "NOT_STARTED") {
    return "IN_PROGRESS";
  }

  return orderStatus;
}
