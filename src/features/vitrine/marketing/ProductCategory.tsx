/**
 * The five main customer-facing product categories, shared by the
 * desktop mega-panel, the mobile menu, and the home product rail.
 *
 * Each category maps to one representative product page. Labels are
 * localized via `dict.marketingHome.categories`; category keys stay
 * locale-invariant.
 */

import Image from "next/image";
import type { ProductType } from "@/domain/orders/productTypes";

export const PRODUCT_CATEGORIES = [
  { key: "personal", product: "PERSONAL_CARD" },
  { key: "business", product: "BUSINESS_CARD" },
  { key: "googleReview", product: "GOOGLE_REVIEW_CARD" },
  { key: "career", product: "CAREER_CARD" },
  { key: "customLink", product: "CUSTOM_LINK_CARD" },
] as const;

export type ProductCategoryKey = (typeof PRODUCT_CATEGORIES)[number]["key"];
export type ProductCategoryDef = (typeof PRODUCT_CATEGORIES)[number];

/** Real CMS primary image for one product (Catalog CMS is the source of truth). */
export type ProductImageSlot = { src: string; alt: string | null };

/** Per-product images keyed by product type; absent product = placeholder. */
export type ProductImageMap = Partial<Record<ProductType, ProductImageSlot>>;

/**
 * Product media slot. Renders the real Catalog CMS primary image when one
 * is published, otherwise a reserved warm-neutral 4:3 frame with a subtle
 * contact-card silhouette (no invented image paths, ever).
 *
 * Alt text comes only from the CMS media row: present → accessible name,
 * absent → empty alt (the surrounding link already names the product) and
 * the frame is marked decorative.
 */
export function CategoryMedia({
  size,
  image = null,
}: {
  size: "thumb" | "card";
  /** Real primary image for this category (absent → static placeholder). */
  image?: ProductImageSlot | null;
}) {
  const alt = image?.alt?.trim() || "";
  const decorative = !image || alt === "";

  if (size === "thumb") {
    return (
      <div
        aria-hidden={decorative}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted"
      >
        {image ? (
          <Image
            src={image.src}
            alt={alt}
            fill
            loading="lazy"
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-8 w-6 rotate-[-8deg] flex-col items-start justify-start rounded-[5px] border border-ink/10 bg-background p-1 shadow-[var(--shadow-card)]">
            <span className="h-1.5 w-2.5 rounded-[2px] bg-gold/70" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      aria-hidden={decorative}
      className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-surface-muted to-surface-muted/40"
    >
      {image ? (
        <Image
          src={image.src}
          alt={alt}
          fill
          loading="lazy"
          sizes="(max-width: 767px) 82vw, 40vw"
          className="object-cover"
        />
      ) : (
        <span className="w-[56%] rotate-[-6deg] rounded-lg border border-ink/10 bg-background p-3.5 shadow-[var(--shadow-card)]">
          <span className="block h-2.5 w-4 rounded-[3px] bg-gold/80" />
          <span className="mt-3 block h-1 w-3/4 rounded-full bg-ink/15" />
          <span className="mt-1.5 block h-1 w-1/2 rounded-full bg-ink/10" />
        </span>
      )}
    </div>
  );
}
