/**
 * Public E2E — marketing → product → order entry (spec 08 E2E-01 shape).
 *
 * No database writes: asserts routing, product preselection, and safe
 * fallbacks only. Submission/idempotency are covered by action unit tests
 * and live disposable RPC proofs.
 */
import { expect, test } from "@playwright/test";

test("root redirects to the French vitrine", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/fr\/?$/);
});

test("product page order CTA preserves the selected product", async ({ page }) => {
  await page.goto("/fr/products/personal-card");
  // :visible — the mobile sticky CTA shares the href but stays hidden on desktop.
  const cta = page.locator('a[href*="/fr/order?product=personal-card"]:visible').first();
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page).toHaveURL(/\/fr\/order\?product=personal-card/);
  // Preselected: no product picker, config fields shown directly.
  await expect(page.locator('[role="radiogroup"]')).toHaveCount(0);
  await expect(page.locator("#order-fullName")).toBeVisible();
});

test("order without a product shows the selector; invalid slug falls back safely", async ({
  page,
}) => {
  await page.goto("/fr/order");
  await expect(page.locator('[role="radiogroup"]').first()).toBeVisible();

  await page.goto("/fr/order?product=bogus-slug");
  // No crash: falls back to the product selector.
  await expect(page.locator('[role="radiogroup"]').first()).toBeVisible();
});

test("custom-link product exposes its destination field", async ({ page }) => {
  await page.goto("/fr/order?product=custom-link-card");
  await expect(page.locator("#order-destinationUrl")).toBeVisible();
});
