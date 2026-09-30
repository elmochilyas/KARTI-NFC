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
      <div className="mx-auto max-w-2xl py-8 md:py-10">
        <h1 className="text-4xl font-bold tracking-tight text-text">{dict.order.title}</h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">{dict.order.subtitle}</p>
        {initialProduct ? (
          <div className="mt-6 flex items-center gap-4 rounded-2xl border-2 border-accent/30 bg-surface p-5">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-contrast"
            >
              {dict.products[initialProduct].name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold text-text">
                {dict.products[initialProduct].name}
              </span>
              <span className="mt-0.5 block truncate text-sm text-muted">
                {dict.products[initialProduct].tagline}
              </span>
            </span>
            <Link
              href={localePath(locale, "products", productSlugFromType(initialProduct))}
              className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-accent underline"
            >
              {dict.common.learnMore}
            </Link>
          </div>
        ) : null}
      </div>
      <OrderWizard locale={locale} dict={dict} initialProduct={initialProduct} />
    </PageContainer>
  );
}
