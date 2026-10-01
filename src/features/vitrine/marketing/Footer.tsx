/**
 * Marketing mega-footer (editorial rebuild, server component). Every link
 * resolves through the site registry — no dead ends by construction.
 */
import Link from "next/link";
import { ConsentPreferencesButton } from "../ConsentPreferencesButton";
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
    <footer className="mt-24 overflow-hidden bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-16 pb-10 md:px-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display flex items-center gap-2.5 text-2xl font-bold tracking-[-0.02em]">
            <span
              aria-hidden="true"
              className="font-display flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-ink"
            >
              K
            </span>
            Karti
          </p>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/70">
            {dict.footer.tagline}
          </p>
          <p className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href={orderPath(locale)}
              className="font-display inline-flex min-h-12 items-center rounded-full bg-white px-6 text-[15px] font-bold text-ink transition-all hover:-translate-y-px"
            >
              {dict.footer.orderLink}
            </Link>
            <Link
              href={localePath(locale, "contact")}
              className="font-display inline-flex min-h-12 items-center rounded-full border border-white/25 px-6 text-[15px] font-bold text-white transition-all hover:border-white/60"
            >
              {dict.footer.contactLink}
            </Link>
          </p>
        </div>
        <nav aria-label={dict.footer.productsTitle}>
          <p className="font-display text-sm font-bold tracking-[0.14em] text-white/60 uppercase">
            {dict.footer.productsTitle}
          </p>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            {allProducts().map((product) => (
              <li key={product}>
                <Link
                  className="text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4"
                  href={localePath(locale, "products", productSlugFromType(product))}
                >
                  {dict.products[product].name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={dict.footer.solutionsTitle}>
          <p className="font-display text-sm font-bold tracking-[0.14em] text-white/60 uppercase">
            {dict.footer.solutionsTitle}
          </p>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            {SOLUTION_SLUGS.map((slug) => (
              <li key={slug}>
                <Link
                  className="text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4"
                  href={localePath(locale, "solutions", slug)}
                >
                  {dict.solutions[SOLUTION_NAMES[slug]].name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="font-display mt-6 text-sm font-bold tracking-[0.14em] text-white/60 uppercase">
            {dict.footer.learnTitle}
          </p>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            <li>
              <Link
                className="text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4"
                href={localePath(locale, "how-it-works")}
              >
                {dict.nav.howItWorks}
              </Link>
            </li>
            <li>
              <Link
                className="text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4"
                href={localePath(locale, "examples")}
              >
                {dict.nav.examples}
              </Link>
            </li>
            <li>
              <Link
                className="text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4"
                href={localePath(locale, "resources")}
              >
                {dict.nav.resources}
              </Link>
            </li>
            <li>
              <Link
                className="text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4"
                href={localePath(locale, "faq")}
              >
                {dict.nav.faq}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={dict.footer.companyTitle}>
          <p className="font-display text-sm font-bold tracking-[0.14em] text-white/60 uppercase">
            {dict.footer.companyTitle}
          </p>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            <li>
              <Link
                className="text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4"
                href={localePath(locale, "contact")}
              >
                {dict.footer.contactLink}
              </Link>
            </li>
            <li>
              <Link
                className="text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4"
                href={orderPath(locale)}
              >
                {dict.footer.orderLink}
              </Link>
            </li>
          </ul>
          <p className="font-display mt-6 text-sm font-bold tracking-[0.14em] text-white/60 uppercase">
            {dict.footer.legalTitle}
          </p>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            {LEGAL_SLUGS.map((slug) => (
              <li key={slug}>
                <Link
                  className="text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4"
                  href={localePath(locale, slug)}
                >
                  {dict.legal[LEGAL_TITLES[slug]]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p
        aria-hidden="true"
        className="karti-wordmark font-display mx-auto max-w-6xl px-4 text-center text-[22vw] leading-none font-bold tracking-[-0.04em] sm:text-[10rem] lg:text-[12rem]"
      >
        KARTI
      </p>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-white/60 md:px-8 sm:flex-row sm:justify-between">
          <p>{dict.footer.notice}</p>
          <p>
            © {new Date().getFullYear()} {dict.footer.rights}
          </p>
        </div>
        <nav
          aria-label={dict.nav.language}
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-6 text-xs text-white/60 md:px-8"
        >
          <span>{dict.nav.language}:</span>
          {VITRINE_LOCALES.filter((code) => code !== locale).map((code) => (
            <a
              key={code}
              href={`/${code}`}
              hrefLang={code}
              className="underline underline-offset-4 hover:text-white"
            >
              {code === "fr" ? "Français" : code === "ar" ? "العربية" : "English"}
            </a>
          ))}
          <span className="[&_button]:text-white/60 [&_button]:underline [&_button]:underline-offset-4 [&_button]:hover:text-white">
            <ConsentPreferencesButton label={dict.footer.cookiePreferences} />
          </span>
        </nav>
      </div>
    </footer>
  );
}
