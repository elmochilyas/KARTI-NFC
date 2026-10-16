/**
 * Consent-gated GTM loading pins (PageSpeed): the container must load
 * lazily and only after an analytics grant — never `afterInteractive` and
 * unconditionally. Static pins (the island itself needs a DOM + Next
 * router); behavior is proven in `e2e/gtm-consent.spec.ts`.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIR = __dirname;

function source(name: string): string {
  return fs.readFileSync(path.join(DIR, name), "utf8");
}

describe("GtmBootstrap (consent-gated, lazy)", () => {
  const bootstrap = source("GtmBootstrap.tsx");

  it("loads the container lazily, never render-blocking", () => {
    expect(bootstrap).toContain('strategy="lazyOnload"');
    expect(bootstrap).not.toContain("afterInteractive");
  });

  it("gates the container on an analytics grant (reject/missing → no bytes)", () => {
    expect(bootstrap).toContain("hasGrantedAnalyticsConsent");
    expect(bootstrap).toContain("CONSENT_CHANGE_EVENT");
    // No consent yet → render nothing (no script, no preconnect, no iframe).
    expect(bootstrap).toContain("if (!consented) return null;");
  });

  it("preconnects only when the container will actually load", () => {
    const preconnectAt = bootstrap.indexOf('rel="preconnect"');
    expect(preconnectAt).toBeGreaterThan(-1);
    const gateAt = bootstrap.indexOf("if (!consented) return null;");
    expect(preconnectAt).toBeGreaterThan(gateAt);
  });

  it("keeps the receipt-route + single-transport contracts", () => {
    expect(bootstrap).toContain("isReceiptRoute");
    expect(bootstrap).toContain("setAnalyticsTransport(null)");
    expect(bootstrap).toContain("setAnalyticsTransport(gtmTransport)");
  });

  it("banner notifies deferred loaders on every choice", () => {
    expect(source("ConsentBanner.tsx")).toContain("notifyConsentChange");
  });

  it("shell defers the banner island past first paint", () => {
    const shell = source("VitrineShell.tsx");
    expect(shell).toContain("ConsentBannerLazy");
    expect(shell).not.toContain('from "./ConsentBanner"');
  });
});
