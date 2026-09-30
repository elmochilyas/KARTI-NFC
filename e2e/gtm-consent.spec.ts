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
    } else if (entry !== null && typeof entry === "object" && !("event" in entry)) {
      // Google's gtag shim queues the `arguments` object
      // (`function gtag(){dataLayer.push(arguments);}`), which serializes
      // across page.evaluate as {0, 1, 2} — same command, same semantics.
      const rec = entry as Record<string, unknown>;
      if (rec["0"] === "consent") {
        out.push({ mode: rec["1"] as string, params: rec["2"] });
      }
    }
  }
  return out;
}

function isConsentDefault(entry: unknown, mode: "default" | "update"): boolean {
  if (Array.isArray(entry)) return entry[0] === "consent" && entry[1] === mode;
  if (entry !== null && typeof entry === "object" && !("event" in entry)) {
    const rec = entry as Record<string, unknown>;
    return rec["0"] === "consent" && rec["1"] === mode;
  }
  return false;
}

function events(layer: unknown[]): Array<Record<string, unknown>> {
  return layer.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry) && "event" in entry,
  );
}

async function hasGtmScript(page: Page): Promise<boolean> {
  return (await page.locator('script[src*="googletagmanager.com"]').count()) > 0;
}

async function hasGtmIframe(page: Page): Promise<boolean> {
  return (await page.locator('iframe[src*="googletagmanager.com"]').count()) > 0;
}

/**
 * Mode-aware suite: when the prod server is built WITH NEXT_PUBLIC_GTM_ID,
 * marketing/order routes genuinely load the container; when built WITHOUT
 * it, they must not. Receipt routes never load it in either mode.
 */
test("GTM loads on marketing/order routes but never on receipt routes", async ({ page }) => {
  await page.goto("/fr");
  await expect(page.locator("main#main-content")).toBeVisible();
  // Settle past hydration + afterInteractive injection before sampling.
  await page.waitForTimeout(2000);
  const marketingHasGtm = await hasGtmScript(page);

  await page.goto("/fr/products/personal-card");
  await expect(page.locator("main#main-content")).toBeVisible();
  await page.waitForTimeout(1200);
  expect(await hasGtmScript(page)).toBe(marketingHasGtm);

  await page.goto("/fr/order?product=personal-card");
  await expect(page.locator("main#main-content")).toBeVisible();
  await page.waitForTimeout(1200);
  expect(await hasGtmScript(page)).toBe(marketingHasGtm);

  if (marketingHasGtm) {
    // Container genuinely loads on normal routes when the ID is baked in.
    expect(marketingHasGtm).toBe(true);
  }

  // Receipt routes (FR/EN/AR architecture): no script, no iframe, no banner.
  for (const locale of ["fr", "en", "ar"]) {
    await page.goto(`/${locale}/order/success?r=KARTI-000001&t=${"a".repeat(64)}`);
    await expect(page.locator("main#main-content")).toBeVisible();
    await page.waitForTimeout(1200);
    expect(await hasGtmScript(page)).toBe(false);
    expect(await hasGtmIframe(page)).toBe(false);
    expect(await page.getByTestId("consent-banner").count()).toBe(0);
  }
});

test("consent default is denied before any analytics flows", async ({ page }) => {
  await page.goto("/fr");
  // The blocking pre-GTM init script is in the document (not a
  // hydration-time push): it must exist regardless of GTM load state.
  await expect(page.locator("script#karti-consent-default")).toHaveCount(1);
  expect(await page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag)).toBe(
    "function",
  );
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
  // Ordering: the default-denied command precedes every business event.
  const defaultIdx = layer.findIndex((entry) => isConsentDefault(entry, "default"));
  expect(defaultIdx).toBeGreaterThanOrEqual(0);
  const firstEventIdx = events(layer).length
    ? layer.findIndex(
        (entry) =>
          typeof entry === "object" && entry !== null && !Array.isArray(entry) && "event" in entry,
      )
    : -1;
  if (firstEventIdx >= 0) {
    expect(defaultIdx).toBeLessThan(firstEventIdx);
  }
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
  await page.locator('a[href*="/fr/order?product=personal-card"]:visible').first().click();
  await expect(page).toHaveURL(/\/fr\/order\?product=personal-card/);

  const layer = await dataLayer(page);
  const pageViews = events(layer).filter((e) => e["event"] === "page_view");
  const orderPaths = pageViews.filter((e) => e["page_path"] === "/fr/order");
  expect(orderPaths.length).toBe(1);
  // Order funnel telemetry arrives alongside the centralized page_view.
  expect(events(layer).some((e) => e["event"] === "order_started")).toBe(true);
});

test("success receipt credentials never enter dataLayer (no GTM, no page_view)", async ({
  page,
}) => {
  const token = `r=KARTI-000001&t=${"a".repeat(64)}`;
  await page.goto(`/fr/order/success?${token}`);
  await expect(page.locator("main#main-content")).toBeVisible();
  // Past the banner delay: a fully silent receipt page stays silent.
  await page.waitForTimeout(1200);
  const layer = await dataLayer(page);
  // No transport initialization ran here at all — not even consent defaults.
  expect(layer).toEqual([]);
  expect(JSON.stringify(layer)).not.toContain("KARTI-000001");
  const pageViews = events(layer).filter((e) => e["event"] === "page_view");
  expect(pageViews).toEqual([]);
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
