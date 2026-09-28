/**
 * Central order event types (specs/specs-vitrin/03 §10).
 * Events are append-only history; never the source of current state.
 */

export const ORDER_EVENT_TYPES = [
  "ORDER_CREATED",
  "CUSTOMER_CONTACTED",
  "ORDER_CONFIRMED",
  "ORDER_CANCELLED",
  "ORDER_COMPLETED",
  "PAYMENT_STATUS_CHANGED",
  "PRICE_SET",
  "FULFILLMENT_STATUS_CHANGED",
  "CLIENT_LINKED",
  "CLIENT_CREATED",
  "PROFILE_CREATED",
  "PROFILE_LINKED",
  "CARD_LINKED",
  "CARD_CONFIGURED",
  "CUSTOMER_NOTE_UPDATED",
  "INTERNAL_NOTE_UPDATED",
] as const;

export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number];

export function isOrderEventType(value: unknown): value is OrderEventType {
  return typeof value === "string" && (ORDER_EVENT_TYPES as readonly string[]).includes(value);
}
