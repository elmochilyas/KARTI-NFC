import { describe, expect, it } from "vitest";
import { catalogPriceDecimal, catalogPriceDisplay, hasCatalogPrice } from "./price";

describe("catalog price display", () => {
  it("shows the exact price for FIXED products", () => {
    expect(catalogPriceDisplay({ pricingMode: "FIXED", priceMinor: 19900 })).toBe("199.00 MAD");
    expect(catalogPriceDisplay({ pricingMode: "FIXED", priceMinor: 24950 })).toBe("249.50 MAD");
  });

  it("prefixes floor prices for FROM products", () => {
    expect(catalogPriceDisplay({ pricingMode: "FROM", priceMinor: 19900 })).toBe("From 199.00 MAD");
  });

  it("shows nothing quotable for QUOTE products (never a zero)", () => {
    expect(catalogPriceDisplay({ pricingMode: "QUOTE", priceMinor: null })).toBeNull();
    expect(hasCatalogPrice({ pricingMode: "QUOTE", priceMinor: null })).toBe(false);
  });

  it("rejects non-positive or unsafe amounts (no schema price without a real price)", () => {
    expect(catalogPriceDisplay({ pricingMode: "FIXED", priceMinor: 0 })).toBeNull();
    expect(catalogPriceDisplay({ pricingMode: "FIXED", priceMinor: -100 })).toBeNull();
    expect(catalogPriceDisplay({ pricingMode: "FIXED", priceMinor: null })).toBeNull();
    expect(hasCatalogPrice({ pricingMode: "FIXED", priceMinor: 0 })).toBe(false);
  });

  it("derives the JSON-LD decimal from the same minor units", () => {
    expect(catalogPriceDecimal(19900)).toBe("199.00");
    expect(catalogPriceDecimal(24950)).toBe("249.50");
    expect(catalogPriceDecimal(0)).toBeNull();
    expect(catalogPriceDecimal(-5)).toBeNull();
  });
});
