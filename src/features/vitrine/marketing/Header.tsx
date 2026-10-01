/**
 * Marketing header (editorial rebuild): floating pill nav, Space Grotesk
 * wordmark, CSS-only desktop dropdowns, bottom-sheet mobile panel.
 * Language switcher uses crawlable links preserving the deep path.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { VITRINE_LOCALES, type VitrineDict, type VitrineLocale } from "../i18n/dict";
import { allProducts, productSlugFromType } from "../products";
import { localePath, orderPath, SOLUTION_SLUGS, solutionSlugToKey } from "../site";

const PROFILE_PRODUCTS = ["PERSONAL_CARD", "CAREER_CARD", "BUSINESS_CARD"] as const;
const DIRECT_PRODUCTS = [
  "GOOGLE_REVIEW_CARD",
  "WHATSAPP_CARD",
  "INSTAGRAM_CARD",
  "CONTACT_CARD",
  "CUSTOM_LINK_CARD",
] as const;

export function SiteHeader({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const suffix = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const base = `/${locale}`;
  const linkCls =
    "inline-flex min-h-11 items-center rounded-full px-3.5 text-[15px] font-medium text-muted transition-colors hover:bg-surface-muted hover:text-text";

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-4">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 rounded-full border border-border/70 bg-surface/90 py-2 ps-3 pe-2 shadow-[var(--shadow-lift)] backdrop-blur-md md:h-[4.5rem] md:ps-5 md:pe-3">
        <Link
          href={base}
          className="font-display flex min-h-11 items-center gap-2.5 text-xl font-bold tracking-[-0.02em]"
          aria-label="Karti"
        >
          <span
            aria-hidden="true"
            className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-ink text-lg font-bold text-white"
          >
            K
          </span>
          Karti
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          <div className="group relative">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded="false"
              className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-3 text-[15px] font-medium text-muted group-hover:text-text"
            >
              {dict.nav.products}
              <span aria-hidden="true" className="text-xs text-muted">
                ▾
              </span>
            </button>
            <div className="invisible absolute top-full z-20 w-72 rounded-2xl border border-border bg-surface p-3 opacity-0 shadow-[var(--shadow-lift)] transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <p className="px-2 pt-1 text-xs font-semibold tracking-wide text-muted uppercase">
                {dict.nav.profileGroup}
              </p>
              {PROFILE_PRODUCTS.map((product) => (
                <Link
                  key={product}
                  href={localePath(locale, "products", productSlugFromType(product))}
                  className="block rounded-md px-2 py-2 text-sm hover:bg-surface-muted"
                >
                  {dict.products[product].name}
                </Link>
              ))}
              <p className="px-2 pt-3 text-xs font-semibold tracking-wide text-muted uppercase">
                {dict.nav.directGroup}
              </p>
              {DIRECT_PRODUCTS.map((product) => (
                <Link
                  key={product}
                  href={localePath(locale, "products", productSlugFromType(product))}
                  className="block rounded-md px-2 py-2 text-sm hover:bg-surface-muted"
                >
                  {dict.products[product].name}
                </Link>
              ))}
            </div>
          </div>
          <div className="group relative">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded="false"
              className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-3 text-[15px] font-medium text-muted group-hover:text-text"
            >
              {dict.nav.solutions}
              <span aria-hidden="true" className="text-xs text-muted">
                ▾
              </span>
            </button>
            <div className="invisible absolute top-full z-20 w-60 rounded-2xl border border-border bg-surface p-3 opacity-0 shadow-[var(--shadow-lift)] transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {SOLUTION_SLUGS.map((slug) => {
                const key = solutionSlugToKey(slug);
                if (!key) return null;
                return (
                  <Link
                    key={slug}
                    href={localePath(locale, "solutions", slug)}
                    className="block rounded-md px-2 py-2 text-sm hover:bg-surface-muted"
                  >
                    {dict.solutions[key].name}
                  </Link>
                );
              })}
            </div>
          </div>
          <Link className={linkCls} href={localePath(locale, "how-it-works")}>
            {dict.nav.howItWorks}
          </Link>
          <Link className={linkCls} href={localePath(locale, "pricing")}>
            {dict.nav.pricing}
          </Link>
          <Link className={linkCls} href={localePath(locale, "examples")}>
            {dict.nav.examples}
          </Link>
          <Link className={linkCls} href={localePath(locale, "resources")}>
            {dict.nav.resources}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <nav aria-label={dict.nav.language} className="hidden items-center gap-1 md:flex">
            {VITRINE_LOCALES.filter((code) => code !== locale).map((code) => (
              <a
                key={code}
                href={`/${code}${suffix === "/" ? "" : suffix}`}
                hrefLang={code}
                className="inline-flex min-h-11 items-center rounded-full px-2.5 text-xs font-bold text-muted uppercase transition-colors hover:bg-surface-muted hover:text-text"
              >
                {code}
              </a>
            ))}
          </nav>
          <Link
            href={orderPath(locale)}
            className="font-display inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-[15px] font-bold text-white transition-all hover:-translate-y-px hover:bg-accent-strong"
          >
            {dict.nav.orderCta}
          </Link>
          <button
            type="button"
            className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-full bg-ink px-3 text-lg font-bold text-white transition-transform active:scale-95 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? dict.nav.closeMenu : dict.nav.menu}
            onClick={() => setOpen((value) => !value)}
          >
            <span aria-hidden="true">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="mx-auto mt-2 max-w-6xl rounded-[1.75rem] border border-border/70 bg-surface/95 px-5 pt-4 pb-6 shadow-[var(--shadow-hero)] backdrop-blur-md lg:hidden"
        >
          <p className="font-display pt-1 text-xs font-bold tracking-[0.18em] text-muted uppercase">
            {dict.nav.profileGroup}
          </p>
          <ul className="mt-1 flex flex-col">
            {allProducts().map((product) => (
              <li key={product}>
                <Link
                  href={localePath(locale, "products", productSlugFromType(product))}
                  className="flex min-h-12 items-center rounded-2xl px-2 text-[15px] font-medium hover:bg-surface-muted"
                  onClick={() => setOpen(false)}
                >
                  {dict.products[product].name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="font-display pt-4 text-xs font-bold tracking-[0.18em] text-muted uppercase">
            {dict.nav.solutions}
          </p>
          <ul className="mt-1 flex flex-col">
            {SOLUTION_SLUGS.map((slug) => {
              const key = solutionSlugToKey(slug);
              if (!key) return null;
              return (
                <li key={slug}>
                  <Link
                    href={localePath(locale, "solutions", slug)}
                    className="flex min-h-11 items-center rounded-md text-sm hover:bg-surface-muted"
                    onClick={() => setOpen(false)}
                  >
                    {dict.solutions[key].name}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ul className="mt-1 flex flex-col border-t border-border pt-2">
            {[
              { href: localePath(locale, "how-it-works"), label: dict.nav.howItWorks },
              { href: localePath(locale, "pricing"), label: dict.nav.pricing },
              { href: localePath(locale, "examples"), label: dict.nav.examples },
              { href: localePath(locale, "resources"), label: dict.nav.resources },
              { href: localePath(locale, "faq"), label: dict.nav.faq },
              { href: localePath(locale, "contact"), label: dict.nav.contact },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-12 items-center rounded-xl px-2 text-[15px] font-medium hover:bg-surface-muted"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link
              href={orderPath(locale)}
              className="flex min-h-13 items-center justify-center rounded-xl bg-accent px-6 text-base font-semibold text-accent-contrast"
              onClick={() => setOpen(false)}
            >
              {dict.nav.orderCta}
            </Link>
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <LanguageLinks locale={locale} dict={dict} suffix={suffix} />
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function LanguageLinks({
  locale,
  dict,
  suffix,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  suffix: string;
}) {
  return (
    <p className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span>{dict.nav.language}:</span>
      {VITRINE_LOCALES.filter((code) => code !== locale).map((code) => (
        <a
          key={code}
          href={`/${code}${suffix === "/" ? "" : suffix}`}
          hrefLang={code}
          className="underline hover:text-text"
        >
          {code === "fr" ? "Français" : code === "ar" ? "العربية" : "English"}
        </a>
      ))}
    </p>
  );
}
