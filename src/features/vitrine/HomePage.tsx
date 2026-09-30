/**
 * Final marketing homepage (Phase 5, visual pass): premium physical-product
 * storytelling — CARD → TAP → PHONE → RESULT — with chapter rhythm.
 * Server-first; GoalSelector + TapDemo are the only client islands.
 */

import Link from "next/link";
import { LuLink2, LuPhone } from "react-icons/lu";
import { SiGoogle, SiInstagram, SiWhatsapp } from "react-icons/si";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { allProducts, productSlugFromType } from "./products";
import { localePath, orderPath, solutionKeyToSlug, solutionPath } from "./site";
import { FaqList } from "./marketing/Faq";
import { GoalSelector } from "./marketing/GoalSelector";
import { CardMockup, PhoneFrame, TapVisual } from "./marketing/Mockups";
import { Band, PageContainer, PrimaryCta, SecondaryCta, Section } from "./marketing/Section";
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

export function HomePage({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const m = dict.marketingHome;
  const firstDemoTab = m.demoTabs[0];
  const differentiator = m.whyItems[m.whyItems.length - 1];
  const supporting = m.whyItems.slice(0, -1);

  return (
    <>
      <PageView event="homepage_view" payload={{ locale }} />
      <FaqOpenTracker sectionId="faq" page="home" />

      {/* 1 — Hero */}
      <PageContainer>
        <section
          aria-label={dict.home.heroTitle}
          className="grid items-center gap-10 py-14 md:grid-cols-2 md:gap-12 md:py-20"
        >
          <div>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
              {dict.home.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-xl leading-relaxed text-muted">
              {dict.home.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta href={orderPath(locale)}>{dict.home.orderCta}</PrimaryCta>
              <SecondaryCta href={localePath(locale, "how-it-works")}>
                {m.heroSecondary}
              </SecondaryCta>
            </div>
            <p className="mt-5 text-sm font-medium text-muted">{m.heroSupport}</p>
          </div>
          <div className="mx-auto w-full max-w-2xl">
            {firstDemoTab ? (
              <TapVisual
                size="xl"
                cardLabel="Karti"
                phoneTitle={firstDemoTab.phoneTitle}
                phoneLines={firstDemoTab.phoneLines}
              />
            ) : (
              <CardMockup label="Karti" size="xl" />
            )}
          </div>
        </section>
      </PageContainer>

      {/* 2 — Trust strip */}
      <section aria-label="Karti essentials" className="border-y border-border py-5">
        <PageContainer>
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-[15px] font-medium text-muted">
            {m.trustItems.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base font-bold text-accent">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </PageContainer>
      </section>

      {/* 3 — Goal selector */}
      <Band id="goals" label={dict.home.goalTitle}>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-text md:text-4xl">
          {dict.home.goalTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted">
          {dict.home.goalSubtitle}
        </p>
        <div className="mt-8">
          <GoalSelector locale={locale} dict={dict} />
        </div>
      </Band>

      {/* 4 — Tap demo */}
      <PageContainer>
        <Section title={m.demoTitle} subtitle={m.demoSubtitle}>
          <TapDemo locale={locale} dict={dict} cardLabel="Karti" />
        </Section>
      </PageContainer>

      {/* 5 — How it works */}
      <PageContainer>
        <Section id="how" title={dict.home.howTitle}>
          <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
            {dict.home.howSteps.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 md:block">
                <p
                  aria-hidden="true"
                  className="text-5xl font-black tracking-tight text-accent/25 tabular-nums md:text-7xl"
                >
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div className="md:mt-4">
                  <p className="text-xl font-bold text-text">{step.title}</p>
                  <p className="mt-2 text-base leading-relaxed text-muted">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8">
            <Link
              href={localePath(locale, "how-it-works")}
              className="inline-flex min-h-11 items-center font-medium text-accent underline"
            >
              {dict.common.learnMore} →
            </Link>
          </p>
        </Section>
      </PageContainer>

      {/* 6 — Smart profile showcases */}
      <PageContainer>
        <Section id="products" title={dict.home.productsCta} subtitle={dict.home.goalSubtitle}>
          <div className="flex flex-col gap-12 md:gap-16">
            {PROFILE_PRODUCTS.map((product, index) => {
              const copy = dict.products[product];
              const slug = productSlugFromType(product);
              const flipped = index % 2 === 1;
              return (
                <article
                  key={product}
                  aria-label={copy.name}
                  className="grid items-center gap-8 md:grid-cols-2 md:gap-12"
                >
                  <div className={flipped ? "md:order-2" : ""}>
                    <p className="text-sm font-semibold text-accent">{copy.tagline}</p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-text md:text-3xl">
                      {copy.name}
                    </h3>
                    <p className="mt-3 text-lg leading-relaxed text-muted">{copy.outcome}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={localePath(locale, "products", slug)}
                        className="inline-flex min-h-12 items-center rounded-lg border border-border bg-surface px-6 text-base font-medium hover:border-muted"
                      >
                        {dict.common.learnMore}
                      </Link>
                      <TrackLink
                        href={orderPath(locale, slug)}
                        event="product_cta_click"
                        payload={{ product, locale }}
                        className="inline-flex min-h-12 items-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast hover:bg-accent-strong"
                      >
                        {dict.common.orderNow}
                      </TrackLink>
                    </div>
                  </div>
                  <div className={`flex justify-center ${flipped ? "md:order-1" : ""}`}>
                    <PhoneFrame
                      size="lg"
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

      {/* 7 — Direct action products: 2 featured + 3 compact */}
      <Band label={dict.nav.directGroup}>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-text md:text-4xl">
          {dict.nav.directGroup}
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {(["GOOGLE_REVIEW_CARD", "WHATSAPP_CARD"] as const).map((product) => {
            const copy = dict.products[product];
            const slug = productSlugFromType(product);
            const Icon = DIRECT_ICONS[product];
            return (
              <li
                key={product}
                className="flex flex-col rounded-2xl border-2 border-border bg-surface p-6 md:p-8"
              >
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted"
                >
                  <Icon className="h-8 w-8 text-text" />
                </span>
                <p className="mt-4 text-2xl font-bold tracking-tight text-text">{copy.name}</p>
                <p className="mt-2 flex-1 text-base leading-relaxed text-muted">
                  <span aria-hidden="true" className="font-bold text-accent">
                    Tap →{" "}
                  </span>
                  {copy.tapEffect}
                </p>
                <span className="mt-6 flex flex-wrap gap-3">
                  <TrackLink
                    href={orderPath(locale, slug)}
                    event="product_cta_click"
                    payload={{ product, locale }}
                    className="inline-flex min-h-12 items-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast hover:bg-accent-strong"
                  >
                    {dict.common.orderNow}
                  </TrackLink>
                  <Link
                    href={localePath(locale, "products", slug)}
                    className="inline-flex min-h-12 items-center rounded-lg border border-border px-6 text-base font-medium hover:border-muted"
                  >
                    {dict.common.learnMore}
                  </Link>
                </span>
              </li>
            );
          })}
        </ul>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {(["INSTAGRAM_CARD", "CONTACT_CARD", "CUSTOM_LINK_CARD"] as const).map((product) => {
            const copy = dict.products[product];
            const slug = productSlugFromType(product);
            const Icon = DIRECT_ICONS[product];
            return (
              <li key={product} className="flex items-center gap-4 rounded-2xl bg-surface p-5">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted"
                >
                  <Icon className="h-6 w-6 text-text" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-text">{copy.name}</span>
                  <TrackLink
                    href={orderPath(locale, slug)}
                    event="product_cta_click"
                    payload={{ product, locale }}
                    className="mt-0.5 inline-flex min-h-11 items-center text-sm font-medium text-accent underline"
                  >
                    {dict.common.orderNow} →
                  </TrackLink>
                </span>
              </li>
            );
          })}
        </ul>
      </Band>

      {/* 8 — Audiences, editorial */}
      <PageContainer>
        <Section title={m.audiencesTitle} subtitle={m.audiencesSubtitle}>
          <div className="flex flex-col gap-10">
            {m.audiences.map((audience, index) => {
              const flipped = index % 2 === 1;
              return (
                <article key={audience.solution} className="grid items-center gap-6 md:grid-cols-2">
                  <div className={flipped ? "md:order-2" : ""}>
                    <p className="text-sm font-semibold text-accent">
                      {dict.solutions[audience.solution].tagline}
                    </p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-text">
                      {audience.title}
                    </h3>
                    <p className="mt-3 text-lg leading-relaxed text-muted">{audience.desc}</p>
                    <Link
                      href={solutionPath(locale, solutionKeyToSlug(audience.solution))}
                      className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast hover:bg-accent-strong"
                    >
                      {dict.common.learnMore} →
                    </Link>
                  </div>
                  <div
                    className={`rounded-2xl bg-surface-muted/70 p-6 md:p-8 ${flipped ? "md:order-1" : ""}`}
                  >
                    <p className="text-sm font-semibold text-muted">
                      {dict.solutions[audience.solution].problemsTitle}
                    </p>
                    <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 text-[15px] text-text">
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

      {/* 9 — Why Karti: one differentiator + supporting */}
      <PageContainer>
        <Section title={m.whyTitle} subtitle={m.whySubtitle}>
          {differentiator ? (
            <div className="rounded-2xl bg-text px-6 py-10 text-background md:px-10 md:py-14">
              <p className="max-w-2xl text-2xl font-bold tracking-tight md:text-4xl">
                {m.redirectTitle}
              </p>
              <p className="mt-3 max-w-2xl text-lg text-background/75">{differentiator.desc}</p>
            </div>
          ) : null}
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {supporting.map((item) => (
              <li key={item.title} className="rounded-2xl border border-border bg-surface p-6">
                <p className="text-lg font-bold text-text">{item.title}</p>
                <p className="mt-2 text-[15px] text-muted">{item.desc}</p>
              </li>
            ))}
          </ul>
        </Section>
      </PageContainer>

      {/* 10 — Destination-change flow */}
      <Band label={m.redirectTitle}>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-text md:text-4xl">
          {m.redirectTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted">{m.redirectSubtitle}</p>
        <div className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-bold tracking-wide text-accent uppercase">{m.todayLabel}</p>
            <CardMockup label="Karti" size="md" />
            <p aria-hidden="true" className="text-2xl font-bold text-accent">
              ↓
            </p>
            <p className="rounded-lg bg-surface-muted px-4 py-2 text-base font-semibold">
              Instagram
            </p>
            <p className="text-center text-sm text-muted">{m.redirectSteps[0]?.desc ?? ""}</p>
          </div>
          <div
            aria-hidden="true"
            className="flex items-center justify-center gap-3 md:flex-col md:gap-2"
          >
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
            <p className="text-center text-sm text-muted">{m.redirectSteps[1]?.desc ?? ""}</p>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-[15px] text-muted">
          {m.redirectSteps[2]?.desc ?? ""}
        </p>
      </Band>

      {/* 11 — Examples preview */}
      <PageContainer>
        <Section title={m.examplesTitle} subtitle={m.examplesSubtitle}>
          <ul className="grid gap-6 md:grid-cols-3">
            {dict.examplesPage.items.slice(0, 3).map((item) => (
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
                <p className="mt-4">
                  <Link
                    href={localePath(locale, "examples")}
                    className="inline-flex min-h-11 items-center text-base font-medium text-accent underline"
                  >
                    {dict.common.viewExamples} →
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </Section>
      </PageContainer>

      {/* 12 — Pricing preview */}
      <PageContainer>
        <Section id="pricing" title={dict.home.pricingTitle} subtitle={dict.home.pricingDesc}>
          <ul className="grid gap-4 md:grid-cols-3">
            {m.pricingTiers.map((tier) => (
              <li
                key={tier.title}
                className="flex flex-col rounded-2xl border-2 border-border bg-surface p-6 md:p-8"
              >
                <p className="text-xl font-bold text-text">{tier.title}</p>
                <p className="mt-2 flex-1 text-[15px] text-muted">{tier.desc}</p>
                <Link
                  href={localePath(locale, "pricing")}
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast hover:bg-accent-strong"
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
        <Section title={m.processTitle}>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {m.processSteps.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 lg:block">
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
      </PageContainer>

      {/* 14 — FAQ */}
      <PageContainer>
        <Section id="faq" title={dict.home.faqTitle}>
          <FaqList items={dict.home.faqItems} idPrefix="home-faq" />
          <p className="mt-5">
            <Link
              href={localePath(locale, "faq")}
              className="inline-flex min-h-11 items-center font-medium text-accent underline"
            >
              {dict.common.learnMore} →
            </Link>
          </p>
        </Section>
      </PageContainer>

      {/* 15 — Final CTA (dark closing) */}
      <div className="bg-text">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <section aria-label={dict.home.finalTitle} className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-background md:text-5xl">
              {dict.home.finalTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-background/70">
              {dict.home.finalSubtitle}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={orderPath(locale)}
                className="inline-flex min-h-14 items-center justify-center rounded-lg bg-accent px-8 text-lg font-medium text-accent-contrast hover:bg-accent-strong"
              >
                {dict.home.orderCta}
              </Link>
              <Link
                href={localePath(locale, "contact")}
                className="inline-flex min-h-14 items-center justify-center rounded-lg border border-background/30 px-8 text-lg font-medium text-background hover:border-background/60"
              >
                {m.finalTalkCta}
              </Link>
            </div>
            <p className="mt-6 text-[15px] text-background/70">
              {m.finalHelpTitle}{" "}
              <Link
                href={`${localePath(locale)}/#goals`}
                className="font-medium text-background underline"
              >
                {m.finalHelpCta}
              </Link>
            </p>
          </section>
        </div>
      </div>

      {/* Full product index for crawlers + scanners */}
      <PageContainer>
        <nav aria-label={dict.common.products} className="border-t border-border py-10">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {allProducts().map((product) => (
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
