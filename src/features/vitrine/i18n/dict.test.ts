import { describe, expect, it } from "vitest";
import { PRODUCT_TYPES } from "@/domain/orders/productTypes";
import { getDict, resolveLocale } from "./index";
import { VITRINE_LOCALES } from "./dict";

describe("vitrine dictionaries", () => {
  it("covers all three locales with complete product copy", () => {
    for (const locale of VITRINE_LOCALES) {
      const dict = getDict(locale);
      for (const product of PRODUCT_TYPES) {
        const copy = dict.products[product];
        expect(copy.name.length, `${locale}.${product}.name`).toBeGreaterThan(0);
        expect(copy.tagline.length, `${locale}.${product}.tagline`).toBeGreaterThan(0);
        expect(copy.outcome.length, `${locale}.${product}.outcome`).toBeGreaterThan(0);
        expect(copy.audience.length, `${locale}.${product}.audience`).toBeGreaterThan(0);
        expect(copy.benefits.length, `${locale}.${product}.benefits`).toBeGreaterThan(0);
        expect(copy.steps.length, `${locale}.${product}.steps`).toBeGreaterThan(0);
        expect(copy.faq.length, `${locale}.${product}.faq`).toBeGreaterThan(0);
      }
      expect(dict.order.steps.card.length).toBeGreaterThan(0);
      expect(dict.success.title.length).toBeGreaterThan(0);
      expect(dict.contact.submit.length).toBeGreaterThan(0);
    }
  });

  it("marks Arabic RTL and others LTR", () => {
    expect(getDict("ar").dir).toBe("rtl");
    expect(getDict("fr").dir).toBe("ltr");
    expect(getDict("en").dir).toBe("ltr");
  });

  it("falls back to French for unknown locales", () => {
    expect(resolveLocale("de")).toBe("fr");
    expect(resolveLocale(null)).toBe("fr");
    expect(resolveLocale("ar")).toBe("ar");
  });
});
