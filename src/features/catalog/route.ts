import "server-only";
import type { Metadata } from "next";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict, VitrineLocale } from "@/features/vitrine/i18n/dict";
import {
  breadcrumbJsonLd,
  catalogAvailabilityToSchema,
  faqJsonLd,
  productJsonLd,
} from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { productTypeFromSlug } from "@/features/vitrine/products";
import { getAppUrl } from "@/lib/env";
import { getCachedCatalogProduct, getCachedPublishedFlags } from "./cache";
import { catalogOfferForJsonLd, catalogPriceLine, resolveProductCopy } from "./copy";
import type { PublicCatalogProduct } from "./public";

/**
 * Shared loader + metadata/JSON-LD builders for the three locale product
 * routes (`/{fr,en,ar}/products/[productSlug]`). Keeps the locale pages
 * thin and identical.
 *
 * - Published + reachable → CMS copy/price/image/SEO overrides apply.
 * - Unpublished → page still renders (stable URL) but metadata is
 *   `noindex, nofollow` and no Offer markup is emitted.
 * - Unreachable catalog → static fallback in QUOTE mode (never a wrong price).
 */

export type ProductRouteData = {
  product: ProductType;
  catalog: PublicCatalogProduct | null;
  published: boolean;
};

export async function getProductRoute(
  productSlug: string,
  locale: VitrineLocale,
): Promise<ProductRouteData | null> {
  const product = productTypeFromSlug(productSlug);
  if (!product) return null;
  const [catalog, flags] = await Promise.all([
    getCachedCatalogProduct(product, locale),
    getCachedPublishedFlags(),
  ]);
  return { product, catalog, published: flags[product] !== false };
}

export async function productRouteMetadata(
  productSlug: string,
  locale: VitrineLocale,
  dict: VitrineDict,
): Promise<Metadata> {
  const { pageMetadata } = await import("@/features/vitrine/seo");
  const route = await getProductRoute(productSlug, locale);
  if (!route) return { title: "Karti", robots: { index: false, follow: false } };
  const copy = resolveProductCopy(dict.products[route.product], route.catalog);
  const title = route.catalog?.seoTitle?.trim() || `${copy.name} — Karti`;
  const description = route.catalog?.seoDescription?.trim() || copy.outcome;
  if (!route.published) {
    return {
      title,
      description,
      alternates: {
        canonical: `${getAppUrl()}${localePath(locale, "products", productSlug)}`,
      },
      robots: { index: false, follow: false },
    };
  }
  return pageMetadata({
    locale,
    title,
    description,
    segments: ["products", productSlug],
    images: route.catalog?.ogImageUrl ? [route.catalog.ogImageUrl] : undefined,
  });
}

const FROM_PREFIX: Record<VitrineLocale, string> = { fr: "Dès", en: "From", ar: "من" };

/**
 * Homepage data: published flags + one visible price line per published
 * priced product (null for QUOTE/unpublished). Fail-safe: empty lines on
 * catalog errors — the homepage never shows a guessed price.
 */
export async function getHomeCatalogData(locale: VitrineLocale): Promise<{
  flags: Record<ProductType, boolean>;
  priceLines: Partial<Record<ProductType, string>>;
}> {
  const { allProducts } = await import("@/features/vitrine/products");
  const flags = await getCachedPublishedFlags();
  const priceLines: Partial<Record<ProductType, string>> = {};
  await Promise.all(
    allProducts().map(async (productType) => {
      if (flags[productType] === false) return;
      const catalog = await getCachedCatalogProduct(productType, locale);
      const line = catalogPriceLine(catalog, FROM_PREFIX[locale]);
      if (line) priceLines[productType] = line;
    }),
  );
  return { flags, priceLines };
}

export function productRouteJsonLd(
  route: ProductRouteData,
  dict: VitrineDict,
  productSlug: string,
  locale: VitrineLocale,
): { product: unknown; breadcrumb: unknown; faq: unknown } {
  const appUrl = getAppUrl();
  const url = `${appUrl}${localePath(locale, "products", productSlug)}`;
  const copy = resolveProductCopy(dict.products[route.product], route.catalog);
  const offer = route.published ? catalogOfferForJsonLd(route.catalog, url) : null;
  const images = route.catalog?.primaryImageUrl ? [route.catalog.primaryImageUrl] : [];
  if (route.catalog?.ogImageUrl && route.catalog.ogImageUrl !== route.catalog.primaryImageUrl) {
    images.push(route.catalog.ogImageUrl);
  }
  return {
    product: productJsonLd({
      name: copy.name,
      description: copy.outcome,
      url,
      image: images,
      brand: "Karti",
      offer: offer
        ? {
            url: offer.url,
            price: offer.price,
            priceCurrency: offer.priceCurrency,
            availability:
              route.catalog?.availability != null
                ? catalogAvailabilityToSchema(route.catalog.availability)
                : undefined,
          }
        : null,
    }),
    breadcrumb: breadcrumbJsonLd([
      { label: dict.common.home, url: `${appUrl}/${locale}` },
      { label: dict.common.products, url: `${appUrl}/${locale}#products` },
      { label: copy.name, url },
    ]),
    faq: faqJsonLd(copy.faq),
  };
}
