/**
 * Public E2E — GTM + Consent Mode foundation (public vitrine only).
 *
 * Hermetic: no database writes, no order submission. Asserts the consent
 * ordering (dataLayer → default denied → stored choice → events), the
 * localized banner behavior, receipt-URL sanitization, and that private
 * routes never load marketing GTM.
 *
 * Note: the test server runs without NEXT_PUBLIC_GTM_ID, which is exactly
 * requirement A — the app works and GTM simply does not inject.
 */
import { expect, test, type Page } from "@playwright/test";

type DataLayerEntry = Record<string, unknown> | unknown[];

async function dataLayer(page: Page): Promise<unknown[]> {
  return page.evaluate(() => {
    const layer = ((window as unknown as { dataLayer?: DataLayerEntry }).dataLayer ??
      []) as DataLayerEntry[];
    return layer.map((entry: DataLayerEntry) =>
      Array.isArray(entry) ? [...entry] : { ...(entry as Record<string, unknown>) },
    );
  });
}

function consentCommands(layer: unknown[]): Array<{ mode: string; params: unknown }> {
  const out: Array<{ mode: string; params: unknown }> = [];
  for (const entry of layer) {
    if (Array.isArray(entry) && entry[0] === "consent") {
      out.push({ mode: entry[1] as string, params: entry[2] });
    }
  }
  return out;
}

function events(layer: unknown[]): Array<Record<string, unknown>> {
  return layer.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry) && "event" in entry,
  );
}

test("without NEXT_PUBLIC_GTM_ID the app works and GTM is not injected", async ({ page }) => {
  await page.goto("/fr");
  await expect(page.locator("main#main-content")).toBeVisible();
  // No GTM container script, no noscript iframe.
  expect(await page.locator('script[src*="googletagmanager.com"]').count()).toBe(0);
  expect(await page.locator('iframe[src*="googletagmanager.com"]').count()).toBe(0);
  // dataLayer still exists (early events queue, nothing throws).
  const isArray = await page.evaluate(() => Array.isArray(
    (window as unknown as { dataLayer?: unknown }).dataLayer,
  ));
  expect(isArray).toBe(true);
});

test("consent default is denied before any analytics flows", async ({ page }) => {
  await page.goto("/fr");
  // Hydration race: the bootstrap effect runs right after load — poll briefly.
  await expect
    .poll(async () => consentCommands(await dataLayer(page)).length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1);
  const layer = await dataLayer(page);
  const commands = consentCommands(layer);
  expect(commands.length).toBeGreaterThanOrEqual(1);
  expect(commands[0]?.mode).toBe("default");
  const params = commands[0]?.params as Record<string, string>;
  expect(params.analytics_storage).toBe("denied");
  expect(params.ad_storage).toBe("denied");
  expect(params.ad_user_data).toBe("denied");
  expect(params.ad_personalization).toBe("denied");
});

test("accepting analytics grants measurement only; choice persists", async ({ page }) => {
  await page.goto("/fr");
  const banner = page.getByTestId("consent-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Cookies et mesure d'audience");
  await page.getByTestId("consent-accept").click();
  await expect(banner).toBeHidden();

  const layer = await dataLayer(page);
  const updates = consentCommands(layer).filter((c) => c.mode === "update");
  expect(updates.length).toBeGreaterThanOrEqual(1);
  const params = updates[updates.length - 1]?.params as Record<string, string>;
  expect(params.analytics_storage).toBe("granted");
  expect(params.ad_storage).toBe("denied");
  expect(params.ad_user_data).toBe("denied");
  expect(params.ad_personalization).toBe("denied");

  // Stored consent restores: no banner after reload.
  await page.reload();
  await expect(page.getByTestId("consent-banner")).toBeHidden();
});

test("rejecting keeps everything denied; footer reopens preferences", async ({ page }) => {
  await page.goto("/fr");
  await page.getByTestId("consent-reject").click();
  await expect(page.getByTestId("consent-banner")).toBeHidden();

  let layer = await dataLayer(page);
  const updates = consentCommands(layer).filter((c) => c.mode === "update");
  expect(updates.length).toBeGreaterThanOrEqual(1);
  const params = updates[updates.length - 1]?.params as Record<string, string>;
  expect(params.analytics_storage).toBe("denied");

  // Footer preferences button reopens the banner for later changes.
  await page.getByTestId("cookie-preferences").click();
  await expect(page.getByTestId("consent-banner")).toBeVisible();
  layer = await dataLayer(page);
  expect(JSON.stringify(layer)).not.toContain("KARTI-");
});

test("product → order navigation keeps analytics flowing (no duplicates)", async ({ page }) => {
  // Dismiss consent first so the banner never overlaps CTAs.
  await page.goto("/fr");
  await page.getByTestId("consent-reject").click();
  await page.goto("/fr/products/personal-card");
  await page
    .locator('a[href*="/fr/order?product=personal-card"]:visible')
    .first()
    .click();
  await expect(page).toHaveURL(/\/fr\/order\?product=personal-card/);

  const layer = await dataLayer(page);
  const pageViews = events(layer).filter((e) => e["event"] === "page_view");
  const orderPaths = pageViews.filter((e) => e["page_path"] === "/fr/order");
  expect(orderPaths.length).toBe(1);
  // Order funnel telemetry arrives alongside the centralized page_view.
  expect(events(layer).some((e) => e["event"] === "order_started")).toBe(true);
});

test("success receipt credentials never enter dataLayer", async ({ page }) => {
  const token = `r=KARTI-000001&t=${"a".repeat(64)}`;
  await page.goto(`/fr/order/success?${token}`);
  // Wait for the centralized page_view (hydration race — see above).
  await expect
    .poll(
      async () =>
        events(await dataLayer(page)).filter((e) => e["event"] === "page_view").length,
      { timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(1);
  const layer = await dataLayer(page);
  expect(JSON.stringify(layer)).not.toContain("KARTI-000001");
  expect(JSON.stringify(layer)).not.toContain("a".repeat(16));
  const pageViews = events(layer).filter((e) => e["event"] === "page_view");
  expect(pageViews.some((e) => e["page_path"] === "/fr/order/success")).toBe(true);
});

test("private routes never load marketing GTM or the consent banner", async ({ page }) => {
  await page.goto("/login");
  expect(await page.locator('script[src*="googletagmanager.com"]').count()).toBe(0);
  expect(await page.locator('iframe[src*="googletagmanager.com"]').count()).toBe(0);
  expect(await page.getByTestId("consent-banner").count()).toBe(0);

  await page.goto("/dashboard");
  // Anonymous dashboard access redirects to login — still no GTM.
  await expect(page).toHaveURL(/\/login/);
  expect(await page.locator('script[src*="googletagmanager.com"]').count()).toBe(0);
  expect(await page.getByTestId("consent-banner").count()).toBe(0);
});
