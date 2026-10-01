import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: (...args: any[]) => unknown) => fn,
}));

vi.mock("@/features/catalog/cache", () => ({
  getCachedPublishedFlags: vi.fn(),
}));

import { getCachedPublishedFlags } from "@/features/catalog/cache";
import sitemap from "./sitemap";

const ALL_PUBLISHED = {
  PERSONAL_CARD: true,
  CAREER_CARD: true,
  BUSINESS_CARD: true,
  GOOGLE_REVIEW_CARD: true,
  WHATSAPP_CARD: true,
  INSTAGRAM_CARD: true,
  CONTACT_CARD: true,
  CUSTOM_LINK_CARD: true,
};

describe("marketing sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedPublishedFlags).mockResolvedValue({ ...ALL_PUBLISHED });
  });

  it("lists every indexable route in every locale", async () => {
    const entries = await sitemap();
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

  it("excludes operational and private surfaces", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const url of urls) {
      expect(url).not.toContain("/order");
      expect(url).not.toContain("/dashboard");
      expect(url).not.toContain("/t/");
      expect(url).not.toContain("/api/");
      expect(url).not.toContain("/login");
    }
  });

  it("prioritizes home above products above the rest", async () => {
    const byUrl = new Map((await sitemap()).map((entry) => [entry.url, entry]));
    expect(byUrl.get("http://localhost:3000/fr")?.priority).toBe(1);
    expect(byUrl.get("http://localhost:3000/fr/products/personal-card")?.priority).toBe(0.9);
    expect(byUrl.get("http://localhost:3000/fr/pricing")?.priority).toBe(0.7);
  });

  it("excludes unpublished products so hidden products never index", async () => {
    vi.mocked(getCachedPublishedFlags).mockResolvedValue({
      ...ALL_PUBLISHED,
      PERSONAL_CARD: false,
    });
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).not.toContain("http://localhost:3000/fr/products/personal-card");
    expect(urls).not.toContain("http://localhost:3000/ar/products/personal-card");
    expect(urls).not.toContain("http://localhost:3000/en/products/personal-card");
    expect(urls).toContain("http://localhost:3000/fr/products/career-card");
  });
});
