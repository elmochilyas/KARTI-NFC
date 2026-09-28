/**
 * Server-authoritative pricing contract
 * (specs/specs-vitrin/01 §10, 03 §16).
 *
 * - Integer minor units only (never float).
 * - The catalog is the source of approved pricing; the browser never
 *   controls unit/subtotal/delivery/discount/total (no price input param).
 * - V1: every product is QUOTE → pricingStatus QUOTE_REQUIRED with null
 *   totals. FIXED/FROM logic is implemented for the future but unreachable
 *   until an approved priceMinor lands in the catalog.
 */

import { MARKETING_PRODUCT_CATALOG, getProductDefinition } from "./catalog";
import type { ProductType } from "./productTypes";

export const DEFAULT_CURRENCY = "MAD";

export type PricingStatus = "PRICED" | "QUOTE_REQUIRED";

export type OrderPricingQuote = {
  pricingStatus: PricingStatus;
  unitPriceMinor?: number;
  subtotalMinor?: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor?: number;
  currency: typeof DEFAULT_CURRENCY;
};

export type PriceOrderInput = {
  productType: ProductType;
  quantity: number;
  deliveryFeeMinor?: number;
};

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function priceOrder(input: PriceOrderInput): OrderPricingQuote {
  const definition = getProductDefinition(input.productType);

  if (!Number.isInteger(input.quantity) || input.quantity < definition.minQuantity) {
    throw new Error(`Quantity must be an integer >= ${definition.minQuantity}.`);
  }

  const deliveryFeeMinor = input.deliveryFeeMinor ?? 0;
  if (!isNonNegativeInteger(deliveryFeeMinor)) {
    throw new Error("Delivery fee must be a non-negative integer.");
  }

  // No approved price → quote mode. Totals stay null; the operator prices
  // the order later via setOrderPrice (Phase 3).
  if (definition.pricingMode === "QUOTE" || definition.priceMinor === undefined) {
    return {
      pricingStatus: "QUOTE_REQUIRED",
      deliveryFeeMinor,
      discountMinor: 0,
      currency: DEFAULT_CURRENCY,
    };
  }

  if (!isNonNegativeInteger(definition.priceMinor)) {
    throw new Error("Catalog price must be a non-negative integer.");
  }

  const unitPriceMinor = definition.priceMinor;
  const subtotalMinor = unitPriceMinor * input.quantity;
  const totalMinor = subtotalMinor + deliveryFeeMinor;

  if (!isNonNegativeInteger(subtotalMinor) || !isNonNegativeInteger(totalMinor)) {
    throw new Error("Pricing overflow: totals must be non-negative integers.");
  }

  return {
    pricingStatus: "PRICED",
    unitPriceMinor,
    subtotalMinor,
    deliveryFeeMinor,
    discountMinor: 0,
    totalMinor,
    currency: DEFAULT_CURRENCY,
  };
}

/** Every catalog entry must currently resolve to QUOTE_REQUIRED (V1 gate). */
export function catalogIsQuoteOnly(): boolean {
  return Object.values(MARKETING_PRODUCT_CATALOG).every(
    (def) => def.pricingMode === "QUOTE" && def.priceMinor === undefined,
  );
}
