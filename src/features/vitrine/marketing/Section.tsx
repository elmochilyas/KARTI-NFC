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

/** Full-bleed tinted band; inner content keeps page container width. */
export function Band({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  return (
    <section id={id} aria-label={label} className="scroll-mt-20 bg-surface-muted/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-8 md:py-20">{children}</div>
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
    <section id={id} aria-label={title} className="scroll-mt-20 py-14 md:py-20">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">{eyebrow}</p>
        ) : null}
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-text md:text-4xl">{title}</h2>
        {subtitle ? <p className="mt-3 text-lg leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      <div className="mt-8">{children}</div>
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
    <section aria-label={title} className="py-10 md:py-14">
      {tagline ? <p className="text-sm font-medium text-accent">{tagline}</p> : null}
      <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight text-text sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-xl leading-relaxed text-muted">{subtitle}</p>
    </section>
  );
}

export function PrimaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-14 items-center justify-center rounded-lg bg-accent px-8 text-lg font-medium text-accent-contrast hover:bg-accent-strong"
    >
      {children}
    </Link>
  );
}

export function SecondaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-14 items-center justify-center rounded-lg border border-border bg-surface px-8 text-lg font-medium text-text hover:border-muted"
    >
      {children}
    </Link>
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
      className="rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-card md:py-16"
    >
      <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-text md:text-4xl">
        {title}
      </h2>
      {subtitle ? <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">{subtitle}</p> : null}
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <PrimaryCta href={primary.href}>{primary.label}</PrimaryCta>
        {secondary ? <SecondaryCta href={secondary.href}>{secondary.label}</SecondaryCta> : null}
      </div>
    </section>
  );
}
