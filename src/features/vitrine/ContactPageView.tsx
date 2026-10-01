/**
 * Shared contact-page shell (server): task-focused hero, three clearly
 * separated paths (order / quote / message), then the inquiry form.
 * The form creates inquiries only — order logic is untouched.
 */

import Link from "next/link";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { localePath, orderPath } from "./site";
import { ContactForm } from "./ContactForm";
import { Breadcrumbs } from "./marketing/Breadcrumbs";
import { PageContainer } from "./marketing/Section";

export function ContactPageView({ locale, dict }: { locale: VitrineLocale; dict: VitrineDict }) {
  return (
    <PageContainer>
      <Breadcrumbs
        trail={[
          { label: dict.common.home, url: localePath(locale) },
          { label: dict.contact.title, url: localePath(locale, "contact") },
        ]}
      />
      <div className="karti-hero-grid mx-auto max-w-2xl py-6 md:py-8">
        <p className="font-display text-[13px] font-bold tracking-[0.22em] text-accent-strong uppercase">
          {dict.nav.contact} <span aria-hidden="true">—</span>
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-[-0.03em] text-balance text-text sm:text-5xl">
          {dict.contact.title}
        </h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-pretty text-muted">
          {dict.contact.subtitle}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link
            href={orderPath(locale)}
            className="flex flex-col rounded-[1.75rem] border border-ink/10 bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5"
          >
            <span className="font-display text-[15px] font-bold text-text">{dict.common.orderNow}</span>
            <span className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">
              {dict.productPage.orderCta}
            </span>
            <span
              aria-hidden="true"
              className="karti-flip-rtl mt-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm font-bold text-white"
            >
              →
            </span>
          </Link>
          <Link
            href={localePath(locale, "pricing")}
            className="flex flex-col rounded-[1.75rem] border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5"
          >
            <span className="font-display text-[15px] font-bold text-text">{dict.nav.pricing}</span>
            <span className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">
              {dict.home.pricingDesc}
            </span>
            <span
              aria-hidden="true"
              className="karti-flip-rtl mt-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-text"
            >
              →
            </span>
          </Link>
          <a
            href="#contact-form"
            className="flex flex-col rounded-[1.75rem] border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5"
          >
            <span className="font-display text-[15px] font-bold text-text">{dict.contact.title}</span>
            <span className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">
              {dict.contact.message}
            </span>
            <span
              aria-hidden="true"
              className="mt-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-text"
            >
              ↓
            </span>
          </a>
        </div>
        <div
          id="contact-form"
          className="mt-5 scroll-mt-24 rounded-[1.75rem] border border-border bg-surface p-4 shadow-card md:p-6"
        >
          <ContactForm locale={locale} dict={dict} />
        </div>
      </div>
    </PageContainer>
  );
}
