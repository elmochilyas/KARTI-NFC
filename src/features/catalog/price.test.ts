import { describe, expect, it } from "vitest";
import { catalogPriceDecimal, catalogPriceDisplay, hasCatalogPrice } from "./price";

describe("catalog price display", () => {
  it("shows the exact fixed price", () => {
    expect(catalogPriceDisplay({ priceMinor: 19900 })).toBe("199.00 MAD");
    expect(catalogPriceDisplay({ priceMinor: 24950 })).toBe("249.50 MAD");
  });

  it("shows nothing while the price is not configured (never a zero)", () => {
    expect(catalogPriceDisplay({ priceMinor: null })).toBeNull();
    expect(hasCatalogPrice({ priceMinor: null })).toBe(false);
  });

  it("rejects non-positive or unsafe amounts (no schema price without a real price)", () => {
    expect(catalogPriceDisplay({ priceMinor: 0 })).toBeNull();
    expect(catalogPriceDisplay({ priceMinor: -100 })).toBeNull();
    expect(hasCatalogPrice({ priceMinor: 0 })).toBe(false);
  });

  it("derives the JSON-LD decimal from the same minor units", () => {
    expect(catalogPriceDecimal(19900)).toBe("199.00");
    expect(catalogPriceDecimal(24950)).toBe("249.50");
    expect(catalogPriceDecimal(0)).toBeNull();
    expect(catalogPriceDecimal(-5)).toBeNull();
  });
});
