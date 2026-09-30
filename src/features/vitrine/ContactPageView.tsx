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
      <div className="mx-auto max-w-2xl py-8 md:py-10">
        <h1 className="text-4xl font-bold tracking-tight text-text">{dict.contact.title}</h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">{dict.contact.subtitle}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href={orderPath(locale)}
            className="flex flex-col rounded-2xl border-2 border-accent/50 bg-surface p-5 transition-colors hover:border-accent"
          >
            <span className="text-base font-bold text-text">{dict.common.orderNow}</span>
            <span className="mt-1 flex-1 text-sm text-muted">{dict.productPage.orderCta}</span>
            <span aria-hidden="true" className="mt-3 font-bold text-accent rtl:-scale-x-100">
              →
            </span>
          </Link>
          <Link
            href={localePath(locale, "pricing")}
            className="flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-muted"
          >
            <span className="text-base font-bold text-text">{dict.nav.pricing}</span>
            <span className="mt-1 flex-1 text-sm text-muted">{dict.home.pricingDesc}</span>
            <span aria-hidden="true" className="mt-3 font-bold text-accent rtl:-scale-x-100">
              →
            </span>
          </Link>
          <a
            href="#contact-form"
            className="flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-muted"
          >
            <span className="text-base font-bold text-text">{dict.contact.title}</span>
            <span className="mt-1 flex-1 text-sm text-muted">{dict.contact.message}</span>
            <span aria-hidden="true" className="mt-3 font-bold text-accent">
              ↓
            </span>
          </a>
        </div>
        <div
          id="contact-form"
          className="mt-6 scroll-mt-20 rounded-2xl border border-border bg-surface p-5 md:p-8"
        >
          <ContactForm locale={locale} dict={dict} />
        </div>
      </div>
    </PageContainer>
  );
}
