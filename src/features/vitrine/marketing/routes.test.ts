/**
 * Marketing route integrity (Phase 5): every internal link rendered by
 * the shell, home, product, solution, and hub pages must resolve to a
 * real registry route, order flow, or same-page anchor — never a dead
 * or nonexistent page.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getDict } from "../i18n";
import { HomePage } from "../HomePage";
import { ProductPage } from "../ProductPage";
import { PRODUCT_PUBLIC_SLUGS } from "../products";
import { SOLUTION_SLUGS } from "../site";
import { ExamplesHubPage, FaqHubPage, PricingPage, ResourcesPage, SolutionPage } from "./InfoPages";
import { SiteFooter } from "./Footer";
import { SiteHeader } from "./Header";
import { indexableRoutes } from "../site";
import { VITRINE_LOCALES } from "../i18n/dict";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fr",
  useRouter: () => ({ push: vi.fn() }),
}));

function hrefs(html: string): string[] {
  const found: string[] = [];
  const pattern = /href="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    found.push(match[1]);
  }
  return [...new Set(found)];
}

const REGISTRY_PATHS: ReadonlySet<string> = new Set(
  (["fr", "ar", "en"] as const).flatMap((locale) =>
    indexableRoutes().map(
      (route) => `/${locale}${route.segments.length > 0 ? `/${route.segments.join("/")}` : ""}`,
    ),
  ),
);

function isKnownMarketingHref(href: string): boolean {
  if (href.startsWith("#")) return true;
  if (href.startsWith("tel:") || href.startsWith("mailto:")) return true;
  if (href.startsWith("https://wa.me/")) return true;
  const [withoutQuery, query] = href.split("?");
  const [base] = withoutQuery.split("#");
  const match = /^\/(fr|ar|en)(\/.*)?$/.exec(base);
  if (!match) return false;
  const locale = match[1];
  const segments = (match[2] ?? "").split("/").filter(Boolean);
  if (segments.length === 0) return true;
  if (segments[0] === "order") {
    if (!query) return true;
    const product = new URLSearchParams(query).get("product");
    return product !== null && (PRODUCT_PUBLIC_SLUGS as readonly string[]).includes(product);
  }
  return REGISTRY_PATHS.has(`/${locale}/${segments.join("/")}`);
}

function renderShellBits(locale: "fr" | "ar" | "en"): string {
  const dict = getDict(locale);
  return (
    renderToStaticMarkup(createElement(SiteHeader, { locale, dict })) +
    renderToStaticMarkup(createElement(SiteFooter, { locale, dict }))
  );
}

describe("marketing link integrity", () => {
  it("renders shell navigation without dead links in every locale", () => {
    for (const locale of VITRINE_LOCALES) {
      const bad = hrefs(renderShellBits(locale)).filter((href) => !isKnownMarketingHref(href));
      expect(bad, `${locale} shell`).toEqual([]);
    }
  });

  it("renders home, product, solution, and hub pages without dead links", () => {
    const dict = getDict("fr");
    const pages = [
      renderToStaticMarkup(HomePage({ locale: "fr", dict })),
      renderToStaticMarkup(ProductPage({ locale: "fr", dict, slug: "google-review-card" })),
      renderToStaticMarkup(ProductPage({ locale: "fr", dict, slug: "career-card" })),
      renderToStaticMarkup(SolutionPage({ locale: "fr", dict, solution: "businesses" })),
      renderToStaticMarkup(PricingPage({ locale: "fr", dict })),
      renderToStaticMarkup(ExamplesHubPage({ locale: "fr", dict })),
      renderToStaticMarkup(FaqHubPage({ locale: "fr", dict })),
      renderToStaticMarkup(ResourcesPage({ locale: "fr", dict })),
    ];
    for (const html of pages) {
      expect(hrefs(html).filter((href) => !isKnownMarketingHref(href))).toEqual([]);
      expect(html).not.toContain("undefined");
    }
  });

  it("keeps product order CTAs on valid ?product= slugs", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(ProductPage({ locale: "fr", dict, slug: "whatsapp-card" }));
    expect(html).toContain("/fr/order?product=whatsapp-card");
  });

  it("exposes crawlable locale alternates in header and footer", () => {
    const html = renderShellBits("fr").toLowerCase();
    // React serializes the attribute as hrefLang; HTML parsing is
    // case-insensitive so crawlers treat it as hreflang.
    expect(html).toContain('hreflang="ar"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('href="/ar"');
    expect(html).toContain('href="/en"');
  });
});

describe("marketing render smoke", () => {
  it("renders Arabic shell with RTL-relevant copy", () => {
    const dict = getDict("ar");
    expect(dict.dir).toBe("rtl");
    const html = renderShellBits("ar");
    expect(html).toContain("اطلب بطاقتك");
  });

  it("renders solution pages for every solution slug", () => {
    const dict = getDict("en");
    for (const slug of SOLUTION_SLUGS) {
      const key =
        slug === "students-job-seekers" ? "students" : (slug as "professionals" | "businesses");
      const html = renderToStaticMarkup(SolutionPage({ locale: "en", dict, solution: key }));
      expect(html).toContain(dict.solutions[key].name.replace(/&/g, "&amp;"));
      expect(html).toContain(`/en/order`);
    }
  });

  it("never leaks template placeholders or secrets into markup", () => {
    const dict = getDict("fr");
    const html =
      renderToStaticMarkup(HomePage({ locale: "fr", dict })) +
      renderToStaticMarkup(ProductPage({ locale: "fr", dict, slug: "personal-card" }));
    expect(html).not.toContain("{order}");
    expect(html).not.toContain("{qty}");
    expect(html).not.toContain("NEXT_PUBLIC");
    expect(html).not.toContain("service_role");
  });
});
