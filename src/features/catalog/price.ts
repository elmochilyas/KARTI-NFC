import { formatMinorToMad, isNonNegativeMinor } from "@/domain/orders/money";

/**
 * Catalog price display helpers (pure, unit-tested).
 *
 * Every product has exactly one fixed base price. A null/invalid
 * priceMinor means "Price not configured" (admin readiness state, never
 * shown publicly as a price) → display helpers return null.
 */

export function catalogPriceDisplay(args: { priceMinor: number | null }): string | null {
  if (args.priceMinor === null) return null;
  if (!isNonNegativeMinor(args.priceMinor) || args.priceMinor <= 0) return null;
  const formatted = formatMinorToMad(args.priceMinor);
  if (formatted === "—") return null;
  return formatted;
}

/** True only when the catalog row carries a truthful displayable price. */
export function hasCatalogPrice(args: { priceMinor: number | null }): boolean {
  return catalogPriceDisplay(args) !== null;
}

/** Visible decimal price for JSON-LD Offer (e.g. 19900 → "199.00"). */
export function catalogPriceDecimal(priceMinor: number): string | null {
  if (!isNonNegativeMinor(priceMinor) || priceMinor <= 0) return null;
  return (priceMinor / 100).toFixed(2);
}
