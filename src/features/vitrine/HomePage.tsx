/**
 * Final marketing homepage (Phase 5, visual pass): premium physical-product
 * storytelling — CARD → TAP → PHONE → RESULT — with chapter rhythm.
 * Server-first; GoalSelector + TapDemo are the only client islands.
 */

import Link from "next/link";
import { LuLink2, LuPhone } from "react-icons/lu";
import { SiGoogle, SiInstagram, SiWhatsapp } from "react-icons/si";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { allProducts, productSlugFromType } from "./products";
import { localePath, orderPath, solutionKeyToSlug, solutionPath } from "./site";
import { FaqList } from "./marketing/Faq";
import { GoalSelector } from "./marketing/GoalSelector";
import { CardMockup, PhoneFrame, TapVisual } from "./marketing/Mockups";
import { PageContainer, PrimaryCta, SecondaryCta, Section } from "./marketing/Section";
import { TapDemo } from "./marketing/TapDemo";
import { FaqOpenTracker, PageView, TrackLink } from "./marketing/Trackers";

const PROFILE_PRODUCTS = ["PERSONAL_CARD", "CAREER_CARD", "BUSINESS_CARD"] as const;

const DIRECT_ICONS = {
  GOOGLE_REVIEW_CARD: SiGoogle,
  WHATSAPP_CARD: SiWhatsapp,
  INSTAGRAM_CARD: SiInstagram,
  CONTACT_CARD: LuPhone,
  CUSTOM_LINK_CARD: LuLink2,
} as const;

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
  /** Visible catalog price per product (absent = QUOTE/unpublished, no price shown). */
  priceLines?: Partial<Record<ProductType, string>> | null;
}) {
  const m = dict.marketingHome;
  const visibleProfileProducts = PROFILE_PRODUCTS.filter(
    (product) => publishedFlags?.[product] !== false,
  );
  const visibleDirectProducts = (
    [
      "GOOGLE_REVIEW_CARD",
      "WHATSAPP_CARD",
      "INSTAGRAM_CARD",
      "CONTACT_CARD",
      "CUSTOM_LINK_CARD",
    ] as const
  ).filter((product) => publishedFlags?.[product] !== false);
  const firstDemoTab = m.demoTabs[0];
  const differentiator = m.whyItems[m.whyItems.length - 1];
  const supporting = m.whyItems.slice(0, -1);

  return (
    <>
      <PageView event="homepage_view" payload={{ locale }} />
      <FaqOpenTracker sectionId="faq" page="home" />

      {/* 1 — Editorial hero: asymmetric, display type, photo-well */}
      <div className="karti-hero-grid overflow-hidden">
        <PageContainer>
          <section
            aria-label={dict.home.heroTitle}
            className="grid items-center gap-8 pt-10 pb-8 md:grid-cols-[1.15fr_0.85fr] md:gap-8 md:py-10 lg:py-12 md:min-h-[calc(100svh-7rem)]"
          >
            <div>
              <p className="font-display text-[13px] font-bold tracking-[0.22em] text-accent-strong uppercase">
                NFC + QR <span aria-hidden="true">—</span> {m.heroSupport}
              </p>
              <h1 className="font-display mt-4 max-w-2xl text-4xl leading-[1.0] font-bold tracking-[-0.035em] text-balance text-text sm:text-5xl lg:text-6xl">
                {dict.home.heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted md:text-xl">
                {dict.home.heroSubtitle}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <PrimaryCta href={orderPath(locale)}>{dict.home.orderCta}</PrimaryCta>
                <SecondaryCta href={localePath(locale, "how-it-works")}>
                  {m.heroSecondary}
                </SecondaryCta>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <div
                aria-hidden="true"
                className="absolute -top-8 -right-8 hidden font-display text-[7rem] leading-none font-bold text-ink/[0.06] select-none md:block"
              >
                K
              </div>
              <div className="relative rounded-[2rem] border border-ink/10 bg-surface p-3 shadow-[var(--shadow-hero)] md:p-4">
                {firstDemoTab ? (
                  <TapVisual
                    size="md"
                    cardLabel="Karti"
                    phoneTitle={firstDemoTab.phoneTitle}
                    phoneLines={firstDemoTab.phoneLines}
                  />
                ) : (
                  <CardMockup label="Karti" size="md" />
                )}
              </div>
              <p className="mt-2 text-center text-xs text-muted">{m.demoSubtitle}</p>
            </div>
          </section>
        </PageContainer>
      </div>

      {/* 2 — Marquee trust strip (ink band, scrolling) */}
      <section aria-label="Karti essentials" className="overflow-hidden bg-ink py-4 text-white">
        <div className="karti-marquee flex w-max items-center gap-10 pe-10">
          {[...m.trustItems, ...m.trustItems].map((item, index) => (
            <p
              key={`${item}-${index}`}
              aria-hidden={index >= m.trustItems.length}
              className="font-display flex items-center gap-3 text-[15px] font-bold tracking-wide whitespace-nowrap"
            >
              <span aria-hidden="true" className="text-gold">
                ✦
              </span>
              {item}
            </p>
          ))}
        </div>
      </section>

      {/* 3 — Goal selector (editorial, hairline) */}
      <PageContainer>
        <Section
          id="goals"
          eyebrow={dict.nav.products}
          title={dict.home.goalTitle}
          subtitle={dict.home.goalSubtitle}
        >
          <GoalSelector locale={locale} dict={dict} />
        </Section>
      </PageContainer>

      {/* 4 — Tap demo */}
      <div className="border-y border-border/70 bg-surface">
        <PageContainer>
          <Section title={m.demoTitle} subtitle={m.demoSubtitle} eyebrow="Tap">
            <TapDemo locale={locale} dict={dict} cardLabel="Karti" />
          </Section>
        </PageContainer>
      </div>

      {/* 5 — How it works: oversized editorial numerals, hairline dividers */}
      <PageContainer>
        <Section id="how" title={dict.home.howTitle} eyebrow={m.heroSecondary}>
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

      {/* 6 — Smart profile showcases */}
      <PageContainer>
        <Section
          id="products"
          title={dict.home.productsCta}
          subtitle={dict.home.goalSubtitle}
          eyebrow={dict.nav.products}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {visibleProfileProducts.map((product, index) => {
              const copy = dict.products[product];
              const slug = productSlugFromType(product);
              const priceLine = priceLines?.[product] ?? null;
              const featured = index === 0;
              return (
                <article
                  key={product}
                  aria-label={copy.name}
                  className={`group grid gap-5 overflow-hidden rounded-[2rem] border border-ink/10 bg-surface p-5 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-hero)] md:p-6 ${
                    featured ? "md:col-span-2 md:grid-cols-[1.1fr_0.9fr]" : ""
                  }`}
                >
                  <div>
                    <p className="font-display text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
                      {String(index + 1).padStart(2, "0")} — {copy.tagline}
                    </p>
                    <h3 className="font-display mt-2.5 text-2xl font-bold tracking-[-0.02em] text-balance text-text md:text-3xl">
                      {copy.name}
                    </h3>
                    <p className="mt-2.5 text-base leading-relaxed text-pretty text-muted">
                      {copy.outcome}
                    </p>
                    {priceLine ? (
                      <p className="mt-2 text-lg font-bold text-text">{priceLine}</p>
                    ) : null}
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <TrackLink
                        href={orderPath(locale, slug)}
                        event="product_cta_click"
                        payload={{ product, locale }}
                        className="font-display inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-base font-bold text-white hover:bg-accent-strong"
                      >
                        {dict.common.orderNow}
                      </TrackLink>
                      <Link
                        href={localePath(locale, "products", slug)}
                        className="font-display inline-flex min-h-11 items-center gap-1.5 text-base font-bold text-ink underline-offset-4 hover:underline"
                      >
                        {dict.common.learnMore}
                        <span aria-hidden="true" className="karti-flip-rtl">
                          →
                        </span>
                      </Link>
                    </div>
                  </div>
                  <div className="flex justify-center rounded-[1.5rem] bg-gradient-to-b from-surface-muted/90 to-surface-muted/30 p-4">
                    <PhoneFrame
                      size="md"
                      title={copy.name}
                      lines={copy.audience.slice(0, 3)}
                      footnote={copy.tapEffect}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </Section>
      </PageContainer>

      {/* 7 — Direct actions: editorial index rows (no cards) */}
      <PageContainer>
        <Section title={dict.nav.directGroup} eyebrow={dict.nav.directGroup}>
          <ul className="divide-y divide-border/70 border-y border-border/70">
            {visibleDirectProducts.map((product, index) => {
              const copy = dict.products[product];
              const slug = productSlugFromType(product);
              const priceLine = priceLines?.[product] ?? null;
              const Icon = DIRECT_ICONS[product];
              return (
                <li key={product}>
                  <Link
                    href={localePath(locale, "products", slug)}
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 md:gap-6"
                  >
                    <span
                      aria-hidden="true"
                      className="font-display text-sm font-bold text-ink/30 tabular-nums"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex min-w-0 items-center gap-4">
                      <span
                        aria-hidden="true"
                        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white sm:flex"
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="font-display block truncate text-lg font-bold tracking-[-0.01em] text-text group-hover:underline group-hover:underline-offset-4 md:text-xl">
                          {copy.name}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted">
                          {copy.tapEffect}
                        </span>
                        {priceLine ? (
                          <span className="mt-0.5 block text-sm font-bold text-text">
                            {priceLine}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="karti-flip-rtl font-display flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-lg font-bold transition-all group-hover:border-ink group-hover:bg-ink group-hover:text-white"
                    >
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      </PageContainer>

      {/* 8 — Audiences, editorial */}
      <PageContainer>
        <Section
          title={m.audiencesTitle}
          subtitle={m.audiencesSubtitle}
          eyebrow={dict.nav.solutions}
        >
          <div className="flex flex-col gap-4">
            {m.audiences.map((audience, index) => {
              const flipped = index % 2 === 1;
              return (
                <article
                  key={audience.solution}
                  className="grid items-center gap-5 rounded-[1.75rem] border border-border bg-surface p-5 shadow-card md:grid-cols-2 md:p-6"
                >
                  <div className={flipped ? "md:order-2" : ""}>
                    <p className="text-[13px] font-bold text-accent-strong">
                      {dict.solutions[audience.solution].tagline}
                    </p>
                    <h3 className="font-display mt-1.5 text-xl font-bold tracking-[-0.01em] text-balance text-text">
                      {audience.title}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-pretty text-muted">
                      {audience.desc}
                    </p>
                    <Link
                      href={solutionPath(locale, solutionKeyToSlug(audience.solution))}
                      className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-ink px-5 text-[15px] font-semibold text-white transition-all hover:-translate-y-px"
                    >
                      {dict.common.learnMore}
                      <span aria-hidden="true" className="karti-flip-rtl">
                        →
                      </span>
                    </Link>
                  </div>
                  <div
                    className={`rounded-2xl bg-surface-muted/70 p-5 ${flipped ? "md:order-1" : ""}`}
                  >
                    <p className="text-[13px] font-semibold text-muted">
                      {dict.solutions[audience.solution].problemsTitle}
                    </p>
                    <ul className="mt-2.5 flex list-disc flex-col gap-1.5 ps-5 text-sm text-text">
                      {dict.solutions[audience.solution].problems.map((problem) => (
                        <li key={problem}>{problem}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </Section>
      </PageContainer>

      {/* 9 — Why Karti: editorial statement + hairline supporting rows */}
      <PageContainer>
        <Section title={m.whyTitle} subtitle={m.whySubtitle} eyebrow={dict.home.productsCta}>
          {differentiator ? (
            <div className="border-s-4 border-gold ps-5 md:ps-6">
              <p className="font-display max-w-3xl text-2xl leading-tight font-bold tracking-[-0.02em] text-balance text-text md:text-4xl">
                {differentiator.title}
              </p>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">
                {differentiator.desc}
              </p>
            </div>
          ) : null}
          <ul className="mt-8 divide-y divide-border/70 border-y border-border/70">
            {supporting.map((item) => (
              <li key={item.title} className="grid gap-1 py-4 sm:grid-cols-[1fr_2fr] sm:gap-6">
                <p className="font-display text-base font-bold text-text">{item.title}</p>
                <p className="text-sm leading-relaxed text-muted">{item.desc}</p>
              </li>
            ))}
          </ul>
        </Section>
      </PageContainer>

      {/* 10 — Destination-change: editorial split with stamp */}
      <div className="border-y border-border/70 bg-surface">
        <PageContainer>
          <Section title={m.redirectTitle} subtitle={m.redirectSubtitle} eyebrow="—">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-[1.75rem] border border-ink/10 bg-background p-5 text-center">
                <p className="font-display text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
                  {m.todayLabel}
                </p>
                <div className="mt-3 flex justify-center">
                  <CardMockup label="Karti" size="md" />
                </div>
                <p className="font-display mt-3 text-xl font-bold text-text">Instagram</p>
                <p className="mt-1 text-[13px] text-muted">{m.redirectSteps[0]?.desc ?? ""}</p>
              </div>
              <p className="font-display mx-auto flex h-20 w-20 rotate-[-8deg] items-center justify-center rounded-full bg-ink p-3 text-center text-xs leading-tight font-bold text-white uppercase shadow-[var(--shadow-lift)]">
                {m.sameCardLabel}
              </p>
              <div className="rounded-[1.75rem] border border-ink/10 bg-background p-5 text-center">
                <p className="font-display text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
                  {m.laterLabel}
                </p>
                <div className="mt-3 flex justify-center">
                  <CardMockup label="Karti" size="md" />
                </div>
                <p className="font-display mt-3 text-xl font-bold text-text">
                  {dict.products.CUSTOM_LINK_CARD.name}
                </p>
                <p className="mt-1 text-[13px] text-muted">{m.redirectSteps[1]?.desc ?? ""}</p>
              </div>
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-muted">
              {m.redirectSteps[2]?.desc ?? ""}
            </p>
          </Section>
        </PageContainer>
      </div>

      {/* 11 — Examples preview */}
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
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong"
                  >
                    <span aria-hidden="true" className="karti-flip-rtl inline-block">
                      →
                    </span>
                  </span>
                  {item.tapResult}
                </p>
                <p className="mt-2">
                  <Link
                    href={localePath(locale, "examples")}
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent underline-offset-4 hover:underline"
                  >
                    {dict.common.viewExamples}
                    <span aria-hidden="true" className="karti-flip-rtl">
                      →
                    </span>
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </Section>
      </PageContainer>

      {/* 12 — Pricing preview */}
      <PageContainer>
        <Section
          id="pricing"
          title={dict.home.pricingTitle}
          subtitle={dict.home.pricingDesc}
          eyebrow={dict.nav.pricing}
        >
          <ul className="grid gap-4 md:grid-cols-3">
            {m.pricingTiers.map((tier, index) => (
              <li
                key={tier.title}
                className={`flex flex-col rounded-[1.75rem] border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] md:p-6 ${
                  index === 0 ? "border-accent/40 ring-1 ring-accent/20" : "border-border"
                }`}
              >
                {index === 0 ? (
                  <p className="mb-2.5 inline-flex w-fit items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-strong">
                    ★ {dict.common.orderNow}
                  </p>
                ) : null}
                <p className="font-display text-lg font-bold text-text">{tier.title}</p>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{tier.desc}</p>
                <Link
                  href={localePath(locale, "pricing")}
                  className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-[15px] font-semibold transition-all ${
                    index === 0
                      ? "bg-accent text-accent-contrast shadow-[0_8px_20px_-8px_rgb(14_124_91/0.6)] hover:bg-accent-strong"
                      : "border border-border hover:border-muted"
                  }`}
                >
                  {tier.cta}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </PageContainer>

      {/* 13 — Process flow */}
      <PageContainer>
        <Section title={m.processTitle} eyebrow={m.demoTitle}>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {m.processSteps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-border bg-surface p-4 shadow-card"
              >
                <p
                  aria-hidden="true"
                  className="font-display inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white tabular-nums"
                >
                  {index + 1}
                </p>
                <p className="mt-2.5 text-base font-bold text-text">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{step.desc}</p>
              </li>
            ))}
          </ol>
        </Section>
      </PageContainer>

      {/* 14 — FAQ */}
      <PageContainer>
        <Section id="faq" title={dict.home.faqTitle} eyebrow={dict.nav.faq}>
          <FaqList items={dict.home.faqItems} idPrefix="home-faq" />
          <p className="mt-5">
            <Link
              href={localePath(locale, "faq")}
              className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent underline-offset-4 hover:underline"
            >
              {dict.common.learnMore}
              <span aria-hidden="true" className="karti-flip-rtl">
                →
              </span>
            </Link>
          </p>
        </Section>
      </PageContainer>

      {/* 15 — Final CTA (dark closing) */}
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
                  className="font-display inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-base font-bold text-ink transition-all hover:-translate-y-px"
                >
                  {dict.home.orderCta}
                </Link>
                <Link
                  href={localePath(locale, "contact")}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-7 text-base font-semibold text-white transition-all hover:border-white/60"
                >
                  {m.finalTalkCta}
                </Link>
              </div>
              <p className="mt-5 text-sm text-white/70">
                {m.finalHelpTitle}{" "}
                <Link
                  href={`${localePath(locale)}/#goals`}
                  className="font-semibold text-white underline underline-offset-4"
                >
                  {m.finalHelpCta}
                </Link>
              </p>
            </section>
          </div>
        </div>
      </PageContainer>

      {/* Full product index for crawlers + scanners (unpublished excluded) */}
      <PageContainer>
        <nav aria-label={dict.common.products} className="border-t border-border py-10">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {allProducts()
              .filter((product) => publishedFlags?.[product] !== false)
              .map((product) => (
                <li key={product}>
                  <Link
                    href={localePath(locale, "products", productSlugFromType(product))}
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
