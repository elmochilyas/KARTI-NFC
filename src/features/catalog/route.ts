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
import { RELATED_PRODUCTS, type RelatedCard } from "@/features/vitrine/product/related";
import {
  PRODUCT_CATEGORIES,
  type ProductImageMap,
  type ProductImageSlot,
} from "@/features/vitrine/marketing/ProductCategory";
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
 *   `noindex, nofollow` and no Product markup is emitted.
 * - Unreachable catalog → static fallback copy with no price (never a
 *   guessed price, never Product markup).
 */

export type ProductRouteData = {
  product: ProductType;
  catalog: PublicCatalogProduct | null;
  published: boolean;
};

/**
 * Marketing image slot for one product: the published PRIMARY image, or
 * the CARD_PREVIEW fallback when no primary is set (both CMS-managed),
 * or null so the caller keeps the neutral placeholder. Never invents
 * image paths.
 */
function marketingImageSlot(catalog: PublicCatalogProduct | null): ProductImageSlot | null {
  if (!catalog) return null;
  if (catalog.primaryImageUrl)
    return { src: catalog.primaryImageUrl, alt: catalog.primaryImageAlt };
  if (catalog.cardPreviewImage) {
    return { src: catalog.cardPreviewImage.url, alt: catalog.cardPreviewImage.alt };
  }
  return null;
}

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

/**
 * Related-product cards for the PDP cross-sell rail: photo, CMS name
 * override, and real configured price per related product. Entries
 * without a published catalog row (unpublished or unreachable) are
 * excluded — never guessed, never a dead card.
 */
export async function getRelatedCards(
  product: ProductType,
  locale: VitrineLocale,
): Promise<RelatedCard[]> {
  const entries = await Promise.all(
    RELATED_PRODUCTS[product].map(async (item): Promise<RelatedCard | null> => {
      const entry = await getCachedCatalogProduct(item, locale);
      if (!entry) return null;
      // Defensive: disk-persisted cache rows from before the gallery field
      // existed (revalidate:false) may lack it — degrade to no photo.
      const galleryImages = entry.galleryImages ?? [];
      const galleryImage =
        galleryImages.find((image) => image.url === entry.primaryImageUrl) ?? galleryImages[0];
      const displayName = entry.displayName?.trim() ?? "";
      return {
        product: item,
        name: displayName !== "" ? displayName : null,
        priceLine: catalogPriceLine(entry),
        imageUrl: entry.primaryImageUrl ?? galleryImage?.url ?? null,
        imageAlt: galleryImage?.alt ?? "",
      };
    }),
  );
  return entries.filter((entry): entry is RelatedCard => entry !== null);
}

/**
 * Homepage data: published flags + one visible fixed price line per
 * published priced product (absent while "Price not configured") + the
 * real Catalog CMS image per product — PRIMARY, falling back to
 * CARD_PREVIEW (absent while neither is set → placeholder). Fail-safe:
 * empty lines/images on catalog errors — the homepage never shows a
 * guessed price or an invented image.
 */
export async function getHomeCatalogData(locale: VitrineLocale): Promise<{
  flags: Record<ProductType, boolean>;
  priceLines: Partial<Record<ProductType, string>>;
  images: ProductImageMap;
}> {
  const { allProducts } = await import("@/features/vitrine/products");
  const flags = await getCachedPublishedFlags();
  const priceLines: Partial<Record<ProductType, string>> = {};
  const images: ProductImageMap = {};
  await Promise.all(
    allProducts().map(async (productType) => {
      if (flags[productType] === false) return;
      const catalog = await getCachedCatalogProduct(productType, locale);
      const line = catalogPriceLine(catalog);
      if (line) priceLines[productType] = line;
      const slot = marketingImageSlot(catalog);
      if (slot) images[productType] = slot;
    }),
  );
  return { flags, priceLines, images };
}

/**
 * Real CMS images for the five categories shown in the desktop mega
 * panel / mobile menu / home rail (PRIMARY, CARD_PREVIEW fallback).
 * Unpublished products are already excluded by `getCachedCatalogProduct`
 * (null); anything without either image stays absent so the caller keeps
 * the placeholder.
 */
export async function getCategoryImages(locale: VitrineLocale): Promise<ProductImageMap> {
  const images: ProductImageMap = {};
  await Promise.all(
    PRODUCT_CATEGORIES.map(async ({ product }) => {
      const catalog = await getCachedCatalogProduct(product, locale);
      const slot = marketingImageSlot(catalog);
      if (slot) images[product] = slot;
    }),
  );
  return images;
}

/**
 * Product JSON-LD payloads. A configured fixed price emits Product +
 * Offer; a product without a configured price emits NO Product markup at
 * all (a priceless Product would trip the Search Console
 * "offers/review/aggregateRating" error). Breadcrumb/FAQ stay valid.
 */
export function productRouteJsonLd(
  route: ProductRouteData,
  dict: VitrineDict,
  productSlug: string,
  locale: VitrineLocale,
): { product: unknown | null; breadcrumb: unknown; faq: unknown } {
  const appUrl = getAppUrl();
  const url = `${appUrl}${localePath(locale, "products", productSlug)}`;
  const copy = resolveProductCopy(dict.products[route.product], route.catalog);
  const offer = route.published ? catalogOfferForJsonLd(route.catalog, url) : null;
  // Gallery-first image set (PDP order), deduped, OG appended when distinct.
  const images: string[] = [];
  const pushImage = (src: string | null | undefined): void => {
    if (typeof src !== "string" || src === "" || images.includes(src)) return;
    images.push(src);
  };
  for (const galleryImage of route.catalog?.galleryImages ?? []) pushImage(galleryImage.url);
  pushImage(route.catalog?.primaryImageUrl);
  if (route.catalog?.ogImageUrl && route.catalog.ogImageUrl !== route.catalog.primaryImageUrl) {
    pushImage(route.catalog?.ogImageUrl);
  }
  return {
    product: offer
      ? productJsonLd({
          name: copy.name,
          description: copy.outcome,
          url,
          image: images,
          brand: "Karti",
          offer: {
            url: offer.url,
            price: offer.price,
            priceCurrency: offer.priceCurrency,
            availability:
              route.catalog?.availability != null
                ? catalogAvailabilityToSchema(route.catalog.availability)
                : undefined,
          },
        })
      : null,
    breadcrumb: breadcrumbJsonLd([
      { label: dict.common.home, url: `${appUrl}/${locale}` },
      { label: dict.common.products, url: `${appUrl}/${locale}#products` },
      { label: copy.name, url },
    ]),
    faq: faqJsonLd(copy.faq),
  };
}
