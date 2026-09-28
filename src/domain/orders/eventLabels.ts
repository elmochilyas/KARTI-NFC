/**
 * Human-readable order-event labels for the dashboard timeline
 * (specs/specs-vitrin/04 §18). Current state is always read from the
 * order record — these labels only describe history entries.
 */

/** "PARTIALLY_PAID" → "Partially paid"; unknown values pass through. */
export function humanizeStatusValue(value: string | null | undefined): string {
  if (!value) return "—";
  const words = value.toLowerCase().split("_").filter(Boolean);
  if (words.length === 0) return value;
  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

const EVENT_LABELS: Record<string, string> = {
  ORDER_CREATED: "Order created",
  CUSTOMER_CONTACTED: "Customer contacted",
  ORDER_CONFIRMED: "Order confirmed",
  ORDER_CANCELLED: "Order cancelled",
  ORDER_COMPLETED: "Order completed",
  PRICE_SET: "Quote set",
  CLIENT_LINKED: "Client linked",
  CLIENT_CREATED: "Client created",
  PROFILE_CREATED: "Profile created",
  PROFILE_LINKED: "Profile linked",
  CARD_LINKED: "Card linked",
  CARD_CONFIGURED: "Card configured",
  CUSTOMER_NOTE_UPDATED: "Customer note updated",
  INTERNAL_NOTE_UPDATED: "Internal note updated",
  DESTINATION_RESOLVED: "Destination resolved",
};

/**
 * Timeline label for an event row. Transition events render from/to;
 * unknown future event types fall back to the raw type string so new
 * history is never invisible.
 */
export function orderEventLabel(
  eventType: string,
  fromValue?: string | null,
  toValue?: string | null,
): string {
  if (eventType === "PAYMENT_STATUS_CHANGED") {
    return `Payment changed from ${humanizeStatusValue(fromValue)} to ${humanizeStatusValue(toValue)}`;
  }
  if (eventType === "FULFILLMENT_STATUS_CHANGED") {
    return `Fulfillment changed from ${humanizeStatusValue(fromValue)} to ${humanizeStatusValue(toValue)}`;
  }
  return EVENT_LABELS[eventType] ?? eventType;
}

/** Operator-facing actor name for the timeline. */
export function orderEventActorLabel(actorType: string): string {
  switch (actorType) {
    case "ADMIN":
      return "Operator";
    case "CUSTOMER":
      return "Customer";
    case "SYSTEM":
      return "System";
    default:
      return actorType;
  }
}
