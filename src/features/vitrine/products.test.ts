import { describe, expect, it } from "vitest";
import { PRODUCT_TYPES } from "@/domain/orders/productTypes";
import { allProducts, productSlugFromType, productTypeFromSlug, relatedProducts } from "./products";

describe("product slug mapping", () => {
  it("maps all eight public slugs to canonical types and back", () => {
    const pairs: [string, string][] = [
      ["personal-card", "PERSONAL_CARD"],
      ["career-card", "CAREER_CARD"],
      ["business-card", "BUSINESS_CARD"],
      ["google-review-card", "GOOGLE_REVIEW_CARD"],
      ["whatsapp-card", "WHATSAPP_CARD"],
      ["instagram-card", "INSTAGRAM_CARD"],
      ["contact-card", "CONTACT_CARD"],
      ["custom-link-card", "CUSTOM_LINK_CARD"],
    ];
    for (const [slug, type] of pairs) {
      expect(productTypeFromSlug(slug)).toBe(type);
    }
    for (const type of PRODUCT_TYPES) {
      expect(productTypeFromSlug(productSlugFromType(type))).toBe(type);
    }
  });

  it("falls back safely on invalid product queries", () => {
    expect(productTypeFromSlug("unknown-thing")).toBeNull();
    expect(productTypeFromSlug("")).toBeNull();
    expect(productTypeFromSlug(null)).toBeNull();
    expect(productTypeFromSlug(undefined)).toBeNull();
    expect(productTypeFromSlug("PERSONAL_CARD")).toBeNull();
    expect(productTypeFromSlug("../admin")).toBeNull();
  });

  it("is case- and whitespace-tolerant", () => {
    expect(productTypeFromSlug("  Personal-Card ")).toBe("PERSONAL_CARD");
  });

  it("lists every product exactly once", () => {
    expect(allProducts().sort()).toEqual([...PRODUCT_TYPES].sort());
  });

  it("suggests related products without self", () => {
    const related = relatedProducts("PERSONAL_CARD");
    expect(related).toHaveLength(3);
    expect(related).not.toContain("PERSONAL_CARD");
  });
});
