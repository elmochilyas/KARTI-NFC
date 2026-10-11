/**
 * Compact globe language control (public header, mobile + desktop).
 *
 * A single globe button opens a small popover with the three locales shown
 * as flags only (no visible text). Flags are inline SVG (local, no network
 * request, no dependency) so nothing external is fetched and RTL mirrors
 * naturally. Current locale is marked subtly (ring + tint + `aria-current`).
 *
 * Accessibility: real `<button>` trigger with localized `aria-label`,
 * `aria-haspopup`, `aria-expanded`, `aria-controls`; each flag is an `<a>`
 * whose accessible name is the language's own endonym; Escape returns focus
 * to the trigger, and an outside pointerdown closes the popover.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { VITRINE_LOCALES, type VitrineLocale } from "../i18n/dict";
import { Z_CLASSES } from "./mobileNav";

/** Endonyms — the accessible name of each choice (never shown as text). */
const LANGUAGE_NAMES: Record<VitrineLocale, string> = {
  fr: "Français",
  ar: "العربية",
  en: "English",
};

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
    </svg>
  );
}

function FlagArt({ code }: { code: VitrineLocale }) {
  if (code === "fr") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full">
        <rect width="24" height="24" fill="#f2f2f2" />
        <rect width="8" height="24" fill="#0055a4" />
        <rect x="16" width="8" height="24" fill="#ef4135" />
      </svg>
    );
  }
  if (code === "ar") {
    // Morocco: red field, green interlaced pentagram.
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full">
        <rect width="24" height="24" fill="#c1272d" />
        <path
          d="M12 5 L16.11 17.66 L5.34 9.84 L18.66 9.84 L7.89 17.66 Z"
          fill="none"
          stroke="#006233"
          strokeWidth="1.2"
          strokeLinejoin="miter"
        />
      </svg>
    );
  }
  // United Kingdom: simplified Union Jack.
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full">
      <rect width="24" height="24" fill="#012169" />
      <path d="M0 0 L24 24 M24 0 L0 24" stroke="#ffffff" strokeWidth="4" />
      <path d="M0 0 L24 24 M24 0 L0 24" stroke="#c8102e" strokeWidth="1.7" />
      <path d="M12 0 V24 M0 12 H24" stroke="#ffffff" strokeWidth="7" />
      <path d="M12 0 V24 M0 12 H24" stroke="#c8102e" strokeWidth="4" />
    </svg>
  );
}

function Flag({ code }: { code: VitrineLocale }) {
  return (
    <span className="block h-5 w-5 overflow-hidden rounded-[4px] ring-1 ring-black/10">
      <FlagArt code={code} />
    </span>
  );
}

export function LanguageMenu({
  locale,
  label,
  hrefFor,
}: {
  locale: VitrineLocale;
  /** Localized accessible label for the trigger (e.g. "Change language"). */
  label: string;
  /** Maps a locale to the current page in that locale (path preserved). */
  hrefFor: (code: VitrineLocale) => string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeydown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointerdown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("pointerdown", onPointerdown);
    return () => {
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("pointerdown", onPointerdown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="language-menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong motion-safe:active:scale-95"
      >
        <GlobeIcon />
      </button>
      {open ? (
        <div
          id="language-menu"
          role="menu"
          aria-label={label}
          className={`karti-panel-in absolute end-0 top-[calc(100%+0.5rem)] ${Z_CLASSES.languagePopover} flex items-center gap-1 rounded-lg border border-border bg-background p-1.5 shadow-[var(--shadow-lift)]`}
        >
          {VITRINE_LOCALES.map((code) => {
            const active = code === locale;
            return (
              <a
                key={code}
                role="menuitem"
                href={hrefFor(code)}
                hrefLang={code}
                lang={code}
                aria-label={LANGUAGE_NAMES[code]}
                aria-current={active ? "true" : undefined}
                onClick={() => setOpen(false)}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong ${
                  active ? "bg-surface-muted ring-1 ring-accent-strong/40" : "hover:bg-surface-muted"
                }`}
              >
                <Flag code={code} />
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
