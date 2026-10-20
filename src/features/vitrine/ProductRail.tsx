/**
 * Home product discovery rail — image-led horizontal product cards.
 *
 * Native scroll + CSS scroll-snap (no carousel package, no autoplay, no
 * dots). Card is ONE link (no nested controls). Navigation always moves via
 * an explicit `scrollBy` step (never `scrollIntoView({ inline: "nearest" })`,
 * which was a no-op on already-visible cards and made the laptop arrows feel
 * dead). Mouse/pen users get pointer drag; touch users keep native swipe.
 * Header prev/next are always rendered and floating side buttons overlay the
 * rail edges, so both laptop and mobile can step without guessing the swipe.
 * RTL-safe: deltas flip with the computed `direction` and the progress thumb
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
import {
  CategoryMedia,
  PRODUCT_CATEGORIES,
  type ProductImageMap,
} from "./marketing/ProductCategory";
import {
  railEdgeState,
  railScrollDelta,
  railStepFromWidths,
  type RailStepDirection,
} from "./railNav";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const RAIL_TRACK_ID = "home-product-rail";

const HEADER_BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-text transition-colors duration-200 hover:border-text/40 motion-safe:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

const SIDE_BUTTON_BASE =
  "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-text shadow-lg backdrop-blur transition-all duration-200 hover:border-text/40 motion-safe:active:scale-95 disabled:pointer-events-none disabled:opacity-0";

export function ProductRail({
  locale,
  dict,
  publishedFlags = null,
  priceLines = null,
  productImages = null,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  /** Unpublished products are excluded from marketing listings (null = all listed). */
  publishedFlags?: Record<ProductType, boolean> | null;
  /** Visible fixed catalog price per product (absent = price not configured). */
  priceLines?: Partial<Record<ProductType, string>> | null;
  /** Real Catalog CMS primary images per product (absent = placeholder). */
  productImages?: ProductImageMap | null;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startScrollLeft: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(1);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const m = dict.marketingHome;
  // RTL comes from the localized dict (`dir`), never `getComputedStyle`:
  // style queries force a style recalc + layout on every drag/scroll step
  // (Lighthouse `forced-reflow`). The shell already sets `dir` on the
  // wrapper, so the dict value always matches the rendered direction.
  const isRtl = dict.dir === "rtl";
  const items = PRODUCT_CATEGORIES.filter(({ product }) => publishedFlags?.[product] !== false);

  const updateScrollState = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const state = railEdgeState(el.scrollLeft, el.scrollWidth, el.clientWidth);
    setAtStart(state.atStart);
    setAtEnd(state.atEnd);
    setProgress(state.progress);
    setVisible(state.visible);
  }, []);

  useEffect(() => {
    // Defer the first measurement past hydration (rAF): scroll metrics
    // force layout, so reading them synchronously during mount lands in
    // the TBT critical path. Resize/scroll updates stay as-is.
    const raf = requestAnimationFrame(() => updateScrollState());
    window.addEventListener("resize", updateScrollState);
    const el = railRef.current;
    const observer =
      typeof ResizeObserver !== "undefined" && el
        ? new ResizeObserver(() => updateScrollState())
        : null;
    if (el && observer) observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateScrollState);
      observer?.disconnect();
    };
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

  function stepCard(direction: RailStepDirection) {
    const el = railRef.current;
    if (!el) return;
    const cards = cardRefs.current.filter((card): card is HTMLElement => card !== null);
    const rtl = isRtl;
    let step: number;
    if (cards.length > 0) {
      const first = cards[0];
      const second = cards[1];
      const cardWidth = first.getBoundingClientRect().width;
      const gap =
        second != null
          ? Math.abs(second.getBoundingClientRect().left - first.getBoundingClientRect().left) -
            cardWidth
          : 0;
      step = railStepFromWidths(cardWidth, gap, el.clientWidth);
    } else {
      step = railStepFromWidths(0, 0, el.clientWidth);
    }
    el.scrollBy({
      left: railScrollDelta(direction, step, rtl),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const rtl = isRtl;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepCard(rtl ? -1 : 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepCard(rtl ? 1 : -1);
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const el = railRef.current;
    if (!el) return;
    dragRef.current = { startX: event.clientX, startScrollLeft: el.scrollLeft, moved: false };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = railRef.current;
    if (!drag || !el || event.pointerType === "touch") return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      setDragging(true);
    }
    if (drag.moved) {
      el.scrollLeft = drag.startScrollLeft - dx * (isRtl ? -1 : 1);
    }
  }

  function endPointerDrag() {
    const moved = dragRef.current?.moved ?? false;
    dragRef.current = null;
    setDragging(false);
    if (moved) suppressClickRef.current = true;
  }

  function onClickCapture(event: React.SyntheticEvent) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
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
              aria-controls={RAIL_TRACK_ID}
              disabled={atStart}
              onClick={() => stepCard(-1)}
              className={HEADER_BUTTON_CLASS}
            >
              <span aria-hidden="true" className="karti-flip-rtl text-lg">
                ←
              </span>
            </button>
            <button
              type="button"
              aria-label={m.rail.next}
              aria-controls={RAIL_TRACK_ID}
              disabled={atEnd}
              onClick={() => stepCard(1)}
              className={HEADER_BUTTON_CLASS}
            >
              <span aria-hidden="true" className="karti-flip-rtl text-lg">
                →
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={railRef}
          id={RAIL_TRACK_ID}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
          onPointerLeave={endPointerDrag}
          onClickCapture={onClickCapture}
          role="region"
          tabIndex={0}
          aria-label={m.rail.title}
          className={`karti-scrollbar-none mt-6 flex snap-x snap-proximity gap-3.5 overflow-x-auto px-4 pb-1 scroll-px-4 md:mt-9 md:gap-6 md:px-8 md:scroll-px-8 ${dragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
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
                  draggable={false}
                  prefetch={false}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-background transition-shadow duration-200 hover:shadow-[var(--shadow-lift)] motion-safe:active:scale-[0.99]"
                >
                  <CategoryMedia size="card" image={productImages?.[product] ?? null} />
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

        <button
          type="button"
          aria-label={m.rail.prev}
          aria-controls={RAIL_TRACK_ID}
          disabled={atStart}
          onClick={() => stepCard(-1)}
          className={`${SIDE_BUTTON_BASE} start-2 sm:start-3`}
        >
          <span aria-hidden="true" className="karti-flip-rtl text-lg">
            ←
          </span>
        </button>
        <button
          type="button"
          aria-label={m.rail.next}
          aria-controls={RAIL_TRACK_ID}
          disabled={atEnd}
          onClick={() => stepCard(1)}
          className={`${SIDE_BUTTON_BASE} end-2 sm:end-3`}
        >
          <span aria-hidden="true" className="karti-flip-rtl text-lg">
            →
          </span>
        </button>
      </div>

      <div className="mx-auto mt-5 max-w-6xl px-4 md:px-8">
        <div aria-hidden="true" className="relative h-0.5 rounded-full bg-border/70">
          <span
            className="absolute top-0 h-0.5 rounded-full bg-gold"
            style={{ width: `${thumbWidth}%`, insetInlineStart: `${thumbStart}%` }}
          />
        </div>
      </div>
    </section>
  );
}
