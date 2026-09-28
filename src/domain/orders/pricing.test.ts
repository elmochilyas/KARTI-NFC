import { describe, expect, it } from "vitest";
import { catalogIsQuoteOnly, priceOrder } from "./pricing";

describe("order pricing contract", () => {
  it("resolves every V1 product to QUOTE_REQUIRED with null totals", () => {
    expect(catalogIsQuoteOnly()).toBe(true);
    const quote = priceOrder({ productType: "PERSONAL_CARD", quantity: 2 });
    expect(quote.pricingStatus).toBe("QUOTE_REQUIRED");
    expect(quote.unitPriceMinor).toBeUndefined();
    expect(quote.subtotalMinor).toBeUndefined();
    expect(quote.totalMinor).toBeUndefined();
    expect(quote.discountMinor).toBe(0);
    expect(quote.currency).toBe("MAD");
  });

  it("rejects invalid quantities server-side", () => {
    expect(() => priceOrder({ productType: "PERSONAL_CARD", quantity: 0 })).toThrow();
    expect(() => priceOrder({ productType: "PERSONAL_CARD", quantity: -1 })).toThrow();
    expect(() => priceOrder({ productType: "PERSONAL_CARD", quantity: 1.5 })).toThrow();
  });

  it("rejects negative delivery fees and keeps integer minor units", () => {
    expect(() =>
      priceOrder({
        productType: "PERSONAL_CARD",
        quantity: 1,
        deliveryFeeMinor: -100,
      }),
    ).toThrow();
    expect(() =>
      priceOrder({
        productType: "PERSONAL_CARD",
        quantity: 1,
        deliveryFeeMinor: 10.5,
      }),
    ).toThrow();
  });

  it("takes no client-controlled price input (signature has no amount field)", () => {
    const quote = priceOrder({ productType: "WHATSAPP_CARD", quantity: 3 });
    expect(quote.pricingStatus).toBe("QUOTE_REQUIRED");
    expect("unitPriceMinor" in quote).toBe(false);
    expect(quote.subtotalMinor).toBeUndefined();
    expect(quote.totalMinor).toBeUndefined();
  });
});
