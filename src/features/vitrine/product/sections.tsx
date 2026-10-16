/**
 * PDP content sections (server): fresh ecommerce PDP language built from
 * localized copy + CMS overrides only. No CSS phone/card mockups, no
 * invented claims — every block renders operator-owned words.
 */

import Link from "next/link";
import Image from "next/image";
import { getProductDefinition } from "@/domain/orders/catalog";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { productSlugFromType } from "../products";
import { localePath, orderPath } from "../site";
import { FaqList } from "../marketing/Faq";
import { Section } from "../marketing/Section";
import type { ExampleFilterItem } from "../marketing/ExamplesGrid";
import {
  ArrowGlyph,
  CheckSealIcon,
  DemoSparkIcon,
  DirectTapMark,
  IdentityTapMark,
  SlidersIcon,
  UserRoundIcon,
} from "./icons";
import type { RelatedCard } from "./related";

/** Full PDP description (CMS hero description → outcome text → static outcome). */
export function PdpDescription({ title, description }: { title: string; description: string }) {
  return (
    <Section title={title}>
      <p className="max-w-3xl text-xl leading-relaxed font-medium text-pretty text-text md:text-2xl">
        {description}
      </p>
    </Section>
  );
}

/** After-the-tap moment: signature dark panel + tap mark + effect quote + outcome line. */
export function PdpTapEffect({
  product,
  title,
  tapEffect,
  outcome,
}: {
  product: ProductType;
  title: string;
  tapEffect: string;
  outcome: string;
}) {
  const isProfile = getProductDefinition(product).requiresProfile;
  return (
    <Section title={title}>
      <div className="karti-card-sheen grid items-center gap-6 rounded-[2.5rem] bg-ink p-6 shadow-[var(--shadow-lift)] ring-1 ring-ink/10 md:grid-cols-[auto_1fr] md:gap-10 md:p-10">
        <div
          aria-hidden="true"
          className="flex h-32 w-32 items-center justify-center justify-self-center rounded-[2rem] bg-surface p-5 text-ink shadow-card ring-1 ring-white/25 md:h-40 md:w-40 md:justify-self-start md:p-6"
        >
          {isProfile ? (
            <IdentityTapMark className="h-full w-full" />
          ) : (
            <DirectTapMark className="h-full w-full" />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <p className="max-w-3xl border-s-4 border-gold ps-5 text-xl font-medium text-pretty text-white md:text-2xl">
            {tapEffect}
          </p>
          <p className="max-w-3xl text-[15px] leading-relaxed text-pretty text-white/70 md:text-base">
            {outcome}
          </p>
        </div>
      </div>
    </Section>
  );
}

/** Problem + use-case chips. */
export function PdpUseCases({
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
      <div className="grid items-start gap-5 md:grid-cols-2 md:gap-8">
        <p className="max-w-xl rounded-[2rem] border border-gold/40 bg-gold-soft p-6 text-lg leading-relaxed text-pretty text-text shadow-card md:p-7">
          {problem}
        </p>
        <ul className="flex flex-col gap-2.5">
          {useCases.map((useCase) => (
            <li
              key={useCase}
              className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-border/70 bg-surface px-4 py-3 text-[15px] font-medium text-text shadow-card"
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong"
              >
                <span aria-hidden="true" className="karti-flip-rtl flex">
                  <ArrowGlyph className="h-3.5 w-3.5" />
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

/** Numbered how-it-works flow (step cards — 3-up on desktop, stacked on mobile). */
export function PdpSteps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Section title={title}>
      <ol className="grid gap-3 sm:grid-cols-3 md:gap-4">
        {steps.map((step, index) => (
          <li
            key={step}
            className="flex flex-col gap-3 rounded-[1.75rem] border border-ink/10 bg-surface p-6 shadow-card ring-1 ring-ink/5 md:p-7"
          >
            <p
              aria-hidden="true"
              className="font-display text-5xl font-bold tracking-[-0.02em] text-accent-strong/25 tabular-nums"
            >
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="font-display text-lg leading-snug font-bold text-balance text-text md:text-xl">
              {step}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** Who-is-it-for checklist (compact, muted — benefits below carry the visual weight). */
export function PdpAudience({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-surface-muted/50 px-4 py-3 text-sm font-medium text-text"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-accent-strong shadow-card"
            >
              <UserRoundIcon className="h-3.5 w-3.5" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Benefits grid (primary value props — strongest card treatment on the page). */
export function PdpBenefits({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <ul className="grid gap-3 sm:grid-cols-2 md:gap-4">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-[1.75rem] border border-ink/10 bg-surface p-5 shadow-card ring-1 ring-ink/5 transition-all hover:-translate-y-0.5 md:p-6"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong"
            >
              <CheckSealIcon className="h-5 w-5" />
            </span>
            <span className="text-base leading-relaxed font-medium text-text">{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** What-you-receive checklist + customization prose (one grouped ecommerce panel). */
export function PdpIncluded({
  title,
  customizationTitle,
  customization,
  included,
}: {
  title: string;
  customizationTitle: string;
  customization: string;
  included: string[];
}) {
  return (
    <Section title={title}>
      <div className="rounded-[2rem] border border-ink/10 bg-surface p-5 shadow-card ring-1 ring-ink/5 md:p-8">
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {included.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-surface-muted/50 px-4 py-3 text-sm font-medium text-text"
            >
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center text-accent-strong"
              >
                <CheckSealIcon className="h-5 w-5" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-8 border-t border-border/70 pt-8">
          <h3 className="font-display flex items-center gap-2.5 text-xl font-bold text-text">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-strong"
            >
              <SlidersIcon className="h-5 w-5" />
            </span>
            {customizationTitle}
          </h3>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-pretty text-muted">
            {customization}
          </p>
        </div>
      </div>
    </Section>
  );
}

/** Real example use-cases (no ratings, no invented proof). */
export function PdpExamples({
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
      <ul className="grid gap-4 md:grid-cols-2 md:gap-5">
        {items.slice(0, 2).map((item) => (
          <li
            key={item.name}
            className="flex flex-col rounded-[2rem] border border-ink/10 bg-surface p-6 shadow-card ring-1 ring-ink/5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] md:p-7"
          >
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-muted uppercase">
              <span aria-hidden="true" className="flex text-accent-strong">
                <DemoSparkIcon className="h-4 w-4" />
              </span>
              {dict.common.demoExample}
            </p>
            <p className="font-display mt-1.5 text-lg font-bold tracking-[-0.01em] text-text">
              {item.name}
            </p>
            <p className="mt-1 text-sm text-muted">{item.useCase}</p>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-text">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong"
              >
                <span aria-hidden="true" className="karti-flip-rtl flex">
                  <ArrowGlyph className="h-3 w-3" />
                </span>
              </span>
              {item.tapResult}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
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

export function PdpFaq({
  dict,
  slug,
  items,
}: {
  dict: VitrineDict;
  slug: string;
  items: { q: string; a: string }[];
}) {
  return (
    <Section id="product-faq" title={dict.productPage.faqTitle}>
      <FaqList items={items} idPrefix={`pdp-faq-${slug}`} />
    </Section>
  );
}

/** Related-product cross-sell rail: photo cards, swipeable on mobile. */
export function PdpRelated({
  locale,
  dict,
  cards,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  cards: RelatedCard[];
}) {
  if (cards.length === 0) return null;
  return (
    <Section title={dict.productPage.relatedTitle}>
      <ul className="karti-scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
        {cards.map((card) => {
          const name = card.name ?? dict.products[card.product].name;
          return (
            <li key={card.product} className="w-[68%] shrink-0 snap-start sm:w-auto">
              <Link
                href={localePath(locale, "products", productSlugFromType(card.product))}
                className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-ink/10 bg-surface shadow-card ring-1 ring-ink/5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              >
                {card.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt={card.imageAlt.trim() !== "" ? card.imageAlt : name}
                    width={800}
                    height={600}
                    sizes="(max-width: 640px) 68vw, 400px"
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex aspect-[4/3] w-full items-center justify-center bg-surface-muted/60"
                  >
                    <span className="font-display flex h-14 w-14 items-center justify-center rounded-3xl border border-ink/10 bg-surface text-2xl font-bold text-muted shadow-card">
                      {name.trim().charAt(0).toUpperCase() || "K"}
                    </span>
                  </span>
                )}
                <span className="flex flex-1 flex-col p-5">
                  <span className="font-display text-base font-bold text-text">{name}</span>
                  <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
                    {dict.products[card.product].tagline}
                  </span>
                  {card.priceLine ? (
                    <span className="font-display mt-2 text-lg font-bold text-text tabular-nums">
                      {card.priceLine}
                    </span>
                  ) : null}
                  <span className="mt-2 inline-flex min-h-6 items-center gap-1 text-sm font-semibold text-ink underline-offset-4 group-hover:underline">
                    {dict.common.learnMore}
                    <span aria-hidden="true" className="karti-flip-rtl flex">
                      <ArrowGlyph className="h-4 w-4" />
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
