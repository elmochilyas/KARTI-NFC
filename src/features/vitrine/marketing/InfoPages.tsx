/**
 * Shared informational page components (Phase 5): solutions, how-it-works,
 * pricing, examples hub shell, FAQ hub, resources index, articles, legal.
 * Server components; thin per-locale routes wrap these with metadata.
 */

import Link from "next/link";
import type { ArticleSlug, SolutionKey, VitrineDict, VitrineLocale } from "../i18n/dict";
import { productSlugFromType } from "../products";
import { articlePath, localePath, orderPath, solutionKeyToSlug, solutionPath } from "../site";
import { Breadcrumbs } from "./Breadcrumbs";
import { ExamplesGrid } from "./ExamplesGrid";
import { FaqList } from "./Faq";
import { CardMockup, PhoneFrame, QrMock, TapVisual } from "./Mockups";
import { LabeledFlow, ScenarioCards } from "./ProductBlocks";
import { CtaBlock, PageContainer, PageHero, Section } from "./Section";
import { FaqOpenTracker, PageView } from "./Trackers";

export function SolutionPage({
  locale,
  dict,
  solution,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  solution: SolutionKey;
}) {
  const copy = dict.solutions[solution];
  const scenario = dict.examplesPage.items.find((item) =>
    copy.recommend.some((entry) => entry.product === item.product),
  );
  return (
    <PageContainer>
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.nav.solutions, url: `${localePath(locale)}/#goals` },
          { label: copy.name, url: solutionPath(locale, solutionKeyToSlug(solution)) },
        ]}
      />
      <PageHero title={copy.name} tagline={copy.tagline} subtitle={copy.outcome} />
      <Section title={copy.problemsTitle} eyebrow={copy.tagline}>
        <ul className="grid gap-3 md:grid-cols-2">
          {copy.problems.map((problem, index) => (
            <li
              key={problem}
              className="flex gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-card md:p-5"
            >
              <span
                aria-hidden="true"
                className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-base font-bold text-accent-strong tabular-nums"
              >
                {index + 1}
              </span>
              <span className="text-base leading-relaxed text-text">{problem}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={copy.recommendTitle} eyebrow={dict.nav.products}>
        <ul className="grid gap-4 md:grid-cols-2">
          {copy.recommend.map((item) => (
            <li
              key={item.product}
              className="flex flex-col rounded-[1.75rem] border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] md:p-6"
            >
              <p className="font-display text-xs font-bold tracking-[0.18em] text-accent-strong uppercase">
                {dict.products[item.product].tagline} —
              </p>
              <p className="font-display mt-2 text-xl font-bold tracking-[-0.01em] text-text">
                {dict.products[item.product].name}
              </p>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{item.why}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href={orderPath(locale, productSlugFromType(item.product))}
                  className="font-display inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-[15px] font-bold text-white hover:bg-accent-strong"
                >
                  {dict.common.orderNow}
                </Link>
                <Link
                  href={localePath(locale, "products", productSlugFromType(item.product))}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-[15px] font-semibold text-ink underline-offset-4 hover:underline"
                >
                  {dict.common.learnMore}
                  <span aria-hidden="true" className="karti-flip-rtl">
                    →
                  </span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Section>
      {scenario ? <ScenarioCards locale={locale} dict={dict} items={[scenario]} /> : null}
      <Section title={dict.productPage.faqTitle}>
        <FaqList items={copy.faq} idPrefix={`solution-faq-${solution}`} />
      </Section>
      <div className="py-6">
        <CtaBlock
          title={dict.productPage.finalTitle}
          subtitle={dict.productPage.finalSubtitle}
          primary={{ href: orderPath(locale), label: dict.productPage.orderCta }}
        />
      </div>
    </PageContainer>
  );
}

export function HowPage({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.howItWorks;
  const m = dict.marketingHome;
  const demoTab = m.demoTabs[0];
  return (
    <PageContainer>
      <PageView event="solution_page_view" payload={{ page: "how-it-works", locale }} />
      <FaqOpenTracker sectionId="how-faq" page="how-it-works" />
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.nav.howItWorks, url: localePath(locale, "how-it-works") },
        ]}
      />
      <PageHero title={copy.title} subtitle={copy.subtitle} />
      <div className="flex justify-center rounded-[2rem] border border-ink/10 bg-surface p-4 shadow-card md:p-5">
        {demoTab ? (
          <TapVisual
            size="md"
            cardLabel="Karti"
            phoneTitle={demoTab.phoneTitle}
            phoneLines={demoTab.phoneLines}
          />
        ) : (
          <CardMockup label="Karti" sublabel={copy.title} size="md" />
        )}
      </div>
      <LabeledFlow title={copy.tapTitle} steps={copy.tapSteps} columns={3} />
      <LabeledFlow title={m.processTitle} steps={m.processSteps} />
      <Section title={copy.whatTitle}>
        {copy.whatBody.map((paragraph) => (
          <p
            key={paragraph.slice(0, 24)}
            className="mt-2.5 max-w-2xl text-base leading-relaxed text-muted first:mt-0 md:text-lg"
          >
            {paragraph}
          </p>
        ))}
      </Section>
      <Section title={copy.qrTitle}>
        <div className="grid items-center gap-6 rounded-[1.75rem] border border-ink/10 bg-surface p-5 shadow-card md:grid-cols-2 md:p-6">
          <p className="max-w-xl text-base leading-relaxed text-muted md:text-lg">{copy.qrBody}</p>
          <div className="flex flex-row items-center justify-center gap-4">
            <QrMock label={copy.qrTitle} />
            <PhoneFrame title={copy.title} lines={[copy.qrBody]} size="md" />
          </div>
        </div>
      </Section>
      <Section title={copy.compareTitle}>
        <ul className="grid gap-3 md:grid-cols-2">
          <li className="flex flex-col rounded-[1.75rem] border border-border bg-surface p-5 shadow-card md:p-6">
            <p className="font-display text-xs font-bold tracking-[0.18em] text-accent-strong uppercase">{dict.productPage.profileNote}</p>
            <p className="font-display mt-2 text-xl font-bold tracking-[-0.01em] text-text">
              {copy.compare[0]?.title ?? dict.products.PERSONAL_CARD.name}
            </p>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">
              {copy.compare[0]?.desc ?? dict.products.PERSONAL_CARD.outcome}
            </p>
            <Link
              href={localePath(locale, "products", productSlugFromType("PERSONAL_CARD"))}
              className="mt-4 inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-semibold text-ink underline-offset-4 hover:underline"
            >
              {dict.common.learnMore}
              <span aria-hidden="true" className="karti-flip-rtl">
                →
              </span>
            </Link>
          </li>
          <li className="flex flex-col rounded-[1.75rem] border border-ink/10 bg-surface p-5 shadow-card md:p-6">
            <p className="font-display text-xs font-bold tracking-[0.18em] text-accent-strong uppercase">{dict.productPage.directNote}</p>
            <p className="font-display mt-2 text-xl font-bold tracking-[-0.01em] text-text">
              {copy.compare[1]?.title ?? dict.products.GOOGLE_REVIEW_CARD.name}
            </p>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">
              {copy.compare[1]?.desc ?? dict.products.GOOGLE_REVIEW_CARD.outcome}
            </p>
            <Link
              href={localePath(locale, "products", productSlugFromType("GOOGLE_REVIEW_CARD"))}
              className="font-display mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-[15px] font-bold text-white hover:bg-accent-strong"
            >
              {dict.common.learnMore}
            </Link>
          </li>
        </ul>
      </Section>
      <Section title={copy.redirectTitle}>
        {copy.redirectBody.map((paragraph) => (
          <p
            key={paragraph.slice(0, 24)}
            className="mt-2.5 max-w-2xl text-base leading-relaxed text-muted first:mt-0 md:text-lg"
          >
            {paragraph}
          </p>
        ))}
        <div className="mt-6 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex flex-col items-center gap-2.5 rounded-[1.75rem] border border-ink/10 bg-background p-5 text-center">
            <p className="font-display text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">{m.todayLabel}</p>
            <CardMockup label="Karti" size="md" />
            <p className="rounded-xl bg-surface-muted px-3 py-2 text-sm font-semibold">
              Instagram
            </p>
          </div>
          <p className="font-display mx-auto flex h-20 w-20 rotate-[-8deg] items-center justify-center rounded-full bg-ink p-3 text-center text-xs leading-tight font-bold text-white uppercase">
            {m.sameCardLabel}
          </p>
          <div className="flex flex-col items-center gap-2.5 rounded-[1.75rem] border border-ink/10 bg-background p-5 text-center">
            <p className="font-display text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">{m.laterLabel}</p>
            <CardMockup label="Karti" size="md" />
            <p className="rounded-xl bg-surface-muted px-3 py-2 text-sm font-semibold">
              {dict.products.CUSTOM_LINK_CARD.name}
            </p>
          </div>
        </div>
        <p className="mt-5">
          <Link
            href={articlePath(locale, "destination-change")}
            className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-ink underline-offset-4 hover:underline"
          >
            {dict.common.learnMore}
            <span aria-hidden="true" className="karti-flip-rtl">
              →
            </span>
          </Link>
        </p>
      </Section>
      <Section title={copy.recipientTitle}>
        <p className="max-w-2xl text-base leading-relaxed text-muted md:text-lg">{copy.recipientBody}</p>
      </Section>
      <Section title={copy.operatorTitle}>
        <p className="max-w-2xl text-base leading-relaxed text-muted md:text-lg">{copy.operatorBody}</p>
      </Section>
      <Section id="how-faq" title={copy.faqTitle}>
        <FaqList items={copy.faq} idPrefix="how-faq" />
      </Section>
      <div className="py-6">
        <CtaBlock
          title={dict.productPage.finalTitle}
          subtitle={dict.productPage.finalSubtitle}
          primary={{ href: orderPath(locale), label: dict.productPage.orderCta }}
        />
      </div>
    </PageContainer>
  );
}

export function PricingPage({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.pricingPage;
  return (
    <PageContainer>
      <PageView event="pricing_view" payload={{ locale }} />
      <FaqOpenTracker sectionId="pricing-faq" page="pricing" />
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.nav.pricing, url: localePath(locale, "pricing") },
        ]}
      />
      <PageHero title={copy.title} subtitle={copy.subtitle} />
      <Section title={copy.tiersTitle} eyebrow={dict.nav.pricing}>
        <ul className="grid gap-4 md:grid-cols-3">
          {copy.tiers.map((tier, index) => (
            <li
              key={tier.title}
              className={`flex flex-col rounded-[1.75rem] bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] md:p-6 ${
                index === 0
                  ? "border-accent/40 ring-1 ring-accent/20 border"
                  : "border border-border"
              }`}
            >
              {index === 0 ? (
                <p className="font-display mb-2.5 inline-flex w-fit items-center rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">
                  ★ {dict.common.orderNow}
                </p>
              ) : null}
              <p className="font-display text-xl font-bold tracking-[-0.01em] text-balance text-text">
                {tier.title}
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{tier.desc}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {tier.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-text">
                    <span
                      aria-hidden="true"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong"
                    >
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href={orderPath(locale)}
                className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[15px] font-bold transition-all ${
                  index === 0
                    ? "bg-ink text-white hover:bg-accent-strong"
                    : "border border-border hover:border-muted"
                }`}
              >
                {tier.cta}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Section title={copy.includedTitle}>
          <ul className="flex flex-col gap-2.5">
            {copy.included.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-surface px-4 py-3 text-[15px] text-text shadow-card"
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
        <Section title={copy.factorsTitle}>
          <ul className="flex flex-col gap-2.5">
            {copy.factors.map((item, index) => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-2xl bg-surface-muted/60 px-4 py-3 text-[15px] leading-relaxed text-muted"
              >
                <span
                  aria-hidden="true"
                  className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink text-[13px] font-bold text-white tabular-nums"
                >
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <LabeledFlow title={copy.processTitle} steps={copy.processSteps} columns={3} />
      <Section id="pricing-faq" title={copy.faqTitle}>
        <FaqList items={copy.faq} idPrefix="pricing-faq" />
      </Section>
      <div className="py-6">
        <CtaBlock
          title={copy.ctaTitle}
          subtitle={copy.ctaSubtitle}
          primary={{ href: orderPath(locale), label: dict.common.requestPrice }}
          secondary={{ href: localePath(locale, "contact"), label: dict.common.talkToUs }}
        />
      </div>
    </PageContainer>
  );
}

export function ExamplesHubPage({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.examplesPage;
  return (
    <PageContainer>
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.nav.examples, url: localePath(locale, "examples") },
        ]}
      />
      <PageHero title={copy.title} subtitle={copy.subtitle} />
      <div className="py-6">
        <ExamplesGrid
          locale={locale}
          dict={dict}
          items={copy.items}
          demoLabel={dict.common.demoExample}
        />
      </div>
      <p className="pb-10 text-sm text-muted">{copy.note}</p>
    </PageContainer>
  );
}

export function FaqHubPage({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.faqHub;
  return (
    <PageContainer>
      <FaqOpenTracker sectionId="faq-hub" page="faq" />
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.nav.faq, url: localePath(locale, "faq") },
        ]}
      />
      <PageHero title={copy.title} subtitle={copy.subtitle} />
      <div id="faq-hub" className="flex flex-col gap-8 py-6">
        {copy.categories.map((category, index) => (
          <section
            key={category.name}
            aria-label={category.name}
            id={`faq-cat-${index}`}
            className="scroll-mt-24 border-t border-border/70 pt-5 first:border-t-0 first:pt-0"
          >
            <p
              aria-hidden="true"
              className="font-display text-[13px] font-bold tracking-[0.2em] text-ink/30 tabular-nums"
            >
              {String(index + 1).padStart(2, "0")} —
            </p>
            <h2 className="font-display mt-1.5 text-xl font-bold tracking-[-0.01em] text-text md:text-2xl">
              {category.name}
            </h2>
            <div className="mt-3">
              <FaqList items={category.items} idPrefix={`faq-cat-${index}`} />
            </div>
          </section>
        ))}
      </div>
      <div className="py-6">
        <CtaBlock
          title={dict.productPage.finalTitle}
          subtitle={dict.productPage.finalSubtitle}
          primary={{ href: orderPath(locale), label: dict.productPage.orderCta }}
          secondary={{ href: localePath(locale, "contact"), label: dict.common.talkToUs }}
        />
      </div>
    </PageContainer>
  );
}

export function ResourcesPage({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.resourcesPage;
  return (
    <PageContainer>
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.nav.resources, url: localePath(locale, "resources") },
        ]}
      />
      <PageHero title={copy.title} subtitle={copy.subtitle} />
      <Section title={copy.topicsTitle}>
        <ul className="flex flex-col divide-y divide-border/70 border-y border-border/70">
          {copy.topics.map((topic, index) => (
            <li key={topic.title}>
              <Link
                href={localePath(locale, topic.href)}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4"
              >
                <span aria-hidden="true" className="font-display text-[13px] font-bold text-ink/30 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-lg font-bold tracking-[-0.01em] text-text group-hover:underline group-hover:underline-offset-4 md:text-xl">
                    {topic.title}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted">{topic.desc}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="karti-flip-rtl font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/15 text-base font-bold transition-all group-hover:border-ink group-hover:bg-ink group-hover:text-white"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={copy.guidesTitle}>
        <ul className="grid gap-4 md:grid-cols-3">
          {(Object.keys(dict.articles) as ArticleSlug[]).map((slug, index) => {
            const article = dict.articles[slug];
            return (
              <li
                key={slug}
                className="flex flex-col rounded-[1.75rem] border border-border bg-surface p-5 shadow-card"
              >
                <p
                  aria-hidden="true"
                  className="font-display text-[13px] font-bold tracking-[0.2em] text-ink/30 tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")} —
                </p>
                <Link
                  href={articlePath(locale, slug)}
                  className="font-display mt-2 text-lg font-bold tracking-[-0.01em] text-text hover:underline hover:underline-offset-4"
                >
                  {article.title}
                </Link>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                  {article.description}
                </p>
                <Link
                  href={articlePath(locale, slug)}
                  className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink underline-offset-4 hover:underline"
                >
                  {dict.common.learnMore}
                  <span aria-hidden="true" className="karti-flip-rtl">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
      <Section title={copy.comingTitle}>
        <p className="max-w-2xl border-s-4 border-gold ps-5 text-[15px] leading-relaxed text-muted">{copy.comingDesc}</p>
      </Section>
    </PageContainer>
  );
}

export function ArticlePage({
  locale,
  dict,
  slug,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  slug: ArticleSlug;
}) {
  const article = dict.articles[slug];
  return (
    <PageContainer>
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.nav.resources, url: localePath(locale, "resources") },
          { label: article.title, url: articlePath(locale, slug) },
        ]}
      />
      <PageHero title={article.title} subtitle={article.description} />
      <p className="font-display max-w-2xl py-5 text-xl leading-relaxed font-medium text-pretty text-text md:text-2xl">{article.intro}</p>
      {article.sections.map((section, index) => (
        <section key={section.heading} aria-label={section.heading} className="border-t border-border/70 py-5 first:border-t-0 first:pt-0">
          <p
            aria-hidden="true"
            className="font-display text-[13px] font-bold tracking-[0.2em] text-ink/30 tabular-nums"
          >
            {String(index + 1).padStart(2, "0")} —
          </p>
          <h2 className="font-display mt-1.5 max-w-2xl text-xl font-bold tracking-[-0.01em] text-text md:text-2xl">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 32)}
              className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted md:text-base"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <Section title={dict.productPage.faqTitle}>
        <FaqList items={article.faq} idPrefix={`article-faq-${slug}`} />
      </Section>
      <div className="py-6">
        <CtaBlock
          title={dict.productPage.finalTitle}
          subtitle={dict.productPage.finalSubtitle}
          primary={{ href: orderPath(locale), label: dict.productPage.orderCta }}
        />
      </div>
    </PageContainer>
  );
}

export function LegalPage({
  locale,
  dict,
  slug,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  slug: "privacy" | "terms" | "delivery";
}) {
  const titles = {
    privacy: dict.legal.privacyTitle,
    terms: dict.legal.termsTitle,
    delivery: dict.legal.deliveryTitle,
  } as const;
  const bodies = {
    privacy: dict.legal.privacy,
    terms: dict.legal.terms,
    delivery: dict.legal.delivery,
  } as const;
  return (
    <PageContainer>
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: titles[slug], url: localePath(locale, slug) },
        ]}
      />
      <PageHero title={titles[slug]} subtitle={`${dict.legal.updatedLabel}: 2026}`} />
      <div className="divide-y divide-border/70 border-y border-border/70">
      {bodies[slug].map((section) => (
        <section key={section.heading} aria-label={section.heading} className="py-4">
          <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-text">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 32)}
              className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      </div>
    </PageContainer>
  );
}
