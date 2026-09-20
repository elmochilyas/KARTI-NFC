import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  SAVE_CONTACT_OPENING_TIMEOUT_MS,
  SaveContactAction,
  SaveContactFallback,
} from "./SaveContactAction";

const HREF = "/api/vcard/ahmed-benali";

function render(variant: "cta" | "sticky"): string {
  return renderToStaticMarkup(
    createElement(SaveContactAction, { href: HREF, accent: "#0e7c5b", variant }),
  );
}

describe("SaveContactAction", () => {
  it("targets the canonical vCard endpoint without a download attribute", () => {
    for (const variant of ["cta", "sticky"] as const) {
      const html = render(variant);
      expect(html).toContain(`href="${HREF}"`);
      expect(html).not.toMatch(/\bdownload\b/i);
    }
  });

  it("shows one clear Save Contact action with no technical wording", () => {
    for (const variant of ["cta", "sticky"] as const) {
      const html = render(variant);
      // Visible label is exactly Save Contact…
      expect(html).toContain(">Save Contact<");
      // …with no technical file-format words facing normal users.
      // (The href path legitimately contains `/api/vcard/`.)
      expect(html).not.toContain("Download file");
      expect(html).not.toContain(">VCF<");
      expect(html).not.toContain(">vCard<");
    }
  });

  it("navigates directly: no Blob fetch, no intent URL, no new tab", () => {
    for (const variant of ["cta", "sticky"] as const) {
      const html = render(variant);
      expect(html).not.toContain("intent://");
      expect(html).not.toContain("javascript:");
      // The Save anchor itself carries no target/download attributes.
      const anchors = html.match(/<a[^>]*href="\/api\/vcard[^"]*"[^>]*>/g) ?? [];
      expect(anchors).toHaveLength(1);
      for (const anchor of anchors) {
        expect(anchor).not.toMatch(/\btarget\s*=/i);
        expect(anchor).not.toMatch(/\bdownload\s*=/i);
      }
    }
  });

  it("waits a sane beat before offering the fallback", () => {
    expect(SAVE_CONTACT_OPENING_TIMEOUT_MS).toBeGreaterThanOrEqual(2000);
    expect(SAVE_CONTACT_OPENING_TIMEOUT_MS).toBeLessThanOrEqual(10000);
  });
});

describe("SaveContactFallback", () => {
  it("reuses the canonical endpoint when the native flow did not open", () => {
    const html = renderToStaticMarkup(createElement(SaveContactFallback, { href: HREF }));
    expect(html).toContain("Couldn");
    expect(html).toContain("Download contact");
    expect(html).toContain(`href="${HREF}"`);
    // The fallback reuses the canonical endpoint as a plain same-tab link:
    // no forced-download attribute, no intent URL.
    expect(html).not.toMatch(/\bdownload\s*=/i);
    expect(html).not.toContain("intent://");
  });
});
