/**
 * Shared informational page components (Phase 5): solutions, how-it-works,
 * pricing, examples hub shell, FAQ hub, resources index, articles, legal.
 * Server components; thin per-locale routes wrap these with metadata.
 */

import Link from "next/link";
import type { ArticleSlug, SolutionKey, VitrineDict, VitrineLocale } from "../i18n/dict";
import { productSlugFromType } from "../products";
import {
  articlePath,
  localePath,
  orderPath,
  solutionKeyToSlug,
  solutionPath,
} from "../site";
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
          { label: dict.nav.solutions, url: localePath(locale) + "/#solutions" },
          { label: copy.name, url: solutionPath(locale, solutionKeyToSlug(solution)) },
        ]}
      />
      <PageHero title={copy.name} tagline={copy.tagline} subtitle={copy.outcome} />
      <Section title={copy.problemsTitle}>
        <ul className="grid gap-4 md:grid-cols-2">
          {copy.problems.map((problem, index) => (
            <li
              key={problem}
              className="flex gap-4 rounded-2xl bg-surface-muted/60 p-5 md:p-6"
            >
              <span
                aria-hidden="true"
                className="text-3xl font-black tracking-tight text-accent/30 tabular-nums"
              >
                {index + 1}
              </span>
              <span className="text-lg leading-relaxed text-text">{problem}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={copy.recommendTitle}>
        <ul className="grid gap-5 md:grid-cols-2">
          {copy.recommend.map((item) => (
            <li
              key={item.product}
              className="flex flex-col rounded-2xl border-2 border-border bg-surface p-6 md:p-8"
            >
              <p className="text-sm font-semibold text-accent">
                {dict.products[item.product].tagline}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-text">
                {dict.products[item.product].name}
              </p>
              <p className="mt-3 flex-1 text-base leading-relaxed text-muted">{item.why}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={orderPath(locale, productSlugFromType(item.product))}
                  className="inline-flex min-h-12 items-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast hover:bg-accent-strong"
                >
                  {dict.common.orderNow}
                </Link>
                <Link
                  href={localePath(locale, "products", productSlugFromType(item.product))}
                  className="inline-flex min-h-12 items-center rounded-lg border border-border px-6 text-base font-medium hover:border-muted"
                >
                  {dict.common.learnMore}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Section>
      {scenario ? (
        <ScenarioCards locale={locale} dict={dict} items={[scenario]} />
      ) : null}
      <Section title={dict.productPage.faqTitle}>
        <FaqList items={copy.faq} idPrefix={`solution-faq-${solution}`} />
      </Section>
      <div className="py-10">
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
      <div className="flex justify-center py-6">
        {demoTab ? (
          <TapVisual
            size="lg"
            cardLabel="Karti"
            phoneTitle={demoTab.phoneTitle}
            phoneLines={demoTab.phoneLines}
          />
        ) : (
          <CardMockup label="Karti" sublabel={copy.title} size="lg" />
        )}
      </div>
      <LabeledFlow title={copy.tapTitle} steps={copy.tapSteps} columns={3} />
      <LabeledFlow title={m.processTitle} steps={m.processSteps} />
      <Section title={copy.whatTitle}>
        {copy.whatBody.map((paragraph) => (
          <p key={paragraph.slice(0, 24)} className="mt-3 max-w-2xl text-lg leading-relaxed text-muted first:mt-0">
            {paragraph}
          </p>
        ))}
      </Section>
      <Section title={copy.qrTitle}>
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <p className="max-w-xl text-lg leading-relaxed text-muted">{copy.qrBody}</p>
          <div className="flex flex-col items-center gap-4">
            <QrMock label={copy.qrTitle} />
            <PhoneFrame title={copy.title} lines={[copy.qrBody]} size="md" />
          </div>
        </div>
      </Section>
      <Section title={copy.compareTitle}>
        <ul className="grid gap-5 md:grid-cols-2">
          <li className="flex flex-col rounded-2xl border-2 border-border bg-surface p-6 md:p-8">
            <p className="text-sm font-semibold text-accent">
              {dict.productPage.profileNote}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-text">
              {copy.compare[0]?.title ?? dict.products.PERSONAL_CARD.name}
            </p>
            <p className="mt-3 flex-1 text-base leading-relaxed text-muted">
              {copy.compare[0]?.desc ?? dict.products.PERSONAL_CARD.outcome}
            </p>
            <Link
              href={localePath(locale, "products", productSlugFromType("PERSONAL_CARD"))}
              className="mt-6 inline-flex min-h-12 items-center self-start rounded-lg border border-border px-6 text-base font-medium hover:border-muted"
            >
              {dict.common.learnMore}
            </Link>
          </li>
          <li className="flex flex-col rounded-2xl border-2 border-border bg-surface p-6 md:p-8">
            <p className="text-sm font-semibold text-accent">
              {dict.productPage.directNote}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-text">
              {copy.compare[1]?.title ?? dict.products.GOOGLE_REVIEW_CARD.name}
            </p>
            <p className="mt-3 flex-1 text-base leading-relaxed text-muted">
              {copy.compare[1]?.desc ?? dict.products.GOOGLE_REVIEW_CARD.outcome}
            </p>
            <Link
              href={localePath(locale, "products", productSlugFromType("GOOGLE_REVIEW_CARD"))}
              className="mt-6 inline-flex min-h-12 items-center self-start rounded-lg border border-border px-6 text-base font-medium hover:border-muted"
            >
              {dict.common.learnMore}
            </Link>
          </li>
        </ul>
      </Section>
      <Section title={copy.redirectTitle}>
        {copy.redirectBody.map((paragraph) => (
          <p key={paragraph.slice(0, 24)} className="mt-3 max-w-2xl text-lg leading-relaxed text-muted first:mt-0">
            {paragraph}
          </p>
        ))}
        <div className="mt-8 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-bold tracking-wide text-accent uppercase">{m.todayLabel}</p>
            <CardMockup label="Karti" size="md" />
            <p aria-hidden="true" className="text-2xl font-bold text-accent">
              ↓
            </p>
            <p className="rounded-lg bg-surface-muted px-4 py-2 text-base font-semibold">Instagram</p>
          </div>
          <div aria-hidden="true" className="flex items-center justify-center gap-3 md:flex-col md:gap-2">
            <span className="h-px w-10 bg-border sm:w-16 md:h-16 md:w-px" />
            <p className="rounded-full border border-border bg-surface px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-muted">
              {m.sameCardLabel}
            </p>
            <span className="h-px w-10 bg-border sm:w-16 md:h-16 md:w-px" />
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-bold tracking-wide text-accent uppercase">{m.laterLabel}</p>
            <CardMockup label="Karti" size="md" />
            <p aria-hidden="true" className="text-2xl font-bold text-accent">
              ↓
            </p>
            <p className="rounded-lg bg-surface-muted px-4 py-2 text-base font-semibold">
              {dict.products.CUSTOM_LINK_CARD.name}
            </p>
          </div>
        </div>
        <p className="mt-6">
          <Link
            href={articlePath(locale, "destination-change")}
            className="inline-flex min-h-11 items-center font-medium text-accent underline"
          >
            {dict.common.learnMore} →
          </Link>
        </p>
      </Section>
      <Section title={copy.recipientTitle}>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">{copy.recipientBody}</p>
      </Section>
      <Section title={copy.operatorTitle}>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">{copy.operatorBody}</p>
      </Section>
      <Section id="how-faq" title={copy.faqTitle}>
        <FaqList items={copy.faq} idPrefix="how-faq" />
      </Section>
      <div className="py-10">
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
      <Section title={copy.tiersTitle}>
        <ul className="grid gap-5 md:grid-cols-3">
          {copy.tiers.map((tier, index) => (
            <li
              key={tier.title}
              className={`flex flex-col rounded-2xl bg-surface p-6 md:p-8 ${
                index === 0 ? "border-2 border-accent/50" : "border border-border"
              }`}
            >
              <p className="text-2xl font-bold tracking-tight text-text">{tier.title}</p>
              <p className="mt-2 text-base text-muted">{tier.desc}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {tier.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-[15px] text-text">
                    <span aria-hidden="true" className="font-bold text-accent">
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href={orderPath(locale)}
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast hover:bg-accent-strong"
              >
                {tier.cta}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <div className="grid gap-10 md:grid-cols-2 md:gap-12">
        <Section title={copy.includedTitle}>
          <ul className="flex flex-col gap-3">
            {copy.included.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl bg-surface-muted/60 px-5 py-4 text-base text-text"
              >
                <span aria-hidden="true" className="font-bold text-accent">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Section>
        <Section title={copy.factorsTitle}>
          <ul className="flex flex-col gap-3">
            {copy.factors.map((item, index) => (
              <li key={item} className="flex items-start gap-3 text-base leading-relaxed text-muted">
                <span
                  aria-hidden="true"
                  className="text-base font-black text-accent/40 tabular-nums"
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
      <div className="py-10">
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
        <ExamplesGrid locale={locale} dict={dict} items={copy.items} demoLabel={dict.common.demoExample} />
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
      <div id="faq-hub" className="flex flex-col gap-12 py-8">
        {copy.categories.map((category, index) => (
          <section
            key={category.name}
            aria-label={category.name}
            id={`faq-cat-${index}`}
            className="scroll-mt-20"
          >
            <p
              aria-hidden="true"
              className="text-sm font-black tracking-[0.18em] text-accent/50 tabular-nums"
            >
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-text md:text-3xl">
              {category.name}
            </h2>
            <div className="mt-4">
              <FaqList items={category.items} idPrefix={`faq-cat-${index}`} />
            </div>
          </section>
        ))}
      </div>
      <div className="py-10">
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
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {copy.topics.map((topic, index) => (
            <li key={topic.title}>
              <Link
                href={localePath(locale, topic.href)}
                className="group flex items-baseline gap-4 py-5 md:gap-6 md:py-6"
              >
                <span
                  aria-hidden="true"
                  className="text-sm font-black text-accent/40 tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xl font-bold tracking-tight text-text group-hover:underline md:text-2xl">
                    {topic.title}
                  </span>
                  <span className="mt-1 block text-base text-muted">{topic.desc}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-xl font-bold text-accent rtl:-scale-x-100"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={copy.guidesTitle}>
        <ul className="grid gap-5 md:grid-cols-3">
          {(Object.keys(dict.articles) as ArticleSlug[]).map((slug, index) => {
            const article = dict.articles[slug];
            return (
              <li key={slug} className="flex flex-col rounded-2xl border border-border bg-surface p-6">
                <p
                  aria-hidden="true"
                  className="text-sm font-black tracking-[0.18em] text-accent/50 tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")}
                </p>
                <Link
                  href={articlePath(locale, slug)}
                  className="mt-2 text-xl font-bold tracking-tight text-text hover:underline"
                >
                  {article.title}
                </Link>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">
                  {article.description}
                </p>
                <Link
                  href={articlePath(locale, slug)}
                  className="mt-4 inline-flex min-h-11 items-center text-base font-medium text-accent underline"
                >
                  {dict.common.learnMore} →
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
      <Section title={copy.comingTitle}>
        <p className="max-w-2xl text-base leading-relaxed text-muted">{copy.comingDesc}</p>
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
      <p className="max-w-2xl py-6 text-xl leading-relaxed text-text">{article.intro}</p>
      {article.sections.map((section, index) => (
        <section key={section.heading} aria-label={section.heading} className="py-5">
          <p
            aria-hidden="true"
            className="text-sm font-black tracking-[0.18em] text-accent/50 tabular-nums"
          >
            {String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="mt-1 max-w-2xl text-2xl font-bold tracking-tight text-text">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <Section title={dict.productPage.faqTitle}>
        <FaqList items={article.faq} idPrefix={`article-faq-${slug}`} />
      </Section>
      <div className="py-10">
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
      <PageHero title={titles[slug]} subtitle={`${dict.legal.updatedLabel}: 2026`} />
      {bodies[slug].map((section) => (
        <section key={section.heading} aria-label={section.heading} className="py-4">
          <h2 className="text-xl font-bold tracking-tight text-text">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="mt-2 max-w-2xl text-base leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </PageContainer>
  );
}


