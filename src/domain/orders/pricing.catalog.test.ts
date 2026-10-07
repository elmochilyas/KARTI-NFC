import { describe, expect, it } from "vitest";
import { priceOrder } from "./pricing";

/**
 * Catalog-driven pricing: the live CMS row supplies the fixed base price
 * at order submission. The browser never supplies prices — `catalogPrice`
 * is server-loaded only. The snapshot is immutable history: later catalog
 * edits only affect NEW orders.
 */
describe("catalog-driven order pricing", () => {
  it("snapshots the fixed unit price with exact integer math", () => {
    const pricing = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 2,
      catalogPrice: { priceMinor: 19900, currency: "MAD" },
    });
    expect(pricing.unitPriceMinor).toBe(19900);
    expect(pricing.subtotalMinor).toBe(39800);
    expect(pricing.totalMinor).toBe(39800);
    expect(pricing.currency).toBe("MAD");
  });

  it("snapshot is pure integer math: unit × quantity", () => {
    const pricing = priceOrder({
      productType: "BUSINESS_CARD",
      quantity: 3,
      catalogPrice: { priceMinor: 24950, currency: "MAD" },
    });
    expect(pricing.subtotalMinor).toBe(24950 * 3);
  });

  it("applies delivery and discount on top of the immutable snapshot", () => {
    const pricing = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 2,
      deliveryFeeMinor: 3000,
      discountMinor: 500,
      catalogPrice: { priceMinor: 19900, currency: "MAD" },
    });
    expect(pricing.subtotalMinor).toBe(39800);
    expect(pricing.totalMinor).toBe(39800 + 3000 - 500);
  });

  it("a later catalog price changes only new snapshots (historical orders never recomputed)", () => {
    const orderA = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 2,
      catalogPrice: { priceMinor: 19900, currency: "MAD" },
    });
    const orderB = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 2,
      catalogPrice: { priceMinor: 24900, currency: "MAD" },
    });
    expect(orderA.unitPriceMinor).toBe(19900);
    expect(orderA.subtotalMinor).toBe(39800);
    expect(orderB.unitPriceMinor).toBe(24900);
    expect(orderB.subtotalMinor).toBe(49800);
  });

  it("rejects non-positive catalog prices instead of snapshotting them", () => {
    expect(() =>
      priceOrder({
        productType: "PERSONAL_CARD",
        quantity: 1,
        catalogPrice: { priceMinor: 0, currency: "MAD" },
      }),
    ).toThrow();
  });
});
