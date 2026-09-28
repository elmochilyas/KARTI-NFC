import type { ReactNode } from "react";
import { VitrineShell } from "@/features/vitrine/VitrineShell";
import { getDict } from "@/features/vitrine/i18n";

export default function FrLayout({ children }: { children: ReactNode }) {
  return (
    <VitrineShell locale="fr" dict={getDict("fr")}>
      {children}
    </VitrineShell>
  );
}
