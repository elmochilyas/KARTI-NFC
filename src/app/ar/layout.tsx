import type { ReactNode } from "react";
import { VitrineShell } from "@/features/vitrine/VitrineShell";
import { getDict } from "@/features/vitrine/i18n";

export default function ArLayout({ children }: { children: ReactNode }) {
  return (
    <VitrineShell locale="ar" dict={getDict("ar")}>
      {children}
    </VitrineShell>
  );
}
