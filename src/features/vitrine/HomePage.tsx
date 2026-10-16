/**
 * Marketing homepage (focused 6-section structure): Hero → Products →
 * How it works → Examples → FAQ → Final CTA, followed by the shared
 * Footer. The product rail comes immediately after the hero so a visitor
 * sees "what Karti is" and "which card is mine" without scrolling far.
 *
 * Server-first; ProductRail, the trackers and the FAQ are the only
 * client/browser bits. No fabricated prices (see ProductRail).
 */

import Link from "next/link";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { allProducts, productSlugFromType } from "./products";
import { localePath, orderPath } from "./site";
import { FaqList } from "./marketing/Faq";
import { PhoneFrame, TapVisual } from "./marketing/Mockups";
import { PageContainer, PrimaryCta, Section } from "./marketing/Section";
import { FaqOpenTracker, PageView } from "./marketing/Trackers";
import { ProductRail } from "./ProductRail";

export function HomePage({
  locale,
  dict,
  publishedFlags = null,
  priceLines = null,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  /** Unpublished products are excluded from marketing listings (null = all listed). */
  publishedFlags?: Record<ProductType, boolean> | null;
  /** Visible fixed catalog price per product (absent = price not configured, no price shown). */
  priceLines?: Partial<Record<ProductType, string>> | null;
}) {
  const m = dict.marketingHome;
  const firstDemoTab = m.demoTabs[0];

  return (
    <>
      <PageView event="homepage_view" payload={{ locale }} />
      <FaqOpenTracker sectionId="faq" page="home" />

      {/* 1 — HERO: what Karti is + one clear next step */}
      <div className="overflow-hidden">
        <PageContainer>
          <section
            aria-label={dict.home.heroTitle}
            className="grid items-center gap-8 pt-7 pb-9 md:grid-cols-[1.1fr_0.9fr] md:gap-12 md:py-16"
          >
            <div>
              <h1 className="font-display max-w-2xl text-4xl leading-[1.02] font-bold tracking-[-0.035em] text-balance text-text sm:text-5xl lg:text-6xl">
                {dict.home.heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted md:text-xl">
                {dict.home.heroSubtitle}
              </p>
              <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7">
                <PrimaryCta href="#products">{m.heroPrimary}</PrimaryCta>
                <Link
                  href="#how"
                  className="font-display inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-ink underline-offset-4 hover:underline"
                >
                  {m.heroSecondary}
                  <span aria-hidden="true" className="karti-flip-rtl">
                    →
                  </span>
                </Link>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <div className="relative rounded-[2rem] border border-ink/10 bg-surface p-3 shadow-[var(--shadow-hero)] md:p-4">
                {firstDemoTab ? (
                  <TapVisual
                    size="md"
                    cardLabel="Karti"
                    phoneTitle={firstDemoTab.phoneTitle}
                    phoneLines={firstDemoTab.phoneLines}
                  />
                ) : null}
              </div>
            </div>
          </section>
        </PageContainer>
      </div>

      {/* 2 — PRODUCTS: the five customer-facing categories + real prices */}
      <ProductRail
        locale={locale}
        dict={dict}
        publishedFlags={publishedFlags}
        priceLines={priceLines}
      />

      {/* 3 — HOW IT WORKS */}
      <PageContainer>
        <Section id="how" title={dict.home.howTitle} eyebrow={dict.nav.howItWorks}>
          <ol className="divide-y divide-border/70 border-y border-border/70">
            {dict.home.howSteps.map((step, index) => (
              <li
                key={step.title}
                className="grid gap-1.5 py-5 sm:grid-cols-[auto_1fr] sm:gap-6 md:py-6"
              >
                <p
                  aria-hidden="true"
                  className="font-display text-4xl font-bold tracking-[-0.03em] text-ink/15 tabular-nums md:text-5xl"
                >
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div>
                  <p className="font-display text-xl font-bold tracking-[-0.01em] text-text">
                    {step.title}
                  </p>
                  <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-muted">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8">
            <Link
              href={localePath(locale, "how-it-works")}
              prefetch={false}
              className="font-display inline-flex min-h-11 items-center gap-1.5 text-base font-bold text-ink underline-offset-4 hover:underline"
            >
              {dict.common.learnMore}
              <span aria-hidden="true" className="karti-flip-rtl">
                →
              </span>
            </Link>
          </p>
        </Section>
      </PageContainer>

      {/* 4 — EXAMPLES */}
      <div className="border-y border-border/70 bg-surface">
        <PageContainer>
          <Section
            title={m.examplesTitle}
            subtitle={m.examplesSubtitle}
            eyebrow={dict.common.demoExample}
          >
            <ul className="grid gap-4 md:grid-cols-3">
              {dict.examplesPage.items.slice(0, 3).map((item) => (
                <li
                  key={item.name}
                  className="flex flex-col rounded-2xl border border-border bg-background p-5 shadow-card"
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
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong"
                    >
                      <span aria-hidden="true" className="karti-flip-rtl inline-block">
                        →
                      </span>
                    </span>
                    {item.tapResult}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              <Link
                href={localePath(locale, "examples")}
                prefetch={false}
                className="font-display inline-flex min-h-11 items-center gap-1.5 text-base font-bold text-accent-strong underline-offset-4 hover:underline"
              >
                {dict.common.viewExamples}
                <span aria-hidden="true" className="karti-flip-rtl">
                  →
                </span>
              </Link>
            </p>
          </Section>
        </PageContainer>
      </div>

      {/* 5 — FAQ (top buyer questions) */}
      <PageContainer>
        <Section id="faq" title={dict.home.faqTitle} eyebrow={dict.nav.faq}>
          <FaqList items={dict.home.faqItems} idPrefix="home-faq" />
          <p className="mt-5">
            <Link
              href={localePath(locale, "faq")}
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline-offset-4 hover:underline"
            >
              {dict.common.learnMore}
              <span aria-hidden="true" className="karti-flip-rtl">
                →
              </span>
            </Link>
          </p>
        </Section>
      </PageContainer>

      {/* 6 — FINAL CTA (dark closing) */}
      <PageContainer>
        <div className="karti-card-sheen relative overflow-hidden rounded-[2rem] bg-ink">
          <div
            aria-hidden="true"
            className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 -left-10 h-72 w-72 rounded-full bg-gold/15 blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-12 md:px-10 md:py-14">
            <section aria-label={dict.home.finalTitle} className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-balance text-white md:text-4xl">
                {dict.home.finalTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-pretty text-white/70 md:text-lg">
                {dict.home.finalSubtitle}
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={orderPath(locale)}
                  prefetch={false}
                  className="font-display inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-base font-bold text-ink transition-all hover:-translate-y-px"
                >
                  {dict.home.orderCta}
                </Link>
                <Link
                  href={localePath(locale, "contact")}
                  prefetch={false}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-7 text-base font-semibold text-white transition-all hover:border-white/60"
                >
                  {m.finalTalkCta}
                </Link>
              </div>
              <p className="mt-5 text-sm text-white/70">
                {m.finalHelpTitle}{" "}
                <Link
                  href="#products"
                  className="font-semibold text-white underline underline-offset-4"
                >
                  {m.finalHelpCta}
                </Link>
              </p>
            </section>
          </div>
        </div>
      </PageContainer>

      {/* Crawlable full-product index (unpublished excluded): keeps every
          product page reachable for search/scanners without adding a
          seventh marketing section. */}
      <PageContainer>
        <nav aria-label={dict.common.products} className="border-t border-border py-10">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {allProducts()
              .filter((product) => publishedFlags?.[product] !== false)
              .map((product) => (
                <li key={product}>
                  <Link
                    href={localePath(locale, "products", productSlugFromType(product))}
                    prefetch={false}
                    className="inline-flex min-h-11 items-center text-[15px] text-muted underline hover:text-text"
                  >
                    {dict.products[product].name}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </PageContainer>
    </>
  );
}
