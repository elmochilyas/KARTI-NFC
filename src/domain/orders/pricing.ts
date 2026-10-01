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
import type { PricingMode, ProductType } from "./productTypes";

export const DEFAULT_CURRENCY = "MAD";

export type PricingStatus = "PRICED" | "QUOTE_REQUIRED";

export function isPricingStatus(value: unknown): value is PricingStatus {
  return value === "PRICED" || value === "QUOTE_REQUIRED";
}

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
  /**
   * Live catalog price override (server-loaded from `catalog_products`).
   * Absent → the static definition (V1: always QUOTE). The browser never
   * supplies this — only the server action loads it.
   */
  catalogPrice?: { pricingMode: PricingMode; priceMinor: number | null } | null;
  /**
   * True only when the delivery fee is operator-resolved. Public orders
   * never know delivery at submission time (default false): the unit
   * price/subtotal snapshot is stored truthfully while the final payable
   * total stays unknown (`pricingStatus` QUOTE_REQUIRED, `totalMinor`
   * undefined) until `admin_set_order_price` resolves delivery.
   */
  deliveryPriced?: boolean;
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

  // Effective commercial price: live catalog row wins; static definition is
  // the fallback (V1: always QUOTE, so behavior is unchanged without CMS data).
  const effectiveMode = input.catalogPrice?.pricingMode ?? definition.pricingMode;
  const effectivePrice = input.catalogPrice ? input.catalogPrice.priceMinor : definition.priceMinor;

  // No approved price → quote mode. Totals stay null; the operator prices
  // the order later via setOrderPrice (Phase 3).
  if (effectiveMode === "QUOTE" || effectivePrice === undefined || effectivePrice === null) {
    return {
      pricingStatus: "QUOTE_REQUIRED",
      deliveryFeeMinor,
      discountMinor: 0,
      currency: DEFAULT_CURRENCY,
    };
  }

  if (!isNonNegativeInteger(effectivePrice) || effectivePrice <= 0) {
    throw new Error("Catalog price must be a positive integer.");
  }

  // FROM snapshots the floor price (the page always prefixes "From").
  const unitPriceMinor = effectivePrice;
  const subtotalMinor = unitPriceMinor * input.quantity;

  if (!isNonNegativeInteger(subtotalMinor)) {
    throw new Error("Pricing overflow: totals must be non-negative integers.");
  }

  // Delivery unresolved → snapshot the unit truth, keep the order total
  // unknown. Never pretend the final payable total is known.
  if (input.deliveryPriced !== true) {
    return {
      pricingStatus: "QUOTE_REQUIRED",
      unitPriceMinor,
      subtotalMinor,
      deliveryFeeMinor,
      discountMinor: 0,
      currency: DEFAULT_CURRENCY,
    };
  }

  const totalMinor = subtotalMinor + deliveryFeeMinor;

  if (!isNonNegativeInteger(totalMinor)) {
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
