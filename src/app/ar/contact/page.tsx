import type { Metadata } from "next";
import { ContactPageView } from "@/features/vitrine/ContactPageView";
import { getDict } from "@/features/vitrine/i18n";
import { pageMetadata } from "@/features/vitrine/seo";

export function generateMetadata(): Metadata {
  const dict = getDict("ar");
  return pageMetadata({
    locale: "ar",
    title: `${dict.contact.title} — Karti`,
    description: dict.contact.subtitle,
    segments: ["contact"],
  });
}

export default function ArContactPage() {
  const dict = getDict("ar");
  return <ContactPageView locale="ar" dict={dict} />;
}
