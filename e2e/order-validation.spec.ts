/**
 * Public E2E — wizard validation (spec 08 E2E-05/E2E-09 shape, client side).
 *
 * Fills the four-step wizard up to the review step without submitting, so
 * no order rows are created. Server-side rejection of the same shapes is
 * covered by actions.test.ts.
 */
import { expect, test, type Page } from "@playwright/test";

async function continueStep(page: Page) {
  await page.getByRole("button", { name: "Continuer" }).click();
}

test("custom-link rejects unsafe protocols before leaving step 1", async ({ page }) => {
  await page.goto("/fr/order?product=custom-link-card");
  await page.locator("#order-destinationUrl").fill("javascript:alert(1)");
  await continueStep(page);
  await expect(page.locator('[role="alert"]').first()).toBeVisible();
  // Still on step 1: destination field remains visible.
  await expect(page.locator("#order-destinationUrl")).toBeVisible();
});

test("EMAIL preferred contact requires an email address", async ({ page }) => {
  await page.goto("/fr/order?product=personal-card");
  await page.locator("#order-fullName").fill("Salma E2E");
  await continueStep(page);

  await page.locator("#order-fullName").fill("Salma E2E");
  await page.locator("#order-phone").fill("0612345678");
  // Preferred-contact radiogroup: pick EMAIL (last option).
  const contactOptions = page.locator('[role="radiogroup"] input[type="radio"]');
  await contactOptions.last().check();
  await continueStep(page);
  // Missing email blocks progress with a visible error.
  await expect(page.locator('[role="alert"]').first()).toBeVisible();
  await expect(page.locator("#order-email")).toBeVisible();

  await page.locator("#order-email").fill("salma@example.invalid");
  await continueStep(page);
  // Step 3 (delivery) reached.
  await expect(page.locator("#order-city")).toBeVisible();
});

test("delivery requires city and address", async ({ page }) => {
  await page.goto("/fr/order?product=personal-card");
  await page.locator("#order-fullName").fill("Salma E2E");
  await continueStep(page);

  await page.locator("#order-fullName").fill("Salma E2E");
  await page.locator("#order-phone").fill("0612345678");
  await continueStep(page);

  await expect(page.locator("#order-city")).toBeVisible();
  await continueStep(page);
  await expect(page.locator('[role="alert"]').first()).toBeVisible();

  await page.locator("#order-city").fill("Casablanca");
  await page.locator("#order-address").fill("12 rue E2E");
  await continueStep(page);
  // Step 4 (review) reached: pricing summary section visible.
  await expect(page.locator("section").first()).toBeVisible();
});

test("contact form validates without submitting", async ({ page }) => {
  await page.goto("/fr/contact");
  const submit = page.getByRole("button").last();
  await submit.click();
  // Client-side validation surfaces; the page does not navigate away.
  await expect(page).toHaveURL(/\/fr\/contact/);
});
