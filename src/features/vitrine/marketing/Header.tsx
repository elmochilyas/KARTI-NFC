/**
 * Marketing header (Phase 5). Desktop dropdowns are CSS-only
 * (focus-within/hover, keyboard reachable); the mobile menu is a small
 * client island. Language switcher uses crawlable links.
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
    "inline-flex min-h-11 items-center rounded-md px-3 text-[15px] text-muted hover:text-text";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl md:h-20 items-center justify-between gap-3 px-4">
        <Link
          href={base}
          className="flex min-h-11 items-center gap-2 text-lg font-bold tracking-tight"
          aria-label="Karti"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-lg font-bold text-accent-contrast"
          >
            K
          </span>
          Karti
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          <div className="group relative">
            <button
              type="button"
              aria-haspopup="true"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-3 text-[15px] text-muted group-hover:text-text"
            >
              {dict.nav.products}
            </button>
            <div className="invisible absolute top-full z-20 w-64 rounded-xl border border-border bg-surface p-3 opacity-0 shadow-card group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
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
              className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-3 text-[15px] text-muted group-hover:text-text"
            >
              {dict.nav.solutions}
            </button>
            <div className="invisible absolute top-full z-20 w-60 rounded-xl border border-border bg-surface p-3 opacity-0 shadow-card group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
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
                className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-semibold text-muted uppercase hover:text-text"
              >
                {code}
              </a>
            ))}
          </nav>
          <Link
            href={orderPath(locale)}
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-[15px] font-medium text-accent-contrast hover:bg-accent-strong"
          >
            {dict.nav.orderCta}
          </Link>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-border px-3 text-sm font-medium lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? dict.nav.closeMenu : dict.nav.menu}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Primary" className="border-t border-border px-4 py-3 lg:hidden">
          <p className="pt-1 text-xs font-semibold tracking-wide text-muted uppercase">
            {dict.nav.profileGroup}
          </p>
          <ul className="mt-1 flex flex-col">
            {allProducts().map((product) => (
              <li key={product}>
                <Link
                  href={localePath(locale, "products", productSlugFromType(product))}
                  className="flex min-h-11 items-center rounded-md text-sm hover:bg-surface-muted"
                  onClick={() => setOpen(false)}
                >
                  {dict.products[product].name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="pt-3 text-xs font-semibold tracking-wide text-muted uppercase">
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
                  className="flex min-h-11 items-center rounded-md text-sm hover:bg-surface-muted"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <LanguageLinks locale={locale} dict={dict} suffix={suffix} />
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
        <a key={code} href={`/${code}${suffix === "/" ? "" : suffix}`} hrefLang={code} className="underline hover:text-text">
          {code === "fr" ? "Français" : code === "ar" ? "العربية" : "English"}
        </a>
      ))}
    </p>
  );
}
