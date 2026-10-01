import { formatMinorToMad, isNonNegativeMinor } from "@/domain/orders/money";
import type { CatalogPricingMode } from "./types";

/**
 * Catalog price display helpers (pure, unit-tested).
 *
 * - FIXED → "199.00 MAD" (exact visible price).
 * - FROM  → "From 199.00 MAD" (floor price, always prefixed — the JSON-LD
 *   Offer price equals this floor value so visible and schema prices match).
 * - QUOTE → null (caller renders the Request-price fallback; never a 0).
 */

export function catalogPriceDisplay(args: {
  pricingMode: CatalogPricingMode;
  priceMinor: number | null;
  fromPrefix?: string;
}): string | null {
  const prefix = args.fromPrefix ?? "From";
  if (args.pricingMode === "QUOTE" || args.priceMinor === null) return null;
  if (!isNonNegativeMinor(args.priceMinor) || args.priceMinor <= 0) return null;
  const formatted = formatMinorToMad(args.priceMinor);
  if (formatted === "—") return null;
  if (args.pricingMode === "FROM") return `${prefix} ${formatted}`;
  return formatted;
}

/** True only when the catalog row carries a truthful displayable price. */
export function hasCatalogPrice(args: {
  pricingMode: CatalogPricingMode;
  priceMinor: number | null;
}): boolean {
  return catalogPriceDisplay(args) !== null;
}

/** Visible decimal price for JSON-LD Offer (e.g. 19900 → "199.00"). */
export function catalogPriceDecimal(priceMinor: number): string | null {
  if (!isNonNegativeMinor(priceMinor) || priceMinor <= 0) return null;
  return (priceMinor / 100).toFixed(2);
}
