import { redirect } from "next/navigation";
// Manual map-pin picker tiles (Phase 34.7). Dashboard-only: the public
// profile never loads Leaflet (read-only OSM embeds there).
import "leaflet/dist/leaflet.css";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side auth gate for /dashboard/** (defense in depth behind src/proxy.ts).
 * Hiding UI is not authorization — every privileged mutation must re-check
 * the session server-side (Phase 3+), and RLS (admin allowlist, ADR-031)
 * remains authoritative for data access: an authenticated non-admin reaches
 * this shell but every query denies them, so no protected data ever renders.
 * (Deliberately no layout-level is_admin RPC: private.is_admin lives outside
 * the PostgREST-exposed schemas, and RLS already enforces the boundary.)
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let email: string | undefined;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();
      const claims = data?.claims;
      if (!claims) {
        redirect("/login?next=/dashboard");
      }
      email = typeof claims.email === "string" ? claims.email : undefined;
    } catch {
      redirect("/login?next=/dashboard");
    }
  } else {
    redirect("/login?next=/dashboard&setup=missing-env");
  }

  return <DashboardShell email={email}>{children}</DashboardShell>;
}
