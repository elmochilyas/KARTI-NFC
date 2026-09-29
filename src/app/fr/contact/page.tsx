import type { Metadata } from "next";
import { ContactPageView } from "@/features/vitrine/ContactPageView";
import { getDict } from "@/features/vitrine/i18n";
import { pageMetadata } from "@/features/vitrine/seo";

export function generateMetadata(): Metadata {
  const dict = getDict("fr");
  return pageMetadata({
    locale: "fr",
    title: `${dict.contact.title} — Karti`,
    description: dict.contact.subtitle,
    segments: ["contact"],
  });
}

export default function FrContactPage() {
  const dict = getDict("fr");
  return <ContactPageView locale="fr" dict={dict} />;
}
