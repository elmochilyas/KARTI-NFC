/**
 * Home product discovery rail — image-led horizontal product cards.
 *
 * Native scroll + CSS scroll-snap (no carousel package, no autoplay, no
 * dots). Card is ONE link (no nested controls). RTL-safe: scroll-snap and
 * `scrollIntoView` follow the writing direction, and the progress thumb
 * uses the logical `inset-inline-start`. Prices come from the real
 * `priceLines` value or the honest `dict.order.pricePending`.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { productSlugFromType } from "./products";
import { localePath } from "./site";
import { CategoryMedia, PRODUCT_CATEGORIES } from "./marketing/ProductCategory";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function ProductRail({
  locale,
  dict,
  publishedFlags = null,
  priceLines = null,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  /** Unpublished products are excluded from marketing listings (null = all listed). */
  publishedFlags?: Record<ProductType, boolean> | null;
  /** Visible fixed catalog price per product (absent = price not configured). */
  priceLines?: Partial<Record<ProductType, string>> | null;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(1);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const m = dict.marketingHome;
  const items = PRODUCT_CATEGORIES.filter(({ product }) => publishedFlags?.[product] !== false);

  const updateScrollState = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const abs = Math.abs(el.scrollLeft);
    setAtStart(abs < 4);
    setAtEnd(max - abs < 4);
    setProgress(max === 0 ? 1 : Math.min(1, abs / max));
    setVisible(Math.min(1, el.clientWidth / Math.max(1, el.scrollWidth)));
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  function onScroll() {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      updateScrollState();
    });
  }

  function stepCard(direction: 1 | -1) {
    const el = railRef.current;
    const cards = cardRefs.current;
    if (!el || cards.length === 0) return;
    const first = cards[0]!;
    const second = cards[1];
    const cardWidth = first.getBoundingClientRect().width;
    const gap =
      second != null
        ? Math.abs(second.getBoundingClientRect().left - first.getBoundingClientRect().left) -
          cardWidth
        : 0;
    const abs = Math.abs(el.scrollLeft);
    const step = cardWidth + gap || 1;
    const current = Math.min(cards.length - 1, Math.max(0, Math.round(abs / step)));
    const target = Math.min(cards.length - 1, Math.max(0, current + direction));
    cards[target]!.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepCard(rtl ? -1 : 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepCard(rtl ? 1 : -1);
    }
  }

  const thumbWidth = Math.max(6, visible * 100);
  const thumbStart = progress * (100 - thumbWidth);

  return (
    <section
      id="products"
      aria-label={m.rail.title}
      className="scroll-mt-20 border-y border-border/70 bg-surface py-11 md:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-display text-[13px] font-bold tracking-[0.22em] text-accent-strong uppercase">
              {dict.nav.products}
            </p>
            <h2 className="font-display mt-2.5 text-[26px] leading-tight font-bold tracking-[-0.02em] text-balance text-text md:text-4xl">
              {m.rail.title}
            </h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted md:text-lg">
              {m.rail.subtitle}
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              aria-label={m.rail.prev}
              disabled={atStart}
              onClick={() => stepCard(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-text transition-colors duration-200 hover:border-text/40 motion-safe:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true" className="karti-flip-rtl text-lg">
                ←
              </span>
            </button>
            <button
              type="button"
              aria-label={m.rail.next}
              disabled={atEnd}
              onClick={() => stepCard(1)}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-text transition-colors duration-200 hover:border-text/40 motion-safe:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true" className="karti-flip-rtl text-lg">
                →
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        role="region"
        tabIndex={0}
        aria-label={m.rail.title}
        className="karti-scrollbar-none mt-6 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-1 scroll-px-4 md:mt-9 md:gap-6 md:px-8 md:scroll-px-8"
      >
        {items.map(({ key, product }, index) => {
          const category = m.categories[key];
          const priceLine = priceLines?.[product] ?? null;
          return (
            <article
              key={key}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="flex w-[82vw] max-w-[340px] shrink-0 snap-start flex-col md:w-[44vw] md:max-w-none lg:w-[30%]"
            >
              <Link
                href={localePath(locale, "products", productSlugFromType(product))}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-background transition-shadow duration-200 hover:shadow-[var(--shadow-lift)] motion-safe:active:scale-[0.99]"
              >
                <CategoryMedia size="card" />
                <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
                  <h3 className="font-display text-lg font-bold tracking-[-0.01em] text-text">
                    {category.title}
                  </h3>
                  <p className="mt-1 text-[13.5px] leading-snug text-muted">{category.usage}</p>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                    <p className="text-[15px] font-bold text-text">
                      {priceLine ? `${m.rail.priceFrom} ${priceLine}` : dict.order.pricePending}
                    </p>
                    <p className="font-display inline-flex items-center gap-1 text-[14px] font-bold text-accent-strong">
                      {m.rail.discover}
                      <span
                        aria-hidden="true"
                        className="karti-flip-rtl transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:rtl:group-hover:-translate-x-0.5"
                      >
                        →
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      <div className="mx-auto mt-5 max-w-6xl px-4 md:px-8">
        <div aria-hidden="true" className="relative h-px bg-border/70">
          <span
            className="absolute top-0 h-px bg-gold"
            style={{ width: `${thumbWidth}%`, insetInlineStart: `${thumbStart}%` }}
          />
        </div>
      </div>
    </section>
  );
}
