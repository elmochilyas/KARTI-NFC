/**
 * Conversion/provisioning eligibility + card readiness derivation
 * (specs/specs-vitrin/05 §§9-10, 20-21; user prompt §§9, 21, 33).
 *
 * Pure predicates — the RPCs enforce the same rules inside the
 * transaction; these drive the UI (and are unit-tested).
 */

import type { FulfillmentStatus, OrderStatus } from "./lifecycle";

export type CardReadiness = {
  required: number;
  linked: number;
  remaining: number;
};

/**
 * required = item quantity, linked = order_item_cards count,
 * remaining = max(required − linked, 0). No duplicated boolean stored.
 */
export function cardReadiness(quantity: number, linkedCount: number): CardReadiness {
  const required = Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0;
  const linked = Number.isSafeInteger(linkedCount) && linkedCount > 0 ? linkedCount : 0;
  return { required, linked, remaining: Math.max(required - linked, 0) };
}

/**
 * Conversion allowed for CONFIRMED, or IN_PROGRESS when no client is
 * linked yet (Phase 3 lets fulfillment start before conversion).
 * NEW/CONTACTED/CANCELLED/COMPLETED never convert.
 */
export function isConvertibleOrderStatus(status: OrderStatus): boolean {
  return status === "CONFIRMED" || status === "IN_PROGRESS";
}

/**
 * Provisioning normally requires NFC_CONFIGURATION. Later states only
 * for idempotent resume when cards are already linked; NEW/CONTACTED
 * work never provisions.
 */
export function canProvisionAtFulfillment(
  fulfillment: FulfillmentStatus,
  linkedCount: number,
): boolean {
  if (fulfillment === "NFC_CONFIGURATION") return true;
  if (linkedCount > 0) {
    return fulfillment === "READY" || fulfillment === "SHIPPED" || fulfillment === "DELIVERED";
  }
  return false;
}
