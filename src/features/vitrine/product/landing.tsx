/**
 * Product landing page (PDP rebuild): ecommerce product-page structure
 * for all 8 products — gallery + buy panel header, then description,
 * tap effect, use cases, steps, audience, benefits, included, examples,
 * FAQ, related, final CTA.
 *
 * Composed from localized copy + CMS overrides only. No mockups, no
 * invented prices/ratings. Replaces the editorial `ProductPage`
 * storytelling layout on the locale product routes.
 */

import { notFound } from "next/navigation";
import type { ProductType } from "@/domain/orders/productTypes";
import {
  catalogPriceLine,
  resolveProductCopy,
  resolveProductLanding,
} from "@/features/catalog/copy";
import type { PublicCatalogProduct } from "@/features/catalog/public";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { productSlugFromType, productTypeFromSlug } from "../products";
import { localePath, orderPath } from "../site";
import { Breadcrumbs } from "../marketing/Breadcrumbs";
import { FaqOpenTracker, PageView } from "../marketing/Trackers";
import { CtaBlock, PageContainer } from "../marketing/Section";
import { StickyCta } from "../marketing/StickyCta";
import { ProductBuyPanel } from "./buy-panel";
import { ProductGallery } from "./gallery";
import type { RelatedCard } from "./related";
import {
  PdpAudience,
  PdpBenefits,
  PdpDescription,
  PdpExamples,
  PdpFaq,
  PdpIncluded,
  PdpRelated,
  PdpSteps,
  PdpTapEffect,
  PdpUseCases,
} from "./sections";

export function ProductLandingPage({
  locale,
  dict: baseDict,
  slug,
  catalog = null,
  relatedCards = [],
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  slug: string;
  /** Published CMS overlay, or null (unpublished/unpriced/unreachable → static fallback). */
  catalog?: PublicCatalogProduct | null;
  /** Photo/price cards for related products (unpublished entries excluded upstream). */
  relatedCards?: RelatedCard[];
}) {
  const product: ProductType | null = productTypeFromSlug(slug);
  if (!product) notFound();
  const staticCopy = baseDict.products[product];
  const copy = resolveProductCopy(staticCopy, catalog);
  const landing = resolveProductLanding(staticCopy, catalog);
  const priceLine = catalogPriceLine(catalog);
  const template = baseDict.productPage;
  const scenarios = baseDict.examplesPage.items.filter((item) => item.product === product);
  const gallery = catalog?.galleryImages ?? [];
  const orderHref = orderPath(locale, productSlugFromType(product));

  return (
    <PageContainer>
      <PageView event="product_page_view" payload={{ product, locale }} />
      <Breadcrumbs
        trail={[
          { label: baseDict.common.home, url: localePath(locale) },
          { label: baseDict.common.products, url: localePath(locale) + "/#products" },
          { label: copy.name, url: localePath(locale, "products", slug) },
        ]}
      />
      <FaqOpenTracker sectionId="product-faq" page={`product:${slug}`} />
      <StickyCta
        href={orderHref}
        title={copy.name}
        action={template.orderCta}
        meta={priceLine}
        shortAction={baseDict.nav.orderCtaShort}
      />

      <div className="grid items-start gap-6 py-4 md:gap-10 md:py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="w-full lg:sticky lg:top-24">
          <ProductGallery
            images={gallery}
            productName={copy.name}
            galleryLabel={template.galleryLabel}
            emptyLabel={template.galleryEmpty}
          />
        </div>
        <ProductBuyPanel
          locale={locale}
          dict={baseDict}
          product={product}
          landing={landing}
          priceLine={priceLine}
          pricingNote={catalog?.pricingNote ?? null}
          availability={catalog?.availability ?? null}
        />
      </div>

      <PdpDescription title={template.descriptionTitle} description={landing.description} />
      <PdpTapEffect
        product={product}
        title={template.demoTitle}
        tapEffect={copy.tapEffect}
        outcome={copy.outcome}
      />
      <PdpUseCases
        problem={copy.problem}
        useCasesTitle={template.useCasesTitle}
        useCases={copy.useCases}
      />
      <PdpSteps title={copy.stepsTitle} steps={copy.steps} />
      <PdpAudience title={copy.audienceTitle} items={copy.audience} />
      <PdpBenefits title={copy.benefitsTitle} items={copy.benefits} />
      <PdpIncluded
        title={template.includedTitle}
        customizationTitle={template.customizationTitle}
        customization={copy.customization}
        included={copy.included}
      />
      <PdpExamples locale={locale} dict={baseDict} items={scenarios} />
      <PdpFaq dict={baseDict} slug={slug} items={copy.faq} />
      <PdpRelated locale={locale} dict={baseDict} cards={relatedCards} />

      <div className="py-10 md:py-14">
        <CtaBlock
          title={template.finalTitle}
          subtitle={template.finalSubtitle}
          primary={{ href: orderHref, label: template.orderCta }}
        />
      </div>
    </PageContainer>
  );
}
