import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("marketing sitemap", () => {
  it("lists every indexable route in every locale", () => {
    const entries = sitemap();
    // 24 registry routes × 3 locales
    expect(entries).toHaveLength(72);
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain("http://localhost:3000/fr");
    expect(urls).toContain("http://localhost:3000/ar/products/personal-card");
    expect(urls).toContain("http://localhost:3000/en/solutions/businesses");
    expect(urls).toContain("http://localhost:3000/fr/resources/nfc-vs-qr");
    expect(urls).toContain("http://localhost:3000/fr/privacy");
    expect(urls).toContain("http://localhost:3000/fr/how-it-works");
  });

  it("excludes operational and private surfaces", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const url of urls) {
      expect(url).not.toContain("/order");
      expect(url).not.toContain("/dashboard");
      expect(url).not.toContain("/t/");
      expect(url).not.toContain("/api/");
      expect(url).not.toContain("/login");
    }
  });

  it("prioritizes home above products above the rest", () => {
    const byUrl = new Map(sitemap().map((entry) => [entry.url, entry]));
    expect(byUrl.get("http://localhost:3000/fr")?.priority).toBe(1);
    expect(byUrl.get("http://localhost:3000/fr/products/personal-card")?.priority).toBe(0.9);
    expect(byUrl.get("http://localhost:3000/fr/pricing")?.priority).toBe(0.7);
  });
});
