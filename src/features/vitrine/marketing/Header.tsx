/**
 * Marketing header — one clean composition per breakpoint.
 *
 * <1024px:  [ Karti ]              [ Commander ] [ Menu ]
 * >=1024px: [ Karti ]  Produits Comment… Exemples FAQ   FR/AR/EN  [ Commander ]
 *
 * Root-cause notes from the real-device bug:
 *  - The desktop CTA and mobile CTA are SEPARATE nodes but the previous
 *    desktop node reused a class list containing BOTH `inline-flex` and
 *    `hidden`. Tailwind emits `.inline-flex` AFTER `.hidden`, so the
 *    unprefixed `inline-flex` won and the desktop CTA never hid on
 *    mobile -> two "Commander" buttons + the extra width pushed the
 *    hamburger off-screen (page-level horizontal scroll). Fix: the shared
 *    CTA class carries NO display utility; each CTA sets exactly one
 *    (`hidden … lg:inline-flex` vs `inline-flex … lg:hidden`).
 *  - Brand may shrink (`min-w-0`); the right cluster is `shrink-0`; the
 *    hamburger is a fixed 44px `shrink-0` target, so the header can never
 *    exceed 100vw.
 */
"use client";

import { type CSSProperties, useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { productSlugFromType } from "../products";
import { localePath, orderPath } from "../site";
import { LanguageMenu } from "./LanguageMenu";
import { CategoryMedia, PRODUCT_CATEGORIES, type ProductCategoryKey } from "./ProductCategory";
import {
  MOBILE_DRAWER_CLASS,
  MOBILE_DRAWER_STYLE,
  MOBILE_NAV_INITIAL,
  Z_CLASSES,
  mobileNavReducer,
} from "./mobileNav";

const HAMBURGER_CLASS =
  "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-200 hover:bg-surface-muted motion-safe:active:scale-95 lg:hidden";

const NAV_LINK_CLASS =
  "relative inline-flex h-11 items-center px-3 text-[15px] font-medium text-muted transition-colors duration-200 hover:text-text after:pointer-events-none after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-accent-strong after:opacity-0 after:transition-opacity after:duration-200 hover:after:opacity-100";

const NAV_ACTIVE_CLASS = "text-text after:opacity-100";

// No display utility here on purpose (see root-cause note above).
const CTA_CLASS =
  "font-display items-center rounded-full bg-accent-strong text-background transition-colors duration-200 hover:bg-ink";

function HamburgerLines({ open }: { open: boolean }) {
  const line: CSSProperties = {
    position: "absolute",
    left: 0,
    top: "50%",
    height: 2,
    width: "100%",
    background: "currentColor",
    transition: "transform 200ms ease, opacity 200ms ease",
  };
  return (
    <span aria-hidden="true" className="relative block h-3.5 w-5">
      <span
        style={{
          ...line,
          transform: open ? "translateY(-50%) rotate(45deg)" : "translateY(calc(-50% - 5px))",
        }}
      />
      <span style={{ ...line, opacity: open ? 0 : 1 }} />
      <span
        style={{
          ...line,
          transform: open ? "translateY(-50%) rotate(-45deg)" : "translateY(calc(-50% + 5px))",
        }}
      />
    </span>
  );
}

function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function SiteHeader({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  const [menu, dispatchMenu] = useReducer(mobileNavReducer, MOBILE_NAV_INITIAL);
  const [productsOpen, setProductsOpen] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const productsButtonRef = useRef<HTMLButtonElement>(null);
  const megaPanelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const pathname = usePathname();

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    dispatchMenu({ type: "reset" });
    setProductsOpen(false);
  }

  const suffix = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const languageHref = (code: VitrineLocale) =>
    `${localePath(code)}${suffix === "/" ? "" : suffix}`;
  const pageSlug = (suffix.replace(/^\//, "").split("/")[0] || "").toLowerCase();

  const isActive = (slug: string) => pageSlug === slug;
  const productsActive = pageSlug.startsWith("products");

  function clearHoverTimer() {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  function enterProducts() {
    clearHoverTimer();
    setProductsOpen(true);
  }

  function leaveProducts() {
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => setProductsOpen(false), 140);
  }

  function openProductsFromKeyboard() {
    setProductsOpen(true);
    requestAnimationFrame(() => {
      megaPanelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    });
  }

  useEffect(() => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (menu.open) {
        dispatchMenu({ type: "close" });
        menuButtonRef.current?.focus();
      } else if (productsOpen) {
        setProductsOpen(false);
        productsButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu.open, productsOpen]);

  useEffect(() => {
    if (!menu.open && !productsOpen) return;
    function onPointer(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        dispatchMenu({ type: "close" });
        setProductsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [menu.open, productsOpen]);

  useEffect(() => {
    if (!productsOpen) return;
    function onFocusIn(event: FocusEvent) {
      const target = event.target as Node;
      if (megaPanelRef.current?.contains(target)) return;
      if (productsButtonRef.current?.contains(target)) return;
      setProductsOpen(false);
    }
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [productsOpen]);

  useEffect(() => {
    if (!menu.open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menu.open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) {
        dispatchMenu({ type: "close" });
      } else {
        setProductsOpen(false);
      }
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function trapTab(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab" || !menu.open) return;
    const items = focusableWithin(menuRef.current);
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const categoriesFor = (key: ProductCategoryKey) => {
    const category = dict.marketingHome.categories[key];
    const product = PRODUCT_CATEGORIES.find((item) => item.key === key)!.product;
    return {
      title: category.title,
      usage: category.usage,
      href: localePath(locale, "products", productSlugFromType(product)),
    };
  };

  return (
    <div ref={headerRef}>
      <header
        className={`sticky top-0 ${Z_CLASSES.header} w-full border-b border-border/70 bg-background/90 text-text backdrop-blur supports-[backdrop-filter]:bg-background/75`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto box-border flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-3 md:gap-3 md:px-8 lg:h-16">
          <Link
            href={localePath(locale)}
            aria-label="Karti"
            className="font-display flex min-w-0 items-center gap-2.5 text-lg font-bold tracking-[-0.02em] text-text"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-base font-bold text-background"
            >
              K
            </span>
            <span className="hidden max-w-[7rem] truncate min-[360px]:inline-block">Karti</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            <div className="relative" onMouseEnter={enterProducts} onMouseLeave={leaveProducts}>
              <button
                ref={productsButtonRef}
                type="button"
                aria-expanded={productsOpen}
                aria-controls="mega-panel"
                onClick={() => {
                  clearHoverTimer();
                  setProductsOpen((value) => !value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    openProductsFromKeyboard();
                  }
                }}
                className={`${NAV_LINK_CLASS} ${productsActive ? NAV_ACTIVE_CLASS : ""}`}
              >
                {dict.nav.products}
                <span
                  aria-hidden="true"
                  className="ms-1 text-[10px] transition-transform duration-200 motion-safe:transition-transform"
                  style={{ transform: productsOpen ? "rotate(180deg)" : undefined }}
                >
                  ▾
                </span>
              </button>
            </div>
            <Link
              href={localePath(locale, "how-it-works")}
              className={`${NAV_LINK_CLASS} ${isActive("how-it-works") ? NAV_ACTIVE_CLASS : ""}`}
            >
              {dict.nav.howItWorks}
            </Link>
            <Link
              href={localePath(locale, "examples")}
              className={`${NAV_LINK_CLASS} ${isActive("examples") ? NAV_ACTIVE_CLASS : ""}`}
            >
              {dict.nav.examples}
            </Link>
            <Link
              href={localePath(locale, "faq")}
              className={`${NAV_LINK_CLASS} ${isActive("faq") ? NAV_ACTIVE_CLASS : ""}`}
            >
              {dict.nav.faq}
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <Link
              href={orderPath(locale)}
              className={`${CTA_CLASS} hidden h-10 px-5 text-[15px] font-bold lg:inline-flex`}
            >
              {dict.nav.orderCta}
            </Link>
            <Link
              href={orderPath(locale)}
              className={`${CTA_CLASS} inline-flex h-9 whitespace-nowrap px-3.5 text-[13px] font-bold lg:hidden`}
            >
              {dict.nav.orderCtaShort}
            </Link>
            <LanguageMenu locale={locale} label={dict.nav.changeLanguage} hrefFor={languageHref} />
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={menu.open}
              aria-controls="mobile-menu"
              aria-label={menu.open ? dict.nav.closeMenu : dict.nav.menu}
              onClick={() => dispatchMenu({ type: "toggle-open" })}
              className={`${HAMBURGER_CLASS} karti-anim`}
            >
              <HamburgerLines open={menu.open} />
            </button>
          </div>
        </div>

        {productsOpen ? (
          <div
            id="mega-panel"
            ref={megaPanelRef}
            role="region"
            aria-label={dict.nav.products}
            className="karti-panel-in absolute inset-x-0 top-full border-b border-border bg-background text-text shadow-[var(--shadow-lift)]"
          >
            <div className="mx-auto max-w-6xl px-4 py-7 md:px-8">
              <ul className="grid gap-x-5 gap-y-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {PRODUCT_CATEGORIES.map(({ key }) => {
                  const item = categoriesFor(key);
                  return (
                    <li key={key}>
                      <Link
                        href={item.href}
                        onClick={() => setProductsOpen(false)}
                        className="group flex flex-col gap-3"
                      >
                        <CategoryMedia size="card" />
                        <span>
                          <span className="font-display flex items-center gap-1.5 text-[15px] font-bold text-text">
                            {item.title}
                            <span
                              aria-hidden="true"
                              className="karti-flip-rtl text-accent-strong transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                            >
                              →
                            </span>
                          </span>
                          <span className="mt-1 block text-[13px] leading-snug text-muted">
                            {item.usage}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </header>

      {menu.open ? (
        <>
          <div
            aria-hidden="true"
            onClick={() => dispatchMenu({ type: "close" })}
            className={`karti-fade-in fixed inset-0 ${Z_CLASSES.backdrop} bg-ink/40`}
          />
          <nav
            id="mobile-menu"
            ref={menuRef}
            aria-label="Primary"
            onKeyDown={trapTab}
            className={MOBILE_DRAWER_CLASS}
            style={MOBILE_DRAWER_STYLE}
          >
            <div className="mx-auto max-w-6xl px-4 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              <div className="border-b border-border/70">
                <button
                  type="button"
                  aria-expanded={menu.accordionOpen}
                  aria-controls="mobile-products"
                  onClick={() => dispatchMenu({ type: "toggle-accordion" })}
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 py-2 text-start"
                >
                  <span className="font-display text-[18px] font-semibold text-text">
                    {dict.nav.products}
                  </span>
                  <span
                    aria-hidden="true"
                    className="-m-2 p-2 text-[20px] leading-none text-text transition-transform duration-200 motion-safe:transition-transform"
                    style={{ transform: menu.accordionOpen ? "rotate(180deg)" : undefined }}
                  >
                    ▾
                  </span>
                </button>
                <div
                  id="mobile-products"
                  className={`grid transition-[grid-template-rows] duration-200 motion-safe:transition-[grid-template-rows] ${
                    menu.accordionOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <ul className="divide-y divide-border/70 pb-1">
                      {PRODUCT_CATEGORIES.map(({ key }, index) => {
                        const item = categoriesFor(key);
                        return (
                          <li key={key}>
                            <Link
                              href={item.href}
                              onClick={() => dispatchMenu({ type: "close" })}
                              className="group flex min-h-[68px] items-center gap-3 py-2.5"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="flex items-baseline gap-2">
                                  <span className="text-[13px] font-bold text-accent-strong tabular-nums">
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <span className="font-display truncate text-[15px] font-semibold text-text">
                                    {item.title}
                                  </span>
                                </span>
                                <span className="mt-0.5 block truncate text-[13px] text-muted">
                                  {item.usage}
                                </span>
                              </span>
                              <span
                                aria-hidden="true"
                                className="karti-flip-rtl shrink-0 text-muted transition-colors group-hover:text-text"
                              >
                                →
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>

              <ul className="divide-y divide-border/70">
                {[
                  { href: localePath(locale, "how-it-works"), label: dict.nav.howItWorks },
                  { href: localePath(locale, "examples"), label: dict.nav.examples },
                  { href: localePath(locale, "faq"), label: dict.nav.faq },
                  { href: localePath(locale, "contact"), label: dict.nav.contact },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => dispatchMenu({ type: "close" })}
                      className="group flex min-h-[52px] items-center justify-between gap-3 py-2 text-[18px] font-semibold text-text"
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className="karti-flip-rtl shrink-0 text-muted transition-colors group-hover:text-text"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
