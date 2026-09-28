import type { Metadata } from "next";
import { ContactForm } from "@/features/vitrine/ContactForm";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";

export function generateMetadata(): Metadata {
  const dict = getDict("fr");
  return {
    title: `${dict.contact.title} — Karti`,
    description: dict.contact.subtitle,
    alternates: { canonical: `${getAppUrl()}/fr/contact` },
  };
}

export default function FrContactPage() {
  const dict = getDict("fr");
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{dict.contact.title}</h1>
      <p className="mt-1 text-muted">{dict.contact.subtitle}</p>
      <div className="mt-6">
        <ContactForm locale="fr" dict={dict} />
      </div>
    </div>
  );
}
