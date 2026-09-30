/**
 * Filterable demo-example gallery (client island, tiny). Examples are
 * explicitly demo concepts — never presented as customers.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductType } from "@/domain/orders";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { orderPath, productPath } from "../site";
import { productSlugFromType } from "../products";
import { CardMockup, PhoneFrame } from "./Mockups";

export type ExampleFilterItem = {
  name: string;
  category: string;
  product: ProductType;
  useCase: string;
  tapResult: string;
};

export function ExamplesGrid({
  locale,
  dict,
  items,
  demoLabel,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  items: ExampleFilterItem[];
  demoLabel: string;
}) {
  const categories = dict.examplesPage.categories;
  const [active, setActive] = useState<string>(categories[0]?.id ?? "");
  const visible = items.filter((item) => item.category === active);

  return (
    <div>
      <div role="tablist" aria-label={dict.examplesPage.title} className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={active === category.id}
            onClick={() => setActive(category.id)}
            className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium ${
              active === category.id
                ? "border-accent bg-accent text-accent-contrast"
                : "border-border bg-surface text-muted hover:text-text"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
      <ul className="mt-8 grid gap-6 md:grid-cols-2" aria-live="polite">
        {visible.map((item) => (
          <li
            key={item.name}
            className="flex flex-col rounded-2xl border border-border bg-surface p-6"
          >
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{demoLabel}</p>
            <p className="mt-2 text-xl font-bold tracking-tight text-text">{item.name}</p>
            <p className="mt-1 text-[15px] text-muted">{item.useCase}</p>
            <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-xl bg-surface-muted/60 p-5 min-[420px]:flex-row">
              <CardMockup label={item.name} sublabel={demoLabel} size="md" />
              <span
                aria-hidden="true"
                className="text-2xl font-bold text-accent min-[420px]:hidden"
              >
                ↓
              </span>
              <span
                aria-hidden="true"
                className="hidden text-2xl font-bold text-accent min-[420px]:inline rtl:-scale-x-100"
              >
                →
              </span>
              <PhoneFrame title={item.tapResult} lines={[item.useCase]} size="md" />
            </div>
            <p className="mt-4 text-[15px] text-text">
              <span aria-hidden="true" className="font-bold text-accent">
                →{" "}
              </span>
              {item.tapResult}
            </p>
            <p className="mt-2 text-sm text-muted">{dict.products[item.product].name}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={productPath(locale, productSlugFromType(item.product))}
                className="inline-flex min-h-12 items-center rounded-lg border border-border px-5 text-sm font-medium hover:border-muted"
              >
                {dict.common.learnMore}
              </Link>
              <Link
                href={orderPath(locale, productSlugFromType(item.product))}
                className="inline-flex min-h-12 items-center rounded-lg bg-accent px-5 text-sm font-medium text-accent-contrast hover:bg-accent-strong"
              >
                {dict.common.orderNow}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
