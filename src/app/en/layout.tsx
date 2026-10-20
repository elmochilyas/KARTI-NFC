import type { ReactNode } from "react";
import { getCategoryImages } from "@/features/catalog/route";
import { VitrineShell } from "@/features/vitrine/VitrineShell";
import { getDict } from "@/features/vitrine/i18n";

export default async function EnLayout({ children }: { children: ReactNode }) {
  const productImages = await getCategoryImages("en");
  return (
    <VitrineShell locale="en" dict={getDict("en")} productImages={productImages}>
      {children}
    </VitrineShell>
  );
}
