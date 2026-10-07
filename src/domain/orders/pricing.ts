/**
 * Server-authoritative fixed-price contract.
 *
 * - Integer minor units only (never float).
 * - Every product has exactly one fixed catalog base price (MAD).
 * - The catalog row is the source of the price; the browser never
 *   controls unit/subtotal/delivery/discount/total.
 * - At submission the server snapshots:
 *     unit_price_minor = current catalog price
 *     subtotal_minor   = unit_price_minor × quantity
 *     total_minor      = subtotal_minor + delivery − discount
 * - The snapshot is immutable history: later catalog edits only affect
 *   NEW orders. The operator may later adjust delivery/discount only —
 *   never the snapshotted base price.
 */

import { getProductDefinition } from "./catalog";
import type { ProductType } from "./productTypes";

export const DEFAULT_CURRENCY = "MAD";

/** A configured fixed catalog price (minor units, MAD). */
export type CatalogPrice = {
  priceMinor: number;
  currency: "MAD";
};

export type OrderPricing = {
  unitPriceMinor: number;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: typeof DEFAULT_CURRENCY;
};

export type PriceOrderInput = {
  productType: ProductType;
  quantity: number;
  /**
   * Current catalog price, server-loaded from `catalog_products`.
   * Required: a product without a configured price cannot be ordered.
   * The browser never supplies this — only the server action loads it.
   */
  catalogPrice: CatalogPrice | null;
  deliveryFeeMinor?: number;
  discountMinor?: number;
};

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function priceOrder(input: PriceOrderInput): OrderPricing {
  const definition = getProductDefinition(input.productType);

  if (!Number.isInteger(input.quantity) || input.quantity < definition.minQuantity) {
    throw new Error(`Quantity must be an integer >= ${definition.minQuantity}.`);
  }

  // No configured catalog price → the product is not orderable. This is a
  // configuration problem, never a pricing mode: the caller must refuse
  // the submission instead of inventing a price.
  if (
    !input.catalogPrice ||
    !isNonNegativeInteger(input.catalogPrice.priceMinor) ||
    input.catalogPrice.priceMinor <= 0
  ) {
    throw new Error("Product price is not configured.");
  }

  const deliveryFeeMinor = input.deliveryFeeMinor ?? 0;
  if (!isNonNegativeInteger(deliveryFeeMinor)) {
    throw new Error("Delivery fee must be a non-negative integer.");
  }
  const discountMinor = input.discountMinor ?? 0;
  if (!isNonNegativeInteger(discountMinor)) {
    throw new Error("Discount must be a non-negative integer.");
  }

  const unitPriceMinor = input.catalogPrice.priceMinor;
  const subtotalMinor = unitPriceMinor * input.quantity;

  if (!isNonNegativeInteger(subtotalMinor)) {
    throw new Error("Pricing overflow: totals must be non-negative integers.");
  }

  const totalMinor = subtotalMinor + deliveryFeeMinor - discountMinor;

  if (!isNonNegativeInteger(totalMinor)) {
    throw new Error("Pricing overflow: totals must be non-negative integers.");
  }

  return {
    unitPriceMinor,
    subtotalMinor,
    deliveryFeeMinor,
    discountMinor,
    totalMinor,
    currency: DEFAULT_CURRENCY,
  };
}
