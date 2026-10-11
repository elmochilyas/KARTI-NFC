/**
 * State machine + surface metadata for the mobile menu (Header.tsx).
 *
 * Invariant: the drawer always REOPENS with Produits COLLAPSED. Produits is
 * never open by default and never auto-opened; every close path (hamburger,
 * backdrop, Escape, outside pointerdown, route change, breakpoint) resets it.
 */
import type { CSSProperties } from "react";

export type MobileNavState = {
  /** The mobile drawer is open. */
  open: boolean;
  /** The in-drawer "Produits" accordion is expanded. */
  accordionOpen: boolean;
};

export type MobileNavAction =
  { type: "toggle-open" } | { type: "toggle-accordion" } | { type: "close" } | { type: "reset" };

export const MOBILE_NAV_INITIAL: MobileNavState = { open: false, accordionOpen: false };

export function mobileNavReducer(state: MobileNavState, action: MobileNavAction): MobileNavState {
  switch (action.type) {
    case "toggle-open":
      // Opening always starts collapsed; toggling closed always resets.
      return state.open
        ? { open: false, accordionOpen: false }
        : { open: true, accordionOpen: false };
    case "toggle-accordion":
      return { ...state, accordionOpen: !state.accordionOpen };
    case "close":
    case "reset":
      return { open: false, accordionOpen: false };
  }
}

/**
 * Drawer surface pinned from the header bottom to the viewport bottom via
 * explicit `top + bottom` (no content-driven height, no `max-height`), so it
 * ALWAYS covers the page below the header even when Produits is collapsed.
 *
 * Width contract is PHYSICAL and inline (`left/right/width/max-width`): the
 * class utility must not be the sole source of full width — a logical
 * `inset-inline` unit can be silently ignored on some mobile WebView
 * engines, leaving a shrink-to-fit `fixed` panel (page strip visible on
 * the right). `left/right: 0`, `width: 100%` and `max-width: none` are
 * direction-agnostic, survive any purge, and cannot be capped by a parent.
 */
export const MOBILE_DRAWER_CLASS =
  "karti-panel-in fixed inset-x-0 z-[70] overflow-y-auto overscroll-contain border-b border-border bg-background text-text shadow-[var(--shadow-lift)] lg:hidden";

export const MOBILE_DRAWER_STYLE: CSSProperties = {
  top: "calc(3.5rem + env(safe-area-inset-top, 0px))",
  bottom: 0,
  left: 0,
  right: 0,
  width: "100%",
  maxWidth: "none",
};

/**
 * Shared z-index scale. Order must stay: page < backdrop < drawer < sticky
 * header < language popover. The language popover lives INSIDE the sticky
 * header (itself a stacking context), so the header must sit above the
 * drawer for the popover to paint above it. Keeping the literals together
 * here keeps the ordering testable.
 */
export const Z_CLASSES = {
  backdrop: "z-40",
  drawer: "z-[70]",
  header: "z-[80]",
  languagePopover: "z-[100]",
} as const;
