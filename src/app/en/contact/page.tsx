import type { Metadata } from "next";
import { ContactPageView } from "@/features/vitrine/ContactPageView";
import { getDict } from "@/features/vitrine/i18n";
import { pageMetadata } from "@/features/vitrine/seo";

export function generateMetadata(): Metadata {
  const dict = getDict("en");
  return pageMetadata({
    locale: "en",
    title: `${dict.contact.title} — Karti`,
    description: dict.contact.subtitle,
    segments: ["contact"],
  });
}

export default function EnContactPage() {
  const dict = getDict("en");
  return <ContactPageView locale="en" dict={dict} />;
}
