import { describe, expect, it } from "vitest";
import { priceOrder } from "./pricing";

describe("order pricing contract", () => {
  it("snapshots the fixed catalog price: unit × quantity, total = subtotal + delivery − discount", () => {
    const pricing = priceOrder({
      productType: "WHATSAPP_CARD",
      quantity: 2,
      catalogPrice: { priceMinor: 19900, currency: "MAD" },
      deliveryFeeMinor: 3000,
    });
    expect(pricing.unitPriceMinor).toBe(19900);
    expect(pricing.subtotalMinor).toBe(39800);
    expect(pricing.deliveryFeeMinor).toBe(3000);
    expect(pricing.discountMinor).toBe(0);
    expect(pricing.totalMinor).toBe(42800);
    expect(pricing.currency).toBe("MAD");
  });

  it("defaults delivery and discount to zero", () => {
    const pricing = priceOrder({
      productType: "PERSONAL_CARD",
      quantity: 1,
      catalogPrice: { priceMinor: 19900, currency: "MAD" },
    });
    expect(pricing.totalMinor).toBe(19900);
  });

  it("refuses an unconfigured catalog price instead of inventing one", () => {
    expect(() =>
      priceOrder({ productType: "PERSONAL_CARD", quantity: 1, catalogPrice: null }),
    ).toThrow();
  });

  it("rejects invalid quantities server-side", () => {
    const price = { priceMinor: 19900, currency: "MAD" } as const;
    expect(() =>
      priceOrder({ productType: "PERSONAL_CARD", quantity: 0, catalogPrice: price }),
    ).toThrow();
    expect(() =>
      priceOrder({ productType: "PERSONAL_CARD", quantity: -1, catalogPrice: price }),
    ).toThrow();
    expect(() =>
      priceOrder({ productType: "PERSONAL_CARD", quantity: 1.5, catalogPrice: price }),
    ).toThrow();
  });

  it("rejects negative delivery fees and keeps integer minor units", () => {
    const price = { priceMinor: 19900, currency: "MAD" } as const;
    expect(() =>
      priceOrder({
        productType: "PERSONAL_CARD",
        quantity: 1,
        deliveryFeeMinor: -100,
        catalogPrice: price,
      }),
    ).toThrow();
    expect(() =>
      priceOrder({
        productType: "PERSONAL_CARD",
        quantity: 1,
        deliveryFeeMinor: 10.5,
        catalogPrice: price,
      }),
    ).toThrow();
  });

  it("takes no client-controlled price input (signature has no amount field)", () => {
    const pricing = priceOrder({
      productType: "WHATSAPP_CARD",
      quantity: 3,
      catalogPrice: { priceMinor: 19900, currency: "MAD" },
    });
    expect(pricing.unitPriceMinor).toBe(19900);
    expect(pricing.subtotalMinor).toBe(59700);
    expect(pricing.totalMinor).toBe(59700);
  });
});
