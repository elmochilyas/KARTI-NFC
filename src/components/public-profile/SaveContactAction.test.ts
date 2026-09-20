import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  SAVE_CONTACT_OPENING_TIMEOUT_MS,
  SaveContactAction,
  SaveContactFallback,
  buildVCardIntentUrl,
  shouldAttemptAndroidIntent,
  supportsVCardFileShare,
  vcardShareFilename,
} from "./SaveContactAction";

const HREF = "/api/vcard/ahmed-benali.vcf";

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

  it("navigates directly: no Blob download, no intent URL, no new tab", () => {
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

describe("vcardShareFilename", () => {
  it("keeps the .vcf name from suffixed hrefs", () => {
    expect(vcardShareFilename("/api/vcard/ahmed-benali.vcf")).toBe("ahmed-benali.vcf");
  });

  it("adds the suffix for extension-less hrefs and strips queries", () => {
    expect(vcardShareFilename("/api/vcard/ahmed-benali")).toBe("ahmed-benali.vcf");
    expect(vcardShareFilename("/api/vcard/ahmed-benali.vcf?x=1")).toBe("ahmed-benali.vcf");
  });

  it("falls back to a safe name for empty paths", () => {
    expect(vcardShareFilename("/")).toBe("karti-contact.vcf");
    expect(vcardShareFilename("")).toBe("karti-contact.vcf");
  });
});

describe("buildVCardIntentUrl", () => {
  it("builds a VIEW intent for the vCard with an encoded browser fallback", () => {
    const intent = buildVCardIntentUrl(
      "https://karti.app/api/vcard/ahmed-benali.vcf",
      "https://karti.app/ahmed-benali",
    );
    expect(intent).toBe(
      "intent://karti.app/api/vcard/ahmed-benali.vcf" +
        "#Intent;scheme=https;action=android.intent.action.VIEW" +
        ";category=android.intent.category.BROWSABLE;type=text/x-vcard" +
        ";S.browser_fallback_url=https%3A%2F%2Fkarti.app%2Fahmed-benali;end",
    );
  });

  it("rejects non-HTTP(S) and malformed inputs", () => {
    expect(buildVCardIntentUrl("javascript:alert(1)", "https://karti.app/x")).toBeNull();
    expect(
      buildVCardIntentUrl("https://karti.app/api/vcard/x.vcf", "javascript:alert(1)"),
    ).toBeNull();
    expect(buildVCardIntentUrl("not a url", "https://karti.app/x")).toBeNull();
  });
});

describe("shouldAttemptAndroidIntent", () => {
  const CHROME_ANDROID =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
  const SAMSUNG =
    "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/126.0.0.0 Mobile Safari/537.36";
  const FIREFOX_ANDROID = "Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0";
  const IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  const DESKTOP_CHROME =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

  it("allows Chrome on Android only", () => {
    expect(shouldAttemptAndroidIntent(CHROME_ANDROID)).toBe(true);
    expect(shouldAttemptAndroidIntent(SAMSUNG)).toBe(false);
    expect(shouldAttemptAndroidIntent(FIREFOX_ANDROID)).toBe(false);
    expect(shouldAttemptAndroidIntent(IPHONE)).toBe(false);
    expect(shouldAttemptAndroidIntent(DESKTOP_CHROME)).toBe(false);
  });

  it("honors an explicit Android platform hint", () => {
    expect(shouldAttemptAndroidIntent("Chrome/126.0.0.0", "Android")).toBe(true);
    expect(shouldAttemptAndroidIntent(CHROME_ANDROID, "Windows")).toBe(true);
  });
});

describe("supportsVCardFileShare", () => {
  it("reports false without share/canShare functions", () => {
    expect(supportsVCardFileShare({})).toBe(false);
    expect(supportsVCardFileShare({ share: async () => {} })).toBe(false);
  });

  it("defers to the platform canShare verdict", () => {
    expect(
      supportsVCardFileShare({
        share: async () => {},
        canShare: () => true,
      }),
    ).toBe(true);
    expect(
      supportsVCardFileShare({
        share: async () => {},
        canShare: () => false,
      }),
    ).toBe(false);
    expect(
      supportsVCardFileShare({
        share: async () => {},
        canShare: () => {
          throw new Error("unsupported");
        },
      }),
    ).toBe(false);
  });
});
