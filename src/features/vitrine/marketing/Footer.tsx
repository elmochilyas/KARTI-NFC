/**
 * Marketing footer (Phase 5, server component). Every link resolves
 * through the site registry — no dead ends by construction. Legal
 * column exists because baseline policy pages ship in this phase.
 */
import Link from "next/link";
import { VITRINE_LOCALES, type VitrineDict, type VitrineLocale } from "../i18n/dict";
import { allProducts, productSlugFromType } from "../products";
import { LEGAL_SLUGS, localePath, orderPath, SOLUTION_SLUGS, type LegalSlug } from "../site";

const SOLUTION_NAMES: Record<string, "professionals" | "students" | "businesses"> = {
  professionals: "professionals",
  "students-job-seekers": "students",
  businesses: "businesses",
};

const LEGAL_TITLES: Record<LegalSlug, "privacyTitle" | "termsTitle" | "deliveryTitle"> = {
  privacy: "privacyTitle",
  terms: "termsTitle",
  delivery: "deliveryTitle",
};

export function SiteFooter({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:px-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-base font-bold text-accent-contrast"
            >
              K
            </span>
            Karti
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{dict.footer.tagline}</p>
        </div>
        <nav aria-label={dict.footer.productsTitle}>
          <p className="text-sm font-semibold tracking-wide">{dict.footer.productsTitle}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            {allProducts().map((product) => (
              <li key={product}>
                <Link
                  className="text-muted hover:text-text"
                  href={localePath(locale, "products", productSlugFromType(product))}
                >
                  {dict.products[product].name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={dict.footer.solutionsTitle}>
          <p className="text-sm font-semibold tracking-wide">{dict.footer.solutionsTitle}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            {SOLUTION_SLUGS.map((slug) => (
              <li key={slug}>
                <Link
                  className="text-muted hover:text-text"
                  href={localePath(locale, "solutions", slug)}
                >
                  {dict.solutions[SOLUTION_NAMES[slug]].name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm font-medium">{dict.footer.learnTitle}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link className="text-muted hover:text-text" href={localePath(locale, "how-it-works")}>
                {dict.nav.howItWorks}
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-text" href={localePath(locale, "examples")}>
                {dict.nav.examples}
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-text" href={localePath(locale, "resources")}>
                {dict.nav.resources}
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-text" href={localePath(locale, "faq")}>
                {dict.nav.faq}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={dict.footer.companyTitle}>
          <p className="text-sm font-semibold tracking-wide">{dict.footer.companyTitle}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link className="text-muted hover:text-text" href={localePath(locale, "contact")}>
                {dict.footer.contactLink}
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-text" href={orderPath(locale)}>
                {dict.footer.orderLink}
              </Link>
            </li>
          </ul>
          <p className="mt-5 text-sm font-medium">{dict.footer.legalTitle}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            {LEGAL_SLUGS.map((slug) => (
              <li key={slug}>
                <Link className="text-muted hover:text-text" href={localePath(locale, slug)}>
                  {dict.legal[LEGAL_TITLES[slug]]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4 text-xs text-muted sm:flex-row sm:justify-between">
          <p>{dict.footer.notice}</p>
          <p>
            © {new Date().getFullYear()} {dict.footer.rights}
          </p>
        </div>
        <nav
          aria-label={dict.nav.language}
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-4 text-xs text-muted"
        >
          <span>{dict.nav.language}:</span>
          {VITRINE_LOCALES.filter((code) => code !== locale).map((code) => (
            <a key={code} href={`/${code}`} hrefLang={code} className="underline hover:text-text">
              {code === "fr" ? "Français" : code === "ar" ? "العربية" : "English"}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
