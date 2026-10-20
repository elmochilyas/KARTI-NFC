import type { ReactNode } from "react";
import { getCategoryImages } from "@/features/catalog/route";
import { VitrineShell } from "@/features/vitrine/VitrineShell";
import { getDict } from "@/features/vitrine/i18n";

export default async function FrLayout({ children }: { children: ReactNode }) {
  const productImages = await getCategoryImages("fr");
  return (
    <VitrineShell locale="fr" dict={getDict("fr")} productImages={productImages}>
      {children}
    </VitrineShell>
  );
}
