/**
 * Operator quote money handling (specs/specs-vitrin/01 §10).
 *
 * Storage is integer minor units (MAD). The dashboard accepts decimal MAD
 * strings for usability; conversion uses string/integer math only — never
 * JS floating point on the storage path.
 */

export const MAD_MINOR_PER_MAJOR = 100;
export const MAD_CURRENCY = "MAD";
export const MAX_QUOTE_MINOR = Number.MAX_SAFE_INTEGER;

/** Non-negative safe-integer minor-unit check for RPC-bound amounts. */
export function isNonNegativeMinor(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_QUOTE_MINOR
  );
}

/**
 * Parse an operator-entered MAD decimal string ("1250", "1250.5",
 * "1250.50", "1 250,50") into integer minor units.
 * Returns null for anything that is not a non-negative amount with at
 * most two decimals. Comma is accepted as the decimal separator;
 * spaces are treated as thousand separators and stripped.
 */
export function parseMadDecimalToMinor(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const compact = raw.trim().replace(/\s+/g, "");
  if (compact === "") return null;
  if (/[^0-9.,]/.test(compact)) return null;

  const normalized = compact.replace(",", ".");
  const parts = normalized.split(".");
  if (parts.length > 2) return null;
  if (parts[0] === "" || !/^\d+$/.test(parts[0])) return null;

  const major = parts[0].replace(/^0+(?=\d)/, "");
  let minorText = "00";
  if (parts.length === 2) {
    if (!/^\d{1,2}$/.test(parts[1])) return null;
    minorText = parts[1].length === 1 ? `${parts[1]}0` : parts[1];
  }

  // Integer-only path: major * 100 + minor part (never floats).
  const majorNum = Number(major === "" ? "0" : major);
  const minorNum = Number(minorText);
  if (!Number.isSafeInteger(majorNum) || !Number.isSafeInteger(minorNum)) return null;
  const total = majorNum * MAD_MINOR_PER_MAJOR + minorNum;
  if (!Number.isSafeInteger(total) || total > MAX_QUOTE_MINOR) return null;
  return total;
}

/**
 * Server-side quote formula: total = subtotal + delivery − discount.
 * Returns null when the discount would drive the total negative.
 */
export function computeQuoteTotal(args: {
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
}): number | null {
  const { subtotalMinor, deliveryFeeMinor, discountMinor } = args;
  if (
    !isNonNegativeMinor(subtotalMinor) ||
    !isNonNegativeMinor(deliveryFeeMinor) ||
    !isNonNegativeMinor(discountMinor)
  ) {
    return null;
  }
  const total = subtotalMinor + deliveryFeeMinor - discountMinor;
  if (!Number.isSafeInteger(total) || total < 0) return null;
  return total;
}

/** Display-only formatting of minor units ("1250.50 MAD"). */
export function formatMinorToMad(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "—";
  if (!isNonNegativeMinor(minor)) return "—";
  return `${(minor / MAD_MINOR_PER_MAJOR).toFixed(2)} ${MAD_CURRENCY}`;
}
