import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fr/products/personal-card",
}));
import { getDict } from "../i18n";
import { VITRINE_LOCALES } from "../i18n/dict";
import { SiteFooter } from "./Footer";

function mobileHtml(locale: "fr" | "ar" | "en"): string {
  // Both trees render in static markup; the mobile tree carries md:hidden.
  return renderToStaticMarkup(createElement(SiteFooter, { locale, dict: getDict(locale) }));
}

describe("mobile footer", () => {
  it("offers order + contact CTAs without scrolling back up", () => {
    for (const locale of VITRINE_LOCALES) {
      const html = mobileHtml(locale);
      expect(html).toContain(`/${locale}/order`);
      expect(html).toContain(`/${locale}/contact`);
    }
  });

  it("lists solutions alongside products, help, and legal", () => {
    const html = mobileHtml("fr");
    expect(html).toContain("/fr/solutions/professionals");
    expect(html).toContain("/fr/solutions/students-job-seekers");
    expect(html).toContain("/fr/solutions/businesses");
    expect(html).toContain("/fr/faq");
    expect(html).toContain("/fr/privacy");
  });

  it("uses no card-like boxes in the mobile tree (menu rows + hairlines)", () => {
    const html = mobileHtml("fr");
    expect(html).toContain("divide-white/10");
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).not.toContain("rounded-2xl");
    expect(html).not.toContain("rounded-xl");
  });

  it("renders products as cards and groups as accordions, not stacked lists", () => {
    const html = mobileHtml("fr");
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
  });

  it("keeps 44px touch targets on links and the language switcher", () => {
    const html = mobileHtml("fr");
    expect(html).not.toContain("min-h-10 ");
    expect(html).not.toContain("min-h-9 ");
    expect(html).toContain("min-h-11");
  });

  it("stacks the bottom bar centered with an operable cookie button", () => {
    const html = mobileHtml("ar");
    expect(html).toContain("flex-col items-center");
    expect(html).toContain('data-testid="cookie-preferences"');
    expect(html).not.toContain("undefined");
  });

  it("renders a segmented language control with full names in both trees", () => {
    for (const locale of VITRINE_LOCALES) {
      const html = mobileHtml(locale);
      expect(html).toContain("Français");
      expect(html).toContain("العربية");
      expect(html).toContain("English");
      expect(html).toContain('aria-current="true"');
      // Exactly the two non-current locales are anchors (mobile + desktop trees).
      for (const code of VITRINE_LOCALES.filter((c) => c !== locale)) {
        expect(html).toContain(`hrefLang="${code}"`);
      }
    }
  });

  it("keeps the visitor on the same page when switching language", () => {
    const html = mobileHtml("fr");
    expect(html).toContain('href="/ar/products/personal-card"');
    expect(html).toContain('href="/en/products/personal-card"');
    expect(html).not.toContain('href="/ar"');
    expect(html).not.toContain('href="/en"');
  });

  it("renders identically structured markup in every locale", () => {
    for (const locale of VITRINE_LOCALES) {
      const html = mobileHtml(locale);
      expect(html).toContain("KARTI");
      expect(html).toContain(`/${locale}/order`);
      expect(html).not.toContain("undefined");
    }
  });
});
