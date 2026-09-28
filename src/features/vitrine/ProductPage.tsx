/**
 * Reusable product marketing page (Phase 2 foundation).
 *
 * Independently understandable: hero, tap outcome, audience, benefits,
 * how-it-works, pricing state, FAQ, related products, order CTA.
 * Full SEO/GEO depth belongs to Phase 5.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { productSlugFromType, productTypeFromSlug, relatedProducts } from "./products";

export function ProductPage({
  locale,
  dict,
  slug,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  slug: string;
}) {
  const product: ProductType | null = productTypeFromSlug(slug);
  if (!product) notFound();
  const copy = dict.products[product];
  const base = `/${locale}`;

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-12">
        <p className="text-sm font-medium text-accent">{copy.tagline}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{copy.name}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{copy.outcome}</p>
        <Link
          href={`${base}/order?product=${productSlugFromType(product)}`}
          className="mt-6 inline-flex min-h-12 items-center rounded-md bg-accent px-6 font-medium text-accent-contrast"
        >
          {dict.productPage.orderCta}
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="font-medium">{copy.tapEffect}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-xl font-bold">{dict.productPage.whoTitle}</h2>
        <ul className="mt-3 list-disc space-y-1 ps-5 text-muted">
          {copy.audience.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-xl font-bold">{dict.productPage.benefitsTitle}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {copy.benefits.map((item) => (
            <li key={item} className="rounded-xl border border-border bg-surface p-4 text-sm">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-xl font-bold">{dict.productPage.howTitle}</h2>
        <ol className="mt-3 space-y-2">
          {copy.steps.map((item) => (
            <li key={item} className="rounded-xl border border-border bg-surface p-4 text-sm">
              {item}
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-xl font-bold">{dict.productPage.pricingTitle}</h2>
        <p className="mt-2 text-muted">{copy.pricing}</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-xl font-bold">{dict.productPage.faqTitle}</h2>
        <div className="mt-3 space-y-3">
          {copy.faq.map((item) => (
            <details key={item.q} className="rounded-xl border border-border bg-surface p-4">
              <summary className="cursor-pointer font-medium">{item.q}</summary>
              <p className="mt-2 text-sm text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-xl font-bold">{dict.productPage.relatedTitle}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {relatedProducts(product).map((related) => (
            <li key={related} className="rounded-xl border border-border bg-surface p-4">
              <Link
                href={`${base}/products/${productSlugFromType(related)}`}
                className="font-medium text-accent"
              >
                {dict.products[related].name}
              </Link>
              <p className="mt-1 text-sm text-muted">{dict.products[related].tagline}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Link
            href={`${base}/order?product=${productSlugFromType(product)}`}
            className="inline-flex min-h-12 items-center rounded-md bg-accent px-6 font-medium text-accent-contrast"
          >
            {dict.productPage.orderCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
