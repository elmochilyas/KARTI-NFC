import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageMenu } from "./LanguageMenu";
import {
  MOBILE_DRAWER_CLASS,
  MOBILE_DRAWER_STYLE,
  MOBILE_NAV_INITIAL,
  Z_CLASSES,
  mobileNavReducer,
  type MobileNavState,
} from "./mobileNav";
import { PRODUCT_CATEGORIES } from "./ProductCategory";

const toggleOpen = (state: MobileNavState) => mobileNavReducer(state, { type: "toggle-open" });
const toggleAccordion = (state: MobileNavState) =>
  mobileNavReducer(state, { type: "toggle-accordion" });
const close = (state: MobileNavState) => mobileNavReducer(state, { type: "close" });

const openedWithProducts = () => toggleAccordion(toggleOpen(MOBILE_NAV_INITIAL));

describe("mobile menu: Produits accordion lifecycle", () => {
  it("starts closed", () => {
    expect(MOBILE_NAV_INITIAL).toEqual({ open: false, accordionOpen: false });
  });

  it("hamburger opens the drawer with Produits still collapsed", () => {
    expect(toggleOpen(MOBILE_NAV_INITIAL)).toEqual({ open: true, accordionOpen: false });
  });

  it("a first tap on Produits reveals the 5 category rows", () => {
    const state = openedWithProducts();
    expect(state.accordionOpen).toBe(true);
    expect(PRODUCT_CATEGORIES).toHaveLength(5);
  });

  it("a second tap on Produits hides the rows again", () => {
    expect(toggleAccordion(openedWithProducts()).accordionOpen).toBe(false);
  });

  it("close + reopen resets Produits to collapsed", () => {
    const reopened = toggleOpen(close(openedWithProducts()));
    expect(reopened).toEqual({ open: true, accordionOpen: false });
  });

  it("route change (reset) closes the drawer AND collapses Produits", () => {
    expect(mobileNavReducer(openedWithProducts(), { type: "reset" })).toEqual({
      open: false,
      accordionOpen: false,
    });
  });

  it("Escape/backdrop/outside-pointerdown (close) resets Produits too", () => {
    expect(close(openedWithProducts())).toEqual({ open: false, accordionOpen: false });
  });
});

describe("mobile menu: drawer surface is a fixed full-height panel", () => {
  it("uses top + bottom (not a content-driven height) from header to viewport bottom", () => {
    expect(MOBILE_DRAWER_STYLE.top).toBe("calc(3.5rem + env(safe-area-inset-top, 0px))");
    expect(MOBILE_DRAWER_STYLE.bottom).toBe(0);
  });

  it("spans the full viewport width via physical, purge-proof insets", () => {
    expect(MOBILE_DRAWER_STYLE.left).toBe(0);
    expect(MOBILE_DRAWER_STYLE.right).toBe(0);
    expect(MOBILE_DRAWER_STYLE.width).toBe("100%");
    expect(MOBILE_DRAWER_STYLE.maxWidth).toBe("none");
  });

  it("is fixed, full-width, scrollable, and solid", () => {
    for (const token of [
      "fixed",
      "inset-x-0",
      "z-[70]",
      "overflow-y-auto",
      "overscroll-contain",
      "bg-background",
      "lg:hidden",
    ]) {
      expect(MOBILE_DRAWER_CLASS).toContain(token);
    }
  });

  it("carries no width cap, side-sheet width, or translated-panel positioning", () => {
    const tokens = MOBILE_DRAWER_CLASS.split(/\s+/);
    for (const token of tokens) {
      expect(token).not.toMatch(/^(max-w|w-|w\[|translate)/);
    }
  });
});

describe("mobile menu: stacking order (popover must outrank the drawer)", () => {
  const zOf = (token: string) => Number(token.match(/\d+/)?.[0]);

  it("keeps a strictly increasing backdrop < drawer < header < popover scale", () => {
    const order = [
      Z_CLASSES.backdrop,
      Z_CLASSES.drawer,
      Z_CLASSES.header,
      Z_CLASSES.languagePopover,
    ].map(zOf);
    expect(order).toEqual([40, 70, 80, 100]);
  });
});

describe("mobile menu: language trigger is always mounted", () => {
  it("renders the globe trigger regardless of drawer state", () => {
    const html = renderToStaticMarkup(
      createElement(LanguageMenu, {
        locale: "fr",
        label: "Changer de langue",
        hrefFor: (code) => `/${code}`,
      }),
    );
    expect(html).toContain('aria-controls="language-menu"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
  });
});