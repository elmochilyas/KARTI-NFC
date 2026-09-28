/**
 * Reusable public vitrine shell: header, content, footer.
 *
 * Marketing-only. Dashboard and public-profile routes never render this.
 * Visual direction follows the repo tokens: clean surfaces, strong type,
 * generous whitespace, restrained panels, mobile-first.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { AttributionTracker } from "./AttributionTracker";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { allProducts, productSlugFromType } from "./products";

export function VitrineShell({
  locale,
  dict,
  children,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  children: ReactNode;
}) {
  const base = `/${locale}`;
  return (
    <div lang={locale} dir={dict.dir} className="min-h-screen bg-background text-text">
      <AttributionTracker />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link
            href={base}
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
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
          <nav aria-label="Primary" className="hidden items-center gap-5 text-sm md:flex">
            <Link className="text-muted hover:text-text" href={`${base}/#products`}>
              {dict.nav.products}
            </Link>
            <Link className="text-muted hover:text-text" href={`${base}/#how`}>
              {dict.nav.howItWorks}
            </Link>
            <Link className="text-muted hover:text-text" href={`${base}/#pricing`}>
              {dict.nav.pricing}
            </Link>
            <Link className="text-muted hover:text-text" href={`${base}/#faq`}>
              {dict.nav.faq}
            </Link>
            <Link className="text-muted hover:text-text" href={`${base}/contact`}>
              {dict.nav.contact}
            </Link>
          </nav>
          <Link
            href={`${base}/order`}
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast"
          >
            {dict.nav.orderCta}
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-border bg-surface">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="font-bold">Karti</p>
            <p className="mt-2 text-sm text-muted">{dict.footer.tagline}</p>
          </div>
          <nav aria-label="Products">
            <p className="text-sm font-medium">{dict.footer.productsTitle}</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {allProducts().map((product) => (
                <li key={product}>
                  <Link
                    className="text-muted hover:text-text"
                    href={`${base}/products/${productSlugFromType(product)}`}
                  >
                    {dict.products[product].name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Karti">
            <p className="text-sm font-medium">{dict.footer.companyTitle}</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link className="text-muted hover:text-text" href={`${base}/order`}>
                  {dict.footer.orderLink}
                </Link>
              </li>
              <li>
                <Link className="text-muted hover:text-text" href={`${base}/contact`}>
                  {dict.footer.contactLink}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-border">
          <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted">{dict.footer.notice}</p>
        </div>
      </footer>
    </div>
  );
}
