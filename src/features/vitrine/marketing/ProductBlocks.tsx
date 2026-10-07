/**
 * Shared product-page blocks (Phase 5 visual pass): one coherent system
 * for all 8 products, composed from existing localized copy only.
 * Server components; speaks the approved homepage language (giant
 * numerals, Tap→ strips, scenario cards, icon chips, generous rhythm).
 */

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { LuCheck } from "react-icons/lu";
import { getProductDefinition } from "@/domain/orders/catalog";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { productSlugFromType } from "../products";
import { localePath, orderPath } from "../site";
import type { ExampleFilterItem } from "./ExamplesGrid";
import { PhoneFrame } from "./Mockups";
import { Section } from "./Section";
import { TrackLink } from "./Trackers";

/** Two-column hero: copy left, one large visual right (flippable). */
export function ProductHero({
  locale,
  product,
  dict,
  visual,
  flip = false,
}: {
  locale: VitrineLocale;
  product: ProductType;
  dict: VitrineDict;
  visual: ReactNode;
  flip?: boolean;
}) {
  const copy = dict.products[product];
  const template = dict.productPage;
  const note = getProductDefinition(product).requiresProfile
    ? template.profileNote
    : template.directNote;
  return (
    <section
      aria-label={copy.name}
      className="karti-hero-grid grid items-center gap-8 py-10 md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:py-12"
    >
      <div className={flip ? "md:order-2" : ""}>
        <p className="font-display text-[13px] font-bold tracking-[0.22em] text-accent-strong uppercase">
          {copy.tagline} <span aria-hidden="true">—</span>
        </p>
        <h1 className="font-display mt-3 max-w-xl text-4xl leading-[1.0] font-bold tracking-[-0.035em] text-balance text-text sm:text-5xl lg:text-6xl">
          {copy.name}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted md:text-xl">
          {copy.outcome}
        </p>
        <div className="mt-6">
          <TrackLink
            href={orderPath(locale, productSlugFromType(product))}
            event="product_cta_click"
            payload={{ product, locale, placement: "hero" }}
            className="font-display inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-7 text-base font-bold text-white hover:bg-accent-strong"
          >
            {template.orderCta}
          </TrackLink>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{note}</p>
      </div>
      <div
        className={`relative flex justify-center rounded-[2rem] border border-ink/10 bg-surface p-4 shadow-[var(--shadow-hero)] ${flip ? "md:order-1" : ""}`}
      >
        {visual}
      </div>
    </section>
  );
}

/** Tap→result strip: editorial quote row with gold rule. */
export function TapStrip({ title, tapEffect }: { title: string; tapEffect: string }) {
  return (
    <Section title={title}>
      <p className="max-w-3xl border-s-4 border-gold ps-5 text-lg font-medium text-pretty text-text">
        {tapEffect}
      </p>
    </Section>
  );
}

/** Editorial problem/use-case split: prose left, context chips right. */
export function ProblemSplit({
  problem,
  useCasesTitle,
  useCases,
}: {
  problem: string;
  useCasesTitle: string;
  useCases: string[];
}) {
  return (
    <Section title={useCasesTitle}>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <p className="max-w-xl rounded-[1.75rem] border border-border bg-surface p-5 text-lg leading-relaxed text-pretty text-text shadow-card md:p-6">
          {problem}
        </p>
        <ul className="flex flex-col gap-2.5">
          {useCases.map((useCase) => (
            <li
              key={useCase}
              className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-surface px-4 py-3 text-[15px] font-medium text-text shadow-card"
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong"
              >
                <span aria-hidden="true" className="karti-flip-rtl inline-block">
                  →
                </span>
              </span>
              {useCase}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/** Audience checklist with recognizable markers. */
export function AudienceList({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface p-4 text-[15px] font-medium text-text shadow-card"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong"
            >
              <LuCheck className="h-3.5 w-3.5" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Box-free numbered flow in the approved homepage language. */
export function StepsFlow({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Section title={title}>
      <ol className="divide-y divide-border/70 border-y border-border/70">
        {steps.map((step, index) => (
          <li key={step} className="grid gap-1 py-6 sm:grid-cols-[auto_1fr] sm:gap-6">
            <p
              aria-hidden="true"
              className="font-display text-4xl font-bold tracking-[-0.02em] text-ink/15 tabular-nums"
            >
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="font-display text-xl font-bold text-text">{step}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

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

/** Benefits grid with icon chips. */
export function BenefitsGrid({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 md:p-5"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong"
            >
              <LuCheck className="h-4 w-4" />
            </span>
            <span className="text-[15px] leading-relaxed font-medium text-text">{item}</span>
          </li>
        ))}
      </ul>
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

/** Customization prose + included checklist. */
export function IncludedBlock({
  title,
  customization,
  included,
}: {
  title: string;
  customization: string;
  included: string[];
}) {
  return (
    <Section title={title}>
      <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted">{customization}</p>
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {included.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-surface px-4 py-3 text-sm font-medium text-text shadow-card"
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong"
            >
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * Catalog-aware pricing section. A configured fixed price shows the exact
 * visible price (CMS image thumb, pricing note); a product without a
 * configured price shows an honest pending state with no order CTA.
 * Visible price and JSON-LD Offer price derive from the same minor units,
 * so they always match.
 */
export function PriceBlock({
  locale,
  dict,
  pricing,
  priceLine,
  pricingNote,
  imageUrl,
  imageAlt,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  pricing: string;
  priceLine: string | null;
  pricingNote?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
}) {
  const note = pricingNote?.trim() !== "" ? pricingNote : pricing;
  return (
    <Section title={dict.productPage.pricingTitle}>
      <div className="rounded-[1.75rem] border border-ink/10 bg-surface p-5 shadow-card md:p-6">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt ?? ""}
            width={1600}
            height={1200}
            sizes="(max-width: 768px) 100vw, 800px"
            loading="lazy"
            className="mb-4 aspect-[4/3] w-full rounded-2xl border border-border object-cover"
          />
        ) : null}
        {priceLine ? (
          <>
            <p className="font-display text-3xl font-bold tracking-[-0.02em] text-text">
              {priceLine}
            </p>
            <p className="mt-2.5 max-w-2xl text-lg leading-relaxed font-medium text-pretty text-text">
              {note}
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
              {dict.order.pricePending}
            </p>
            <p className="mt-2.5 max-w-2xl text-lg leading-relaxed font-medium text-pretty text-text">
              {note}
            </p>
          </>
        )}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {priceLine ? (
            <Link
              href={orderPath(locale)}
              className="font-display inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-[15px] font-bold text-white hover:bg-accent-strong"
            >
              {dict.common.orderNow}
            </Link>
          ) : null}
          <Link
            href={localePath(locale, "pricing")}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full px-6 text-[15px] font-semibold text-ink underline-offset-4 hover:underline"
          >
            {dict.common.learnMore}
            <span aria-hidden="true" className="karti-flip-rtl">
              →
            </span>
          </Link>
        </div>
      </div>
    </Section>
  );
}

/** Related products with names, taglines, and paths. */
export function RelatedGrid({
  locale,
  dict,
  products,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  products: ProductType[];
}) {
  return (
    <Section title={dict.productPage.relatedTitle}>
      <ul className="grid gap-3 sm:grid-cols-3">
        {products.map((item) => (
          <li
            key={item}
            className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5"
          >
            <p className="font-display text-base font-bold text-text">{dict.products[item].name}</p>
            <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">
              {dict.products[item].tagline}
            </p>
            <Link
              href={localePath(locale, "products", productSlugFromType(item))}
              className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink underline-offset-4 hover:underline"
            >
              {dict.common.learnMore}
              <span aria-hidden="true" className="karti-flip-rtl">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
