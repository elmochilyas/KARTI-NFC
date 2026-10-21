import type { ReactNode } from "react";
import { getCategoryImages } from "@/features/catalog/route";
import { VitrineShell } from "@/features/vitrine/VitrineShell";
import { getDict } from "@/features/vitrine/i18n";

export default async function ArLayout({ children }: { children: ReactNode }) {
  const productImages = await getCategoryImages("ar");
  return (
    <VitrineShell locale="ar" dict={getDict("ar")} productImages={productImages}>
      {children}
    </VitrineShell>
  );
}
