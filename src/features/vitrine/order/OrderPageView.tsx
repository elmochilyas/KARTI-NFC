/**
 * Shared order-page shell (server): breadcrumbs, task-focused hero with
 * the preselected product summary, then the wizard. All logic stays in
 * OrderWizard + server actions; this file is presentation only.
 */

import Link from "next/link";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict, VitrineLocale } from "../i18n";
import { productSlugFromType } from "../products";
import { localePath } from "../site";
import { Breadcrumbs } from "../marketing/Breadcrumbs";
import { PageContainer } from "../marketing/Section";
import { OrderWizard } from "./OrderWizard";

export function OrderPageView({
  locale,
  dict,
  initialProduct,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  initialProduct: ProductType | null;
}) {
  return (
    <PageContainer>
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.order.title, url: localePath(locale, "order") },
        ]}
      />
      <div className="mx-auto max-w-2xl py-6 md:py-8">
        <p className="font-display text-[13px] font-bold tracking-[0.22em] text-accent-strong uppercase">
          {dict.nav.orderCta} <span aria-hidden="true">—</span>
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-[-0.03em] text-balance text-text sm:text-5xl">{dict.order.title}</h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-pretty text-muted">{dict.order.subtitle}</p>
        {initialProduct ? (
          <div className="mt-5 flex items-center gap-3 rounded-[1.75rem] border border-ink/10 bg-surface p-4 shadow-card">
            <span
              aria-hidden="true"
              className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-base font-bold text-white"
            >
              {dict.products[initialProduct].name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-display block truncate text-[15px] font-bold text-text">
                {dict.products[initialProduct].name}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-muted">
                {dict.products[initialProduct].tagline}
              </span>
            </span>
            <Link
              href={localePath(locale, "products", productSlugFromType(initialProduct))}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
            >
              {dict.common.learnMore}
              <span aria-hidden="true" className="karti-flip-rtl">
                →
              </span>
            </Link>
          </div>
        ) : null}
      </div>
      <OrderWizard locale={locale} dict={dict} initialProduct={initialProduct} />
    </PageContainer>
  );
}
