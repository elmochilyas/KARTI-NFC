import { describe, expect, it } from "vitest";
import {
  alternateUrls,
  articlePath,
  indexableRoutes,
  legalPath,
  localePath,
  orderPath,
  productPath,
  solutionKeyToSlug,
  solutionPath,
  solutionSlugToKey,
} from "./site";

describe("marketing site registry", () => {
  it("builds locale-prefixed paths", () => {
    expect(localePath("fr")).toBe("/fr");
    expect(localePath("ar", "pricing")).toBe("/ar/pricing");
    expect(productPath("en", "google-review-card")).toBe("/en/products/google-review-card");
    expect(solutionPath("fr", "businesses")).toBe("/fr/solutions/businesses");
    expect(articlePath("ar", "nfc-vs-qr")).toBe("/ar/resources/nfc-vs-qr");
    expect(legalPath("en", "privacy")).toBe("/en/privacy");
    expect(orderPath("fr")).toBe("/fr/order");
    expect(orderPath("fr", "career-card")).toBe("/fr/order?product=career-card");
  });

  it("maps solution slugs to dict keys and back", () => {
    expect(solutionSlugToKey("students-job-seekers")).toBe("students");
    expect(solutionSlugToKey("nope")).toBeNull();
    expect(solutionKeyToSlug("students")).toBe("students-job-seekers");
    expect(solutionKeyToSlug("professionals")).toBe("professionals");
  });

  it("indexes exactly the shippable marketing surface", () => {
    const routes = indexableRoutes();
    // home + how/pricing/examples/faq/resources/contact + 8 products
    // + 3 solutions + 3 articles + 3 legal = 24
    expect(routes).toHaveLength(24);
    const keys = routes.map((route) => route.key);
    expect(keys).toContain("home");
    expect(keys).toContain("product:google-review-card");
    expect(keys).toContain("solution:businesses");
    expect(keys).toContain("article:nfc-vs-qr");
    expect(keys).toContain("legal:privacy");
    expect(keys.some((key) => key.includes("order"))).toBe(false);
  });

  it("exposes one URL per locale for hreflang", () => {
    const alternates = alternateUrls("https://karti.app", ["pricing"]);
    expect(alternates).toEqual([
      { locale: "fr", url: "https://karti.app/fr/pricing" },
      { locale: "ar", url: "https://karti.app/ar/pricing" },
      { locale: "en", url: "https://karti.app/en/pricing" },
    ]);
  });
});
