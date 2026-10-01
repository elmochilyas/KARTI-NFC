import { describe, expect, it } from "vitest";
import { priceOrder } from "./pricing";

/**
 * Catalog-driven pricing: the live CMS row overrides the static QUOTE
 * definition at order submission. The browser never supplies prices —
 * `catalogPrice` is server-loaded only.
 */
describe("catalog-driven order pricing", () => {
  it("snapshots a FIXED unit price while keeping the order total unknown (delivery quoted later)", () => {
    const pricing = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 2,
      catalogPrice: { pricingMode: "FIXED", priceMinor: 19900 },
    });
    expect(pricing.pricingStatus).toBe("QUOTE_REQUIRED");
    expect(pricing.unitPriceMinor).toBe(19900);
    expect(pricing.subtotalMinor).toBe(39800);
    expect(pricing.totalMinor).toBeUndefined();
    expect(pricing.currency).toBe("MAD");
  });

  it("snapshot is pure integer math: unit × quantity", () => {
    const pricing = priceOrder({
      productType: "BUSINESS_CARD",
      quantity: 3,
      catalogPrice: { pricingMode: "FIXED", priceMinor: 24950 },
    });
    expect(pricing.subtotalMinor).toBe(24950 * 3);
  });

  it("FROM snapshots the floor price (the page always prefixes “From”)", () => {
    const pricing = priceOrder({
      productType: "CAREER_CARD",
      quantity: 1,
      catalogPrice: { pricingMode: "FROM", priceMinor: 19900 },
    });
    expect(pricing.unitPriceMinor).toBe(19900);
    expect(pricing.subtotalMinor).toBe(19900);
    expect(pricing.totalMinor).toBeUndefined();
  });

  it("prices fully only when delivery is operator-resolved", () => {
    const pricing = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 2,
      deliveryFeeMinor: 3000,
      catalogPrice: { pricingMode: "FIXED", priceMinor: 19900 },
      deliveryPriced: true,
    });
    expect(pricing.pricingStatus).toBe("PRICED");
    expect(pricing.totalMinor).toBe(39800 + 3000);
  });

  it("a later catalog price changes only new snapshots (deterministic per input)", () => {
    const orderA = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 1,
      catalogPrice: { pricingMode: "FIXED", priceMinor: 19900 },
    });
    const orderB = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 1,
      catalogPrice: { pricingMode: "FIXED", priceMinor: 24900 },
    });
    expect(orderA.unitPriceMinor).toBe(19900);
    expect(orderB.unitPriceMinor).toBe(24900);
  });

  it("QUOTE catalog rows keep the historical quote flow (no price fields)", () => {
    const pricing = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 1,
      catalogPrice: { pricingMode: "QUOTE", priceMinor: null },
    });
    expect(pricing.pricingStatus).toBe("QUOTE_REQUIRED");
    expect("unitPriceMinor" in pricing).toBe(false);
    expect(pricing.subtotalMinor).toBeUndefined();
    expect(pricing.totalMinor).toBeUndefined();
  });

  it("rejects non-positive catalog prices instead of snapshotting them", () => {
    expect(() =>
      priceOrder({
        productType: "PERSONAL_CARD",
        quantity: 1,
        catalogPrice: { pricingMode: "FIXED", priceMinor: 0 },
      }),
    ).toThrow();
  });
});
