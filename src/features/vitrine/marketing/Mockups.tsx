/**
 * Photo-ready product visuals (editorial rebuild): same prop API as the
 * Phase 5 CSS mockups, but every visual is an <Image> well with a
 * designed CSS fallback underneath. Drop files into public/vitrine/
 * (hero-tap.jpg, card-macro.jpg, profile-cafe.jpg, business-counter.jpg,
 * qr-scan.jpg) and pass imageSrc — no layout change needed.
 *
 * Sizes: md (in-flow illustrations) and lg (hero/showcase visuals).
 */

import Image from "next/image";
import type { ReactNode } from "react";

type MockupSize = "md" | "lg" | "xl";

/** Physical Karti card mockup (credit-card ratio, chip, contactless mark). */
export function CardMockup({
  label,
  imageSrc,
  imageAlt,
  sublabel,
  size = "md",
}: {
  label: string;
  sublabel?: string;
  size?: MockupSize;
  imageSrc?: string;
  imageAlt?: string;
}) {
  const large = size === "lg";
  return (
    <div
      role="img"
      aria-label={sublabel ? `${label} — ${sublabel}` : label}
      className={`karti-card-sheen relative aspect-[8/5] w-full overflow-hidden rounded-[1.75rem] bg-ink text-background shadow-[var(--shadow-lift)] ring-1 ring-ink/10 ${
        size === "xl" ? "max-w-lg" : large ? "max-w-md" : "max-w-xs"
      }`}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={imageAlt ?? label}
          fill
          sizes="(max-width: 768px) 100vw, 480px"
          className="object-cover"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-accent/30"
      />
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-gold/15 blur-3xl"
      />
      <div
        className={`relative flex h-full flex-col justify-between ${
          size === "xl" ? "p-8" : large ? "p-7" : "p-5"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`flex items-center justify-center rounded-lg bg-accent font-bold text-accent-contrast ${
                size === "xl"
                  ? "h-11 w-11 text-2xl"
                  : large
                    ? "h-10 w-10 text-xl"
                    : "h-7 w-7 text-sm"
              }`}
            >
              K
            </span>
            <span
              aria-hidden="true"
              className={`font-semibold tracking-tight ${size === "xl" ? "text-xl" : large ? "text-lg" : "text-sm"}`}
            >
              Karti
            </span>
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={`text-background/80 ${size === "xl" ? "h-9 w-9" : large ? "h-8 w-8" : "h-6 w-6"}`}
          >
            <path d="M6 9a8 8 0 0 1 0 6" />
            <path d="M9.5 6.5a12 12 0 0 1 0 11" />
            <path d="M13 4a16 16 0 0 1 0 16" />
          </svg>
        </div>
        <div>
          <p
            aria-hidden="true"
            className={`truncate font-bold tracking-tight ${
              size === "xl" ? "text-3xl" : large ? "text-2xl" : "text-lg"
            }`}
          >
            {label}
          </p>
          {sublabel ? (
            <p
              aria-hidden="true"
              className={`mt-1 truncate text-background/70 ${size === "xl" ? "text-base" : large ? "text-sm" : "text-xs"}`}
            >
              {sublabel}
            </p>
          ) : null}
          <div aria-hidden="true" className={`mt-3 flex items-center gap-2`}>
            <span
              className={`rounded border border-background/40 ${size === "xl" ? "h-10 w-14" : large ? "h-9 w-12" : "h-8 w-11"}`}
            />
            <span className="text-background/50 tabular-nums" style={{ fontSize: 10 }}>
              •••• 0420
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Smartphone frame rendering a simplified faithful destination. */
export function PhoneFrame({
  title,
  lines,
  footnote,
  size = "md",
  imageSrc,
  imageAlt,
}: {
  title: string;
  lines: string[];
  footnote?: string;
  size?: MockupSize;
  imageSrc?: string;
  imageAlt?: string;
}) {
  const large = size === "lg";
  return (
    <div
      role="img"
      aria-label={[title, ...lines].join(". ")}
      className={`w-full rounded-[2.5rem] border border-ink/10 bg-surface p-2.5 shadow-[var(--shadow-lift)] ${
        size === "xl" ? "max-w-[340px]" : large ? "max-w-[300px]" : "max-w-[240px]"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-background to-surface-muted/60 ${size === "xl" ? "px-6 py-7" : large ? "px-5 py-6" : "px-4 py-5"}`}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt ?? title}
            fill
            sizes="320px"
            className="object-cover"
          />
        ) : null}
        <p aria-hidden="true" className="relative mx-auto h-1.5 w-20 rounded-full bg-border" />
        <p aria-hidden="true" className="font-display relative mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-lg font-bold text-white">
          {title.trim().charAt(0).toUpperCase() || "K"}
        </p>
        <p
          aria-hidden="true"
          className={`relative mt-3 truncate text-center font-bold text-text ${size === "xl" ? "text-xl" : large ? "text-lg" : "text-sm"}`}
        >
          {title}
        </p>
        <ul aria-hidden="true" className="relative mt-3 flex flex-col gap-2">
          {lines.map((line) => (
            <li
              key={line}
              className={`truncate rounded-xl border border-border/60 bg-surface px-3 text-center text-muted shadow-sm ${
                size === "xl"
                  ? "py-3 text-[15px]"
                  : large
                    ? "py-2.5 text-sm"
                    : "py-1.5 text-xs"
              }`}
            >
              {line}
            </li>
          ))}
        </ul>
        {footnote ? (
          <p
            aria-hidden="true"
            className={`relative mt-3 text-center text-muted ${large ? "text-xs" : "text-[11px]"}`}
          >
            {footnote}
          </p>
        ) : null}
        <p aria-hidden="true" className="relative mx-auto mt-4 h-1 w-24 rounded-full bg-border" />
      </div>
    </div>
  );
}

/** Tap relationship: card → phone, stacked on mobile, side-by-side up. */
export function TapVisual({
  cardLabel,
  cardSub,
  phoneTitle,
  phoneLines,
  phoneNote,
  size = "md",
}: {
  cardLabel: string;
  cardSub?: string;
  phoneTitle: string;
  phoneLines: string[];
  phoneNote?: string;
  size?: MockupSize;
}) {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
      <CardMockup label={cardLabel} sublabel={cardSub} size={size} />
      <span aria-hidden="true" className="flex items-center gap-2 text-accent">
        <span
          className={`font-bold sm:hidden ${size === "xl" ? "text-4xl" : size === "lg" ? "text-3xl" : "text-2xl"}`}
        >
          ↓
        </span>
        <span
          className={`hidden font-bold sm:block ${size === "xl" ? "text-4xl" : size === "lg" ? "text-3xl" : "text-2xl"}`}
        >
          →
        </span>
        <span
          className={`relative flex ${size === "xl" ? "h-5 w-5" : size === "lg" ? "h-4 w-4" : "h-3 w-3"}`}
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-full w-full rounded-full bg-accent" />
        </span>
      </span>
      <PhoneFrame title={phoneTitle} lines={phoneLines} footnote={phoneNote} size={size} />
    </div>
  );
}

export function MockupCaption({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-center text-xs text-muted">{children}</p>;
}

/** Abstract QR fallback mark: deterministic schematic grid, no real code. */
export function QrMock({ label }: { label: string }) {
  const cells = [
    1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1,
    0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1,
    0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1,
  ];
  return (
    <div
      role="img"
      aria-label={label}
      className="grid w-full max-w-[220px] grid-cols-9 gap-1 rounded-2xl border border-border bg-surface p-4 shadow-card"
    >
      {cells.map((filled, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`aspect-square rounded-[3px] ${filled ? "bg-text" : "bg-surface-muted"}`}
        />
      ))}
    </div>
  );
}

/**
 * Abstract conversation destination (e.g. WhatsApp): service icon +
 * generic message bubbles. Deliberately schematic — no proprietary UI.
 */
export function ChatPhone({
  title,
  bubbles,
  footnote,
  icon,
  size = "md",
}: {
  title: string;
  bubbles: string[];
  footnote?: string;
  icon: ReactNode;
  size?: MockupSize;
}) {
  const large = size !== "md";
  return (
    <div
      role="img"
      aria-label={[title, ...bubbles].join(". ")}
      className={`w-full rounded-[2.5rem] border border-border bg-surface p-2.5 shadow-card ${
        size === "xl" ? "max-w-[340px]" : large ? "max-w-[300px]" : "max-w-[240px]"
      }`}
    >
      <div className={`rounded-[2rem] bg-background ${large ? "px-5 py-6" : "px-4 py-5"}`}>
        <p aria-hidden="true" className="mx-auto h-1.5 w-20 rounded-full bg-border" />
        <p aria-hidden="true" className="mt-4 flex items-center gap-2 truncate font-bold text-text">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            {icon}
          </span>
          <span className={`truncate ${large ? "text-lg" : "text-sm"}`}>{title}</span>
        </p>
        <ul aria-hidden="true" className="mt-4 flex flex-col gap-2">
          {bubbles.map((bubble, index) => (
            <li
              key={bubble}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-start ${
                large ? "text-sm" : "text-xs"
              } ${index % 2 === 0 ? "self-start rounded-bl-md bg-surface-muted text-muted" : "self-end rounded-br-md bg-accent/[0.14] text-text"}`}
            >
              {bubble}
            </li>
          ))}
        </ul>
        {footnote ? (
          <p aria-hidden="true" className="mt-4 text-center text-[11px] text-muted">
            {footnote}
          </p>
        ) : null}
        <p aria-hidden="true" className="mx-auto mt-4 h-1 w-24 rounded-full bg-border" />
      </div>
    </div>
  );
}

/**
 * Abstract review destination (e.g. Google reviews): service icon +
 * schematic stars + action bar. No rating promised, no brand UI copied.
 */
export function ReviewPhone({
  title,
  footnote,
  icon,
  size = "md",
}: {
  title: string;
  footnote?: string;
  icon: ReactNode;
  size?: MockupSize;
}) {
  const large = size !== "md";
  return (
    <div
      role="img"
      aria-label={footnote ? `${title}. ${footnote}` : title}
      className={`w-full rounded-[2.5rem] border border-border bg-surface p-2.5 shadow-card ${
        size === "xl" ? "max-w-[340px]" : large ? "max-w-[300px]" : "max-w-[240px]"
      }`}
    >
      <div className={`rounded-[2rem] bg-background ${large ? "px-5 py-6" : "px-4 py-5"}`}>
        <p aria-hidden="true" className="mx-auto h-1.5 w-20 rounded-full bg-border" />
        <p aria-hidden="true" className="mt-4 flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            {icon}
          </span>
          <span className={`truncate font-bold text-text ${large ? "text-lg" : "text-sm"}`}>
            {title}
          </span>
        </p>
        <p aria-hidden="true" className="mt-3 text-xl tracking-[0.2em] text-accent">
          ★★★★★
        </p>
        <div aria-hidden="true" className="mt-3 flex flex-col gap-2">
          <span className="h-2.5 w-3/4 rounded-full bg-surface-muted" />
          <span className="h-9 w-full rounded-xl bg-accent/80" />
        </div>
        {footnote ? (
          <p aria-hidden="true" className="mt-3 text-[11px] text-muted">
            {footnote}
          </p>
        ) : null}
        <p aria-hidden="true" className="mx-auto mt-4 h-1 w-24 rounded-full bg-border" />
      </div>
    </div>
  );
}
