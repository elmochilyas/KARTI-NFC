/**
 * Public SEO regression (Phase 5 rules, Phase 6 §26).
 *
 * - Marketing pages: canonical + hreflang + indexable.
 * - Checkout/success: noindex.
 * - Sitemap: marketing only (no dashboard/order/t/API).
 * - Robots: dashboard/login/t/API disallowed.
 */
import { expect, test } from "@playwright/test";

test("homepage has canonical and hreflang alternates", async ({ page }) => {
  await page.goto("/fr");
  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute("href", /\/fr\/?$/);
  for (const lang of ["fr", "ar", "en", "x-default"]) {
    await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1);
  }
});

test("order and success routes are noindex", async ({ page }) => {
  await page.goto("/fr/order?product=personal-card");
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);

  await page.goto("/fr/order/success?r=KARTI-000001&t=" + "0".repeat(64));
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
});

test("sitemap lists marketing only; robots blocks private surfaces", async ({ page }) => {
  const sitemap = await page.goto("/sitemap.xml");
  expect(sitemap?.ok()).toBe(true);
  const xml = await sitemap?.text();
  expect(xml).toContain("/fr");
  for (const blocked of ["/dashboard", "/t/", "/api/", "order/success", "/login"]) {
    expect(xml).not.toContain(blocked);
  }

  const robots = await page.goto("/robots.txt");
  expect(robots?.ok()).toBe(true);
  const txt = await robots?.text();
  for (const blocked of ["/dashboard", "/login", "/t/", "/api/"]) {
    expect(txt).toContain(blocked);
  }
});
