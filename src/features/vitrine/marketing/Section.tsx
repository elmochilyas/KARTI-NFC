/**
 * Marketing section primitives (Phase 5). One spacing/typography
 * language for the whole public site, on existing repo tokens.
 * Server components only.
 *
 * Visual pass: larger type scale; tinted full-bleed bands via <Band>
 * for chapter rhythm. <Section> itself stays container-agnostic so
 * existing pages keep their layout.
 */

import Link from "next/link";
import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 md:px-8">{children}</div>;
}

/** Full-bleed band; inner content keeps page container width. */
export function Band({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-label={label}
      className="scroll-mt-20 border-y border-border/70 bg-surface"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">{children}</div>
    </section>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="scroll-mt-24 py-10 md:py-14">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="font-display text-[13px] font-bold tracking-[0.22em] text-accent-strong uppercase">
            {eyebrow} <span aria-hidden="true">—</span>
          </p>
        ) : null}
        <h2 className="font-display mt-3 text-3xl font-bold tracking-[-0.02em] text-balance text-text md:text-4xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-pretty text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="mt-6 md:mt-8">{children}</div>
    </section>
  );
}

export function PageHero({
  tagline,
  title,
  subtitle,
}: {
  tagline?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section aria-label={title} className="karti-hero-grid py-10 md:py-14">
      {tagline ? (
        <p className="font-display text-[13px] font-bold tracking-[0.22em] text-accent-strong uppercase">
          {tagline} <span aria-hidden="true">—</span>
        </p>
      ) : null}
      <h1 className="font-display mt-3 max-w-4xl text-4xl font-bold tracking-[-0.03em] text-balance text-text sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-muted md:text-xl">
        {subtitle}
      </p>
    </section>
  );
}

export function PrimaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-display inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-ink px-9 text-lg font-bold text-white shadow-[0_14px_32px_-12px_rgb(11_27_22/0.5)] transition-all hover:-translate-y-px hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0"
    >
      {children}
    </Link>
  );
}

export function SecondaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-display inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-text/20 bg-transparent px-9 text-lg font-bold text-text transition-all hover:-translate-y-px hover:border-text/50 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0"
    >
      {children}
    </Link>
  );
}

/** Unified link-button for marketing cards (replaces duplicated raw Links). */
export function CtaLink({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "secondary" | "link";
  children: ReactNode;
}) {
  if (variant === "link") {
    return (
      <Link
        href={href}
        className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent underline-offset-4 hover:underline"
      >
        <span>{children}</span>
        <span aria-hidden="true" className="karti-flip-rtl">
          →
        </span>
      </Link>
    );
  }
  return variant === "primary" ? (
    <PrimaryCta href={href}>{children}</PrimaryCta>
  ) : (
    <SecondaryCta href={href}>{children}</SecondaryCta>
  );
}

export function CtaBlock({
  title,
  subtitle,
  primary,
  secondary,
}: {
  title: string;
  subtitle?: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section
      aria-label={title}
      data-final-cta
      className="overflow-hidden rounded-[2.5rem] border border-border bg-surface px-6 py-14 text-center md:py-20"
    >
      <p className="font-display text-[13px] font-bold tracking-[0.22em] text-accent-strong uppercase">
        Karti —
      </p>
      <h2 className="font-display mx-auto mt-4 max-w-2xl text-4xl font-bold tracking-[-0.02em] text-balance text-text md:text-5xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted md:text-xl">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <PrimaryCta href={primary.href}>{primary.label}</PrimaryCta>
        {secondary ? <SecondaryCta href={secondary.href}>{secondary.label}</SecondaryCta> : null}
      </div>
    </section>
  );
}

/** Small stat row for trust strips (value + label, no fake precision). */
export function StatRow({ items }: { items: Array<{ value: string; label: string }> }) {
  return (
    <dl className="grid gap-6 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border bg-surface px-5 py-4 text-center shadow-card"
        >
          <dt className="order-2 mt-1 text-sm text-muted">{item.label}</dt>
          <dd className="order-1 text-2xl font-bold tracking-tight text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
