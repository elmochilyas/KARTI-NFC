/**
 * Marketing mega-footer (editorial rebuild, server component). Every link
 * resolves through the site registry — no dead ends by construction.
 *
 * Structure is intentionally split into two self-contained trees:
 *   - `< md` : compact, one-column, grouped mobile footer.
 *   - `>= md`: the original editorial desktop footer, unchanged.
 * Only one tree is displayed at a time (CSS `hidden` / `md:hidden`), so the
 * mobile layout can evolve without touching desktop and vice-versa. Neither
 * tree depends on page wrappers, hero spacing, or absolute positioning.
 */
import Link from "next/link";
import { ConsentPreferencesButton } from "../ConsentPreferencesButton";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { allProducts, productSlugFromType } from "../products";
import { LEGAL_SLUGS, localePath, orderPath, SOLUTION_SLUGS, type LegalSlug } from "../site";
import { ArrowGlyph, LinkChainIcon, StorefrontIcon, UserRoundIcon } from "../product/icons";
import { SiGoogle } from "react-icons/si";
import { LocaleSegment } from "./LocaleSegment";

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

/**
 * Compact mobile "Produits" list: the five main customer-facing categories
 * only (the remaining subtypes stay reachable from the header). Each label is
 * localized; each link resolves to a real product page.
 */
const MOBILE_CATEGORIES = [
  { key: "personal", product: "PERSONAL_CARD" },
  { key: "business", product: "BUSINESS_CARD" },
  { key: "googleReview", product: "GOOGLE_REVIEW_CARD" },
  { key: "career", product: "CAREER_CARD" },
  { key: "customLink", product: "CUSTOM_LINK_CARD" },
] as const;

/**
 * Footer-native category glyph: bare white line mark, no tile or box.
 * (Boxed tiles belong on light cards, not on the ink footer.)
 */
function FooterGlyph({ category }: { category: (typeof MOBILE_CATEGORIES)[number]["key"] }) {
  if (category === "googleReview") {
    return (
      <span aria-hidden="true" className="flex shrink-0 text-white">
        <SiGoogle className="h-5 w-5" />
      </span>
    );
  }
  const Glyph =
    category === "business"
      ? StorefrontIcon
      : category === "customLink"
        ? LinkChainIcon
        : UserRoundIcon;
  return (
    <span aria-hidden="true" className="flex shrink-0 text-white">
      <Glyph className="h-5 w-5" />
    </span>
  );
}

const MOBILE_HEADING_CLASS =
  "font-display text-xs font-bold tracking-[0.14em] text-white/60 uppercase";
const MOBILE_LINK_CLASS =
  "flex min-h-11 items-center gap-2 text-[15px] leading-snug text-white/80 transition-colors hover:text-white hover:underline hover:underline-offset-4";

function MobileAccordion({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={title}>
      <details className="group">
        <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-4 py-2 text-[15px] font-bold text-white [&::-webkit-details-marker]:hidden">
          {title}
          <span
            aria-hidden="true"
            className="karti-flip-rtl flex text-white/40 transition-transform group-open:rotate-90"
          >
            <ArrowGlyph className="h-4 w-4" />
          </span>
        </summary>
        <ul className="space-y-1 pt-1 pb-4">
          {links.map((item) => (
            <li key={item.href}>
              <Link className={MOBILE_LINK_CLASS} href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}

function MobileFooter({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const solutionLinks = SOLUTION_SLUGS.map((slug) => ({
    href: localePath(locale, "solutions", slug),
    label: dict.solutions[SOLUTION_NAMES[slug]].name,
  }));
  const helpLinks = [
    { href: localePath(locale, "how-it-works"), label: dict.nav.howItWorks },
    { href: localePath(locale, "faq"), label: dict.nav.faq },
    { href: localePath(locale, "contact"), label: dict.nav.contact },
    { href: localePath(locale, "delivery"), label: dict.legal.deliveryTitle },
  ];
  const infoLinks = [
    { href: localePath(locale, "privacy"), label: dict.legal.privacyTitle },
    { href: localePath(locale, "terms"), label: dict.legal.termsTitle },
  ];

  return (
    <div className="md:hidden">
      <div className="flex flex-col gap-9 px-5 pt-10 pb-8">
        <div>
          <p className="font-display flex items-center gap-2.5 text-xl font-bold tracking-[-0.02em]">
            <span
              aria-hidden="true"
              className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-bold text-ink"
            >
              K
            </span>
            Karti
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
            {dict.footer.tagline}
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <Link
              href={orderPath(locale)}
              className="font-display inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 text-[15px] font-bold text-ink transition-all hover:-translate-y-px active:translate-y-0"
            >
              {dict.footer.orderLink}
            </Link>
            <Link
              href={localePath(locale, "contact")}
              className="font-display inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/25 px-6 text-[15px] font-bold text-white transition-all hover:border-white/60"
            >
              {dict.footer.contactLink}
            </Link>
          </div>
        </div>

        <nav aria-label={dict.footer.productsTitle}>
          <h2 className={MOBILE_HEADING_CLASS}>{dict.footer.productsTitle}</h2>
          <ul className="mt-1 divide-y divide-white/10 border-b border-white/10">
            {MOBILE_CATEGORIES.map(({ key, product }) => (
              <li key={key}>
                <Link
                  href={localePath(locale, "products", productSlugFromType(product))}
                  className="flex min-h-13 items-center gap-3 py-2 text-[15px] font-bold text-white transition-colors hover:text-white active:text-white"
                >
                  <FooterGlyph category={key} />
                  <span className="flex-1 leading-snug">{dict.footer.categories[key]}</span>
                  <span aria-hidden="true" className="karti-flip-rtl flex text-white/30">
                    <ArrowGlyph className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="divide-y divide-white/10 border-y border-white/10">
          <MobileAccordion title={dict.footer.solutionsTitle} links={solutionLinks} />
          <MobileAccordion title={dict.footer.helpTitle} links={helpLinks} />
          <MobileAccordion title={dict.footer.legalTitle} links={infoLinks} />
        </div>

        <LocaleSegment locale={locale} label={dict.nav.language} layout="full" />
      </div>

      <div className="border-t border-white/15 px-5 pt-6 pb-8">
        <p
          aria-hidden="true"
          className="karti-wordmark font-display text-center text-[3.5rem] leading-none font-bold tracking-[-0.04em]"
        >
          KARTI
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 text-center text-xs text-white/60">
          <p>
            © {new Date().getFullYear()} {dict.footer.rights}
          </p>
          <span className="[&_button]:inline-flex [&_button]:min-h-11 [&_button]:items-center [&_button]:text-white/60 [&_button]:underline [&_button]:underline-offset-4 [&_button]:hover:text-white">
            <ConsentPreferencesButton label={dict.footer.cookiePreferences} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function SiteFooter({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  return (
    <footer className="mt-16 overflow-hidden bg-ink text-white md:mt-24">
      <MobileFooter locale={locale} dict={dict} />

      <div className="hidden md:block">
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
            className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-6 text-xs text-white/60 md:px-8"
          >
            <LocaleSegment locale={locale} label={dict.nav.language} layout="auto" />
            <span className="[&_button]:text-white/60 [&_button]:underline [&_button]:underline-offset-4 [&_button]:hover:text-white">
              <ConsentPreferencesButton label={dict.footer.cookiePreferences} />
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
