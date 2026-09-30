/**
 * Product marketing pages (Phase 5 visual pass): one coherent system for
 * all 8 products with distinct per-product storytelling, composed from
 * existing localized copy only. Shared blocks live in
 * marketing/ProductBlocks; heroes use large card → tap → phone visuals.
 */

import { notFound } from "next/navigation";
import { LuGlobe, LuNavigation, LuPhone } from "react-icons/lu";
import { SiGoogle, SiInstagram, SiWhatsapp } from "react-icons/si";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { productSlugFromType, productTypeFromSlug } from "./products";
import { localePath, orderPath } from "./site";
import { Breadcrumbs } from "./marketing/Breadcrumbs";
import { FaqList } from "./marketing/Faq";
import { CardMockup, ChatPhone, PhoneFrame, ReviewPhone, TapVisual } from "./marketing/Mockups";
import {
  AudienceList,
  BenefitsGrid,
  IncludedBlock,
  ProblemSplit,
  ProductHero,
  QuoteBlock,
  RelatedGrid,
  ScenarioCards,
  StepsFlow,
  TapStrip,
} from "./marketing/ProductBlocks";
import { CtaBlock, PageContainer, Section } from "./marketing/Section";
import { StickyCta } from "./marketing/StickyCta";
import { FaqOpenTracker, PageView, TrackLink } from "./marketing/Trackers";

/** Explicit related-product paths per product story (max 3, excludes self). */
const RELATED: Record<ProductType, [ProductType, ProductType, ProductType]> = {
  PERSONAL_CARD: ["CAREER_CARD", "CONTACT_CARD", "BUSINESS_CARD"],
  CAREER_CARD: ["PERSONAL_CARD", "CONTACT_CARD", "BUSINESS_CARD"],
  BUSINESS_CARD: ["GOOGLE_REVIEW_CARD", "WHATSAPP_CARD", "INSTAGRAM_CARD"],
  GOOGLE_REVIEW_CARD: ["BUSINESS_CARD", "WHATSAPP_CARD", "INSTAGRAM_CARD"],
  WHATSAPP_CARD: ["BUSINESS_CARD", "GOOGLE_REVIEW_CARD", "CONTACT_CARD"],
  INSTAGRAM_CARD: ["BUSINESS_CARD", "GOOGLE_REVIEW_CARD", "CUSTOM_LINK_CARD"],
  CONTACT_CARD: ["PERSONAL_CARD", "CAREER_CARD", "BUSINESS_CARD"],
  CUSTOM_LINK_CARD: ["BUSINESS_CARD", "INSTAGRAM_CARD", "CONTACT_CARD"],
};

function PersonalHero({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.products.PERSONAL_CARD;
  return (
    <ProductHero
      locale={locale}
      product="PERSONAL_CARD"
      dict={dict}
      visual={
        <PhoneFrame
          size="lg"
          title={copy.name}
          lines={copy.audience.slice(0, 3)}
          footnote={copy.tapEffect}
        />
      }
    />
  );
}

function CareerHero({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.products.CAREER_CARD;
  return (
    <ProductHero
      locale={locale}
      product="CAREER_CARD"
      dict={dict}
      flip
      visual={
        <TapVisual
          size="lg"
          cardLabel="Karti"
          phoneTitle={copy.name}
          phoneLines={copy.useCases.slice(0, 3)}
          phoneNote={copy.tapEffect}
        />
      }
    />
  );
}

function BusinessHero({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.products.BUSINESS_CARD;
  return (
    <ProductHero
      locale={locale}
      product="BUSINESS_CARD"
      dict={dict}
      visual={
        <div className="flex w-full flex-col items-center gap-5">
          <div aria-hidden="true" className="flex items-center gap-3">
            {[LuPhone, SiWhatsapp, LuNavigation, LuGlobe].map((Icon, index) => (
              <span
                key={index}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-text"
              >
                <Icon className="h-6 w-6" />
              </span>
            ))}
          </div>
          <PhoneFrame
            size="lg"
            title={copy.name}
            lines={copy.benefits.slice(0, 3)}
            footnote={copy.tapEffect}
          />
        </div>
      }
    />
  );
}

function ReviewHero({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.products.GOOGLE_REVIEW_CARD;
  return (
    <ProductHero
      locale={locale}
      product="GOOGLE_REVIEW_CARD"
      dict={dict}
      visual={
        <ReviewPhone
          size="lg"
          title={copy.name}
          footnote={copy.tapEffect}
          icon={<SiGoogle className="h-4 w-4 text-text" />}
        />
      }
    />
  );
}

function ChatHero({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.products.WHATSAPP_CARD;
  return (
    <ProductHero
      locale={locale}
      product="WHATSAPP_CARD"
      dict={dict}
      visual={
        <ChatPhone
          size="lg"
          title={copy.name}
          bubbles={[copy.tagline, copy.tapEffect]}
          footnote={copy.customization}
          icon={<SiWhatsapp className="h-4 w-4 text-text" />}
        />
      }
    />
  );
}

function SocialHero({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.products.INSTAGRAM_CARD;
  return (
    <ProductHero
      locale={locale}
      product="INSTAGRAM_CARD"
      dict={dict}
      flip
      visual={
        <div className="flex w-full flex-col items-center gap-5">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted text-text"
          >
            <SiInstagram className="h-7 w-7" />
          </span>
          <PhoneFrame
            size="lg"
            title={copy.name}
            lines={copy.useCases.slice(0, 3)}
            footnote={copy.tapEffect}
          />
        </div>
      }
    />
  );
}

function ContactHero({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.products.CONTACT_CARD;
  return (
    <ProductHero
      locale={locale}
      product="CONTACT_CARD"
      dict={dict}
      visual={
        <PhoneFrame
          size="lg"
          title={copy.name}
          lines={copy.useCases.slice(0, 3)}
          footnote={copy.tapEffect}
        />
      }
    />
  );
}

/** Same physical card, reconfigurable destination — approved bridge reuse. */
function LinkHero({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const copy = dict.products.CUSTOM_LINK_CARD;
  const m = dict.marketingHome;
  const today = copy.useCases[0] ?? copy.name;
  const later = copy.useCases[2] ?? copy.tapEffect;
  return (
    <ProductHero
      locale={locale}
      product="CUSTOM_LINK_CARD"
      dict={dict}
      flip
      visual={
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs font-bold tracking-wide text-accent uppercase">{m.todayLabel}</p>
            <CardMockup label="Karti" size="md" />
            <p className="rounded-lg bg-surface-muted px-3 py-1.5 text-center text-sm font-semibold">
              {today}
            </p>
          </div>
          <p className="rounded-full border border-border bg-surface px-4 py-2 text-center text-xs font-semibold whitespace-nowrap text-muted">
            {m.sameCardLabel}
          </p>
          <div className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs font-bold tracking-wide text-accent uppercase">{m.laterLabel}</p>
            <CardMockup label="Karti" size="md" />
            <p className="rounded-lg bg-surface-muted px-3 py-1.5 text-center text-sm font-semibold">
              {later}
            </p>
          </div>
        </div>
      }
    />
  );
}

/** Google Review: WITHOUT (search maze) vs WITH Karti (tap → review). */
function ReviewComparison({ dict }: { dict: VitrineDict }) {
  const copy = dict.products.GOOGLE_REVIEW_CARD;
  return (
    <Section title={dict.productPage.outcomeTitle} subtitle={copy.problem}>
      <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-muted/60 p-6">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted"
          >
            <SiGoogle className="h-7 w-7" />
          </span>
          <div aria-hidden="true" className="flex w-full max-w-[220px] flex-col gap-2">
            <span className="h-2.5 w-full rounded-full bg-border" />
            <span className="h-2.5 w-5/6 rounded-full bg-border" />
            <span className="h-2.5 w-2/3 rounded-full bg-border" />
            <span className="mt-1 h-9 w-full rounded-xl bg-border" />
          </div>
          <p className="text-center text-sm text-muted">{copy.customization}</p>
        </div>
        <div aria-hidden="true" className="flex items-center justify-center">
          <span className="text-4xl font-bold text-accent md:hidden">↓</span>
          <span className="hidden text-4xl font-bold text-accent md:inline rtl:-scale-x-100">
            →
          </span>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-accent/40 bg-surface p-6">
          <CardMockup label="Karti" sublabel={copy.name} size="md" />
          <p className="rounded-xl bg-surface-muted px-4 py-3 text-center text-base font-medium text-text">
            <span aria-hidden="true" className="font-bold text-accent">
              Tap →{" "}
            </span>
            {copy.tapEffect}
          </p>
        </div>
      </div>
    </Section>
  );
}

/** Contact: focused save moment — minimal profile, one-tap save, distinction. */
function ContactFocus({ dict }: { dict: VitrineDict }) {
  const copy = dict.products.CONTACT_CARD;
  const saveLine = copy.benefits[1] ?? copy.benefits[0] ?? copy.outcome;
  const distinction = copy.faq[0]?.a ?? copy.outcome;
  return (
    <Section title={dict.productPage.demoTitle}>
      <ul className="grid gap-4 md:grid-cols-3">
        {[copy.outcome, saveLine, distinction].map((line, index) => (
          <li
            key={index}
            className="rounded-2xl border border-border bg-surface p-6 text-base leading-relaxed text-text"
          >
            {line}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function FaqSection({
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
      <FaqList items={items} idPrefix={`product-faq-${slug}`} />
    </Section>
  );
}

function FinalCta({
  locale,
  dict,
  product,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  product: ProductType;
}) {
  const template = dict.productPage;
  return (
    <div className="py-10">
      <CtaBlock
        title={template.finalTitle}
        subtitle={template.finalSubtitle}
        primary={{
          href: orderPath(locale, productSlugFromType(product)),
          label: template.orderCta,
        }}
      />
    </div>
  );
}

export function ProductPage({
  locale,
  dict,
  slug,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  slug: string;
}) {
  const product: ProductType | null = productTypeFromSlug(slug);
  if (!product) notFound();
  const copy = dict.products[product];
  const template = dict.productPage;
  const related = RELATED[product];
  const scenarios = dict.examplesPage.items.filter((item) => item.product === product);

  const hero =
    product === "PERSONAL_CARD" ? (
      <PersonalHero locale={locale} dict={dict} />
    ) : product === "CAREER_CARD" ? (
      <CareerHero locale={locale} dict={dict} />
    ) : product === "BUSINESS_CARD" ? (
      <BusinessHero locale={locale} dict={dict} />
    ) : product === "GOOGLE_REVIEW_CARD" ? (
      <ReviewHero locale={locale} dict={dict} />
    ) : product === "WHATSAPP_CARD" ? (
      <ChatHero locale={locale} dict={dict} />
    ) : product === "INSTAGRAM_CARD" ? (
      <SocialHero locale={locale} dict={dict} />
    ) : product === "CONTACT_CARD" ? (
      <ContactHero locale={locale} dict={dict} />
    ) : (
      <LinkHero locale={locale} dict={dict} />
    );

  const concise = !(
    product === "PERSONAL_CARD" ||
    product === "CAREER_CARD" ||
    product === "BUSINESS_CARD"
  );

  return (
    <PageContainer>
      <PageView event="product_page_view" payload={{ product, locale }} />
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.common.products, url: localePath(locale) + "/#products" },
          { label: copy.name, url: localePath(locale, "products", slug) },
        ]}
      />
      <FaqOpenTracker sectionId="product-faq" page={`product:${slug}`} />
      {hero}
      <StickyCta
        href={orderPath(locale, productSlugFromType(product))}
        title={copy.name}
        action={template.orderCta}
      />

      {product === "GOOGLE_REVIEW_CARD" ? <ReviewComparison dict={dict} /> : null}
      {product === "GOOGLE_REVIEW_CARD" ? (
        <ProblemSplit
          problem={copy.problem}
          useCasesTitle={template.useCasesTitle}
          useCases={copy.useCases}
        />
      ) : product === "CUSTOM_LINK_CARD" ? (
        <>
          <ProblemSplit
            problem={copy.problem}
            useCasesTitle={template.useCasesTitle}
            useCases={copy.useCases}
          />
          <TapStrip title={template.demoTitle} tapEffect={copy.tapEffect} />
        </>
      ) : product === "CONTACT_CARD" ? (
        <>
          <TapStrip title={template.demoTitle} tapEffect={copy.tapEffect} />
          <ContactFocus dict={dict} />
          <ProblemSplit
            problem={copy.problem}
            useCasesTitle={template.useCasesTitle}
            useCases={copy.useCases}
          />
        </>
      ) : (
        <>
          <TapStrip title={template.demoTitle} tapEffect={copy.tapEffect} />
          <ProblemSplit
            problem={copy.problem}
            useCasesTitle={template.useCasesTitle}
            useCases={copy.useCases}
          />
        </>
      )}

      {concise ? null : <AudienceList title={copy.audienceTitle} items={copy.audience} />}
      {product === "GOOGLE_REVIEW_CARD" ? (
        <Section title={template.customizationTitle}>
          <div className="rounded-2xl border-2 border-accent/40 bg-surface p-6 md:p-8">
            <p className="max-w-2xl text-lg leading-relaxed text-text">{copy.customization}</p>
            <div className="mt-6">
              <TrackLink
                href={orderPath(locale, productSlugFromType(product))}
                event="product_cta_click"
                payload={{ product, locale, placement: "review-help" }}
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast hover:bg-accent-strong"
              >
                {dict.common.orderNow}
              </TrackLink>
            </div>
          </div>
        </Section>
      ) : null}

      <StepsFlow title={copy.stepsTitle} steps={copy.steps} />
      <BenefitsGrid title={copy.benefitsTitle} items={copy.benefits} />
      <ScenarioCards locale={locale} dict={dict} items={scenarios} />
      {concise ? null : (
        <IncludedBlock
          title={template.includedTitle}
          customization={copy.customization}
          included={copy.included}
        />
      )}
      <QuoteBlock locale={locale} dict={dict} pricing={copy.pricing} />
      <FaqSection dict={dict} slug={slug} items={copy.faq} />
      <RelatedGrid locale={locale} dict={dict} products={[...related]} />
      <FinalCta locale={locale} dict={dict} product={product} />
    </PageContainer>
  );
}
