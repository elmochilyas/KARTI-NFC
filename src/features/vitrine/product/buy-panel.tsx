/**
 * PDP buy panel (server): title, short pitch, price, availability, order
 * CTA. Price + CTA only — quantity lives in the order wizard. No CTA
 * while the price is not configured (honest pending state, same rule as
 * the old price block). Availability badges render only the configured
 * catalog value; nothing is shown when unset.
 */

import { getProductDefinition } from "@/domain/orders/catalog";
import type { ProductType } from "@/domain/orders/productTypes";
import type { CatalogAvailability } from "@/features/catalog/types";
import type { ProductLandingTexts } from "@/features/catalog/copy";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { productSlugFromType } from "../products";
import { orderPath } from "../site";
import { TrackLink } from "../marketing/Trackers";
import {
  BlockedCircleIcon,
  DirectTapMark,
  IdentityTapMark,
  OrderBagIcon,
  PackageIcon,
  PreorderClockIcon,
} from "./icons";

function AvailabilityBadge({
  availability,
  dict,
}: {
  availability: CatalogAvailability;
  dict: VitrineDict;
}) {
  const label =
    availability === "IN_STOCK"
      ? dict.productPage.availabilityInStock
      : availability === "PREORDER"
        ? dict.productPage.availabilityPreorder
        : dict.productPage.availabilityOutOfStock;
  const tone =
    availability === "OUT_OF_STOCK"
      ? "border-danger/50 bg-surface text-danger"
      : availability === "PREORDER"
        ? "border-gold/60 bg-gold/10 text-text"
        : "border-accent/40 bg-accent-soft text-accent-strong";
  const BadgeIcon =
    availability === "OUT_OF_STOCK"
      ? BlockedCircleIcon
      : availability === "PREORDER"
        ? PreorderClockIcon
        : PackageIcon;
  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold ${tone}`}
    >
      <span aria-hidden="true" className="flex">
        <BadgeIcon className="h-4 w-4" />
      </span>
      {label}
    </span>
  );
}

export function ProductBuyPanel({
  locale,
  dict,
  product,
  landing,
  priceLine,
  pricingNote,
  availability,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  product: ProductType;
  landing: ProductLandingTexts;
  /** Visible fixed price line, or null while "Price not configured". */
  priceLine: string | null;
  pricingNote: string | null;
  availability: CatalogAvailability | null;
}) {
  const template = dict.productPage;
  const isProfile = getProductDefinition(product).requiresProfile;
  const note = isProfile ? template.profileNote : template.directNote;
  const orderHref = orderPath(locale, productSlugFromType(product));

  return (
    <div className="flex w-full flex-col items-start">
      <h1 className="font-display max-w-xl text-4xl leading-[1.02] font-bold tracking-[-0.03em] text-balance break-words text-text sm:text-5xl">
        {landing.title}
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted md:text-xl">
        {landing.tagline}
      </p>

      <div className="mt-6 flex w-full flex-col gap-4 rounded-[2rem] border border-ink/10 bg-surface p-5 shadow-[var(--shadow-lift)] ring-1 ring-ink/5 md:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {priceLine ? (
            <p className="font-display text-3xl font-bold tracking-[-0.02em] text-text tabular-nums md:text-4xl">
              {priceLine}
            </p>
          ) : (
            <p className="font-display inline-flex min-h-8 items-center rounded-full border border-gold/60 bg-gold/10 px-3.5 text-xs font-bold tracking-[0.18em] text-text uppercase">
              {dict.order.pricePending}
            </p>
          )}
          {availability ? <AvailabilityBadge availability={availability} dict={dict} /> : null}
        </div>
        {pricingNote && pricingNote.trim() !== "" ? (
          <p className="max-w-xl text-[15px] leading-relaxed text-pretty text-muted">
            {pricingNote}
          </p>
        ) : null}
        {priceLine ? (
          <TrackLink
            href={orderHref}
            event="product_cta_click"
            payload={{ product, locale, placement: "buy-panel" }}
            className="font-display inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink px-9 text-lg font-bold tracking-tight text-white shadow-[0_14px_32px_-12px_rgb(11_27_22/0.5)] transition-all hover:-translate-y-px hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 sm:w-full"
          >
            <span aria-hidden="true" className="flex">
              <OrderBagIcon className="h-5 w-5" />
            </span>
            {dict.common.orderNow}
          </TrackLink>
        ) : null}
        <p className="flex items-start gap-2.5 rounded-2xl bg-surface-muted/60 px-3.5 py-3 text-sm leading-relaxed text-muted">
          <span aria-hidden="true" className="mt-0.5 flex shrink-0 text-accent-strong">
            {isProfile ? (
              <IdentityTapMark className="h-5 w-5" />
            ) : (
              <DirectTapMark className="h-5 w-5" />
            )}
          </span>
          {note}
        </p>
      </div>
    </div>
  );
}
