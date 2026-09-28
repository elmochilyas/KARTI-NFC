import type { ReactNode } from "react";
import { VitrineShell } from "@/features/vitrine/VitrineShell";
import { getDict } from "@/features/vitrine/i18n";

export default function EnLayout({ children }: { children: ReactNode }) {
  return (
    <VitrineShell locale="en" dict={getDict("en")}>
      {children}
    </VitrineShell>
  );
}
