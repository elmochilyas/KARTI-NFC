/**
 * PDP photo gallery (client island): dashboard CMS photos only.
 *
 * Images come from `catalog_product_media` (PRIMARY first, then GALLERY in
 * operator order) via the public catalog projection — unlimited up to the
 * 30-row schema bound, thumbnail strip scrolls. No mockups, no invented
 * photos: the empty state is an honest placeholder until the operator
 * uploads images in /dashboard/catalog.
 */
"use client";

import Image from "next/image";
import { useState } from "react";
import type { PublicCatalogGalleryImage } from "@/features/catalog/public";
import { ImagePlusMark } from "./icons";

export function ProductGallery({
  images,
  productName,
  galleryLabel,
  emptyLabel,
}: {
  images: PublicCatalogGalleryImage[];
  productName: string;
  galleryLabel: string;
  emptyLabel: string;
}) {
  const [selected, setSelected] = useState(0);
  const current = images.length > 0 ? images[Math.min(selected, images.length - 1)] : null;

  if (!current) {
    return (
      <div
        aria-label={`${productName} — ${emptyLabel}`}
        className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-[2rem] border border-border bg-surface-muted/60 p-6 text-center ring-1 ring-ink/5"
      >
        <span
          aria-hidden="true"
          className="flex h-20 w-20 items-center justify-center rounded-3xl border border-ink/10 bg-surface text-muted shadow-card"
        >
          <ImagePlusMark className="h-10 w-10" />
        </span>
        <p className="max-w-xs text-sm leading-relaxed font-medium text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] border border-ink/10 bg-surface-muted shadow-[var(--shadow-lift)] ring-1 ring-ink/5">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt.trim() !== "" ? current.alt : productName}
          fill
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-cover"
          priority={selected === 0}
        />
        {images.length > 1 ? (
          <p
            aria-hidden="true"
            className="absolute end-3 bottom-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur"
          >
            {Math.min(selected, images.length - 1) + 1}/{images.length}
          </p>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div
          aria-label={galleryLabel}
          className="karti-scrollbar-none -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pt-1 pb-1"
        >
          {images.map((image, index) => {
            const active = index === Math.min(selected, images.length - 1);
            return (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`${productName} — ${galleryLabel} ${index + 1}/${images.length}`}
                aria-current={active ? "true" : undefined}
                className={`relative h-16 w-20 shrink-0 snap-start overflow-hidden rounded-2xl border bg-surface-muted transition-all focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  active
                    ? "border-accent ring-2 ring-accent/60"
                    : "border-border opacity-80 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                  loading="lazy"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
