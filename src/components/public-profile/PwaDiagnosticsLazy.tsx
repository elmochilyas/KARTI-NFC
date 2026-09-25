"use client";

import dynamic from "next/dynamic";

/**
 * Dev-only PWA diagnostics loader — keeps `PwaDiagnostics` out of the
 * production tap bundle. The diagnostics chunk is split separately and only
 * fetched when this renders the dynamic component, which happens solely in
 * development (the guard below is statically dead-code-eliminated in
 * production builds). `ssr: false` must live in a Client Component —
 * `next/dynamic` forbids it directly in Server Components.
 */
const PwaDiagnostics = dynamic(
  () => import("./PwaDiagnostics").then((m) => m.PwaDiagnostics),
  { ssr: false },
);

export function PwaDiagnosticsLazy() {
  if (process.env.NODE_ENV !== "development") return null;
  return <PwaDiagnostics />;
}
