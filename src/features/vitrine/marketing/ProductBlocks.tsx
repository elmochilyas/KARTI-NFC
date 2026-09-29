/**
 * Shared product-page blocks (Phase 5 visual pass): one coherent system
 * for all 8 products, composed from existing localized copy only.
 * Server components; speaks the approved homepage language (giant
 * numerals, Tap→ strips, scenario cards, icon chips, generous rhythm).
 */

import Link from "next/link";
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
    <section aria-label={copy.name} className="grid items-center gap-10 py-10 md:grid-cols-2 md:gap-12 md:py-14">
      <div className={flip ? "md:order-2" : ""}>
        <p className="text-sm font-semibold text-accent">{copy.tagline}</p>
        <h1 className="mt-2 max-w-xl text-4xl font-bold tracking-tight text-text sm:text-5xl">
          {copy.name}
        </h1>
        <p className="mt-5 max-w-xl text-xl leading-relaxed text-muted">{copy.outcome}</p>
        <div className="mt-8">
          <TrackLink
            href={orderPath(locale, productSlugFromType(product))}
            event="product_cta_click"
            payload={{ product, locale, placement: "hero" }}
            className="inline-flex min-h-14 items-center justify-center rounded-lg bg-accent px-8 text-lg font-medium text-accent-contrast hover:bg-accent-strong"
          >
            {template.orderCta}
          </TrackLink>
        </div>
        <p className="mt-4 max-w-xl text-sm text-muted">{note}</p>
      </div>
      <div className={`flex justify-center ${flip ? "md:order-1" : ""}`}>{visual}</div>
    </section>
  );
}

/** Tap→result strip in the approved homepage style. */
export function TapStrip({ title, tapEffect }: { title: string; tapEffect: string }) {
  return (
    <Section title={title}>
      <p className="max-w-3xl rounded-2xl bg-surface-muted px-5 py-4 text-lg text-text md:px-6 md:py-5">
        <span aria-hidden="true" className="font-bold text-accent">
          Tap →{" "}
        </span>
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
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <p className="max-w-xl text-xl leading-relaxed text-text">{problem}</p>
        <ul className="flex flex-col gap-3">
          {useCases.map((useCase) => (
            <li
              key={useCase}
              className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-5 py-4 text-base font-medium text-text"
            >
              <span aria-hidden="true" className="font-bold text-accent">
                →
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
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5 text-base font-medium text-text"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/[0.12] text-accent"
            >
              <LuCheck className="h-4 w-4" />
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
      <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-4 md:block">
            <p
              aria-hidden="true"
              className="text-5xl font-black tracking-tight text-accent/25 tabular-nums md:text-7xl"
            >
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="text-xl font-bold text-text md:mt-4">{step}</p>
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
            ? "grid gap-8 md:grid-cols-3 md:gap-6"
            : "grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6"
        }
      >
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4 lg:block">
            <p
              aria-hidden="true"
              className="text-5xl font-black tracking-tight text-accent/25 tabular-nums lg:text-6xl"
            >
              {index + 1}
            </p>
            <div className="lg:mt-4">
              <p className="text-xl font-bold text-text">{step.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.desc}</p>
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
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 md:p-6"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-contrast"
            >
              <LuCheck className="h-5 w-5" />
            </span>
            <span className="text-base leading-relaxed font-medium text-text">{item}</span>
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
      <ul className="grid gap-6 md:grid-cols-2">
        {items.slice(0, 2).map((item) => (
          <li
            key={item.name}
            className="flex flex-col rounded-2xl border border-border bg-surface p-6"
          >
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              {dict.common.demoExample}
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight text-text">{item.name}</p>
            <p className="mt-1 text-[15px] text-muted">{item.useCase}</p>
            <div className="mt-4 flex justify-center rounded-xl bg-surface-muted/60 p-4">
              <PhoneFrame title={item.tapResult} lines={[item.useCase]} size="md" />
            </div>
            <p className="mt-4 text-[15px] text-text">
              <span aria-hidden="true" className="font-bold text-accent">
                →{" "}
              </span>
              {item.tapResult}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={localePath(locale, "products", productSlugFromType(item.product))}
                className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-medium hover:border-muted"
              >
                {dict.products[item.product].name}
              </Link>
              <Link
                href={orderPath(locale, productSlugFromType(item.product))}
                className="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-medium text-accent-contrast hover:bg-accent-strong"
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
      <p className="max-w-2xl text-lg leading-relaxed text-muted">{customization}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {included.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-2xl bg-surface-muted/60 px-5 py-4 text-[15px] font-medium text-text"
          >
            <span aria-hidden="true" className="font-bold text-accent">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Honest quote state: product pricing line + pricing page path. */
export function QuoteBlock({
  locale,
  dict,
  pricing,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  pricing: string;
}) {
  return (
    <Section title={dict.productPage.pricingTitle}>
      <div className="rounded-2xl border-2 border-border bg-surface p-6 md:p-8">
        <p className="max-w-2xl text-xl leading-relaxed font-medium text-text">{pricing}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={orderPath(locale)}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast hover:bg-accent-strong"
          >
            {dict.common.requestPrice}
          </Link>
          <Link
            href={localePath(locale, "pricing")}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border px-6 text-base font-medium hover:border-muted"
          >
            {dict.common.learnMore}
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
      <ul className="grid gap-4 sm:grid-cols-3">
        {products.map((item) => (
          <li key={item} className="flex flex-col rounded-2xl border border-border bg-surface p-6">
            <p className="text-lg font-bold text-text">{dict.products[item].name}</p>
            <p className="mt-1 flex-1 text-sm text-muted">{dict.products[item].tagline}</p>
            <Link
              href={localePath(locale, "products", productSlugFromType(item))}
              className="mt-4 inline-flex min-h-11 items-center text-base font-medium text-accent underline"
            >
              {dict.common.learnMore} →
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
