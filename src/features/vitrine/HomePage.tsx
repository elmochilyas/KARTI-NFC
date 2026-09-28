/**
 * Minimal localized landing page (Phase 2).
 *
 * Hero → goal/product grid → how-it-works → pricing → FAQ → final CTA.
 * Full-depth marketing content belongs to Phase 5; this page makes the
 * vitrine usable and leads every product into checkout.
 */

import Link from "next/link";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { allProducts, productSlugFromType } from "./products";

export function HomePage({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const base = `/${locale}`;
  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-12 sm:pt-16">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          {dict.home.heroTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{dict.home.heroSubtitle}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`${base}/order`}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-6 font-medium text-accent-contrast"
          >
            {dict.home.orderCta}
          </Link>
          <Link
            href={`${base}/#products`}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-6 font-medium"
          >
            {dict.home.productsCta}
          </Link>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight">{dict.home.goalTitle}</h2>
        <p className="mt-2 text-muted">{dict.home.goalSubtitle}</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {allProducts().map((product) => (
            <li key={product} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-bold">{dict.products[product].name}</h3>
              <p className="mt-1 text-sm text-muted">{dict.products[product].tagline}</p>
              <Link
                href={`${base}/products/${productSlugFromType(product)}`}
                className="mt-3 inline-flex min-h-11 items-center font-medium text-accent"
                aria-label={dict.products[product].name}
              >
                {dict.home.productsCta} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight">{dict.home.howTitle}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {dict.home.howSteps.map((step) => (
            <li key={step.title} className="rounded-xl border border-border bg-surface p-5">
              <p className="font-bold">{step.title}</p>
              <p className="mt-1 text-sm text-muted">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-10">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-2xl font-bold tracking-tight">{dict.home.pricingTitle}</h2>
          <p className="mt-2 text-muted">{dict.home.pricingDesc}</p>
          <Link
            href={`${base}/order`}
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-medium text-accent-contrast"
          >
            {dict.home.pricingCta}
          </Link>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight">{dict.home.faqTitle}</h2>
        <div className="mt-6 space-y-3">
          {dict.home.faqItems.map((item) => (
            <details key={item.q} className="rounded-xl border border-border bg-surface p-5">
              <summary className="cursor-pointer font-medium">{item.q}</summary>
              <p className="mt-2 text-sm text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-xl bg-accent p-6 text-accent-contrast sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight">{dict.home.finalTitle}</h2>
          <p className="mt-2 opacity-90">{dict.home.finalSubtitle}</p>
          <Link
            href={`${base}/order`}
            className="mt-4 inline-flex min-h-12 items-center rounded-md bg-accent-contrast px-6 font-medium text-accent"
          >
            {dict.home.orderCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
