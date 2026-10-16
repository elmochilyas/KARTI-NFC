/**
 * Shared marketing blocks for info pages (solutions, how-it-works,
 * examples). Product-page storytelling moved to the PDP rebuild in
 * `vitrine/product/`; only the blocks still used by info pages live here.
 * Server components.
 */

import Link from "next/link";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { productSlugFromType } from "../products";
import { localePath, orderPath } from "../site";
import type { ExampleFilterItem } from "./ExamplesGrid";
import { PhoneFrame } from "./Mockups";
import { Section } from "./Section";

/** Box-free numbered flow with descriptions (How, Pricing process). */
export function LabeledFlow({
  title,
  steps,
  columns = 4,
}: {
  title: string;
  steps: { title: string; desc: string }[];
  columns?: 3 | 4;
}) {
  return (
    <Section title={title}>
      <ol
        className={
          columns === 3
            ? "divide-y divide-border/70 border-y border-border/70"
            : "grid gap-px overflow-hidden rounded-[2rem] border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={
              columns === 3
                ? "grid gap-1 py-6 sm:grid-cols-[auto_1fr] sm:gap-6"
                : "bg-surface p-6 md:p-7"
            }
          >
            <p
              aria-hidden="true"
              className="font-display text-4xl font-bold tracking-[-0.02em] text-ink/15 tabular-nums"
            >
              {String(index + 1).padStart(2, "0")}
            </p>
            <div>
              <p className="font-display text-lg font-bold text-text">{step.title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** Homepage-style scenario cards: demo label, context, phone result. */
export function ScenarioCards({
  locale,
  dict,
  items,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  items: ExampleFilterItem[];
}) {
  if (items.length === 0) return null;
  return (
    <Section title={dict.productPage.examplesTitle} subtitle={dict.examplesPage.subtitle}>
      <ul className="grid gap-4 md:grid-cols-2">
        {items.slice(0, 2).map((item) => (
          <li
            key={item.name}
            className="flex flex-col rounded-[1.75rem] border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
          >
            <p className="text-[11px] font-bold tracking-wider text-muted uppercase">
              {dict.common.demoExample}
            </p>
            <p className="font-display mt-1.5 text-lg font-bold tracking-[-0.01em] text-text">
              {item.name}
            </p>
            <p className="mt-1 text-sm text-muted">{item.useCase}</p>
            <div className="mt-3 flex justify-center rounded-2xl bg-gradient-to-b from-surface-muted/80 to-surface-muted/30 p-4">
              <PhoneFrame title={item.tapResult} lines={[item.useCase]} size="md" />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-text">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong"
              >
                <span aria-hidden="true" className="karti-flip-rtl inline-block">
                  →
                </span>
              </span>
              {item.tapResult}
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <Link
                href={localePath(locale, "products", productSlugFromType(item.product))}
                className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-[13px] font-semibold hover:border-muted"
              >
                {dict.products[item.product].name}
              </Link>
              <Link
                href={orderPath(locale, productSlugFromType(item.product))}
                className="font-display inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-[13px] font-bold text-white hover:bg-accent-strong"
              >
                {dict.common.orderNow}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
