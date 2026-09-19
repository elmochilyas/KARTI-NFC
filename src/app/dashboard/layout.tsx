import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side auth gate for /dashboard/** (defense in depth behind src/proxy.ts).
 * Hiding UI is not authorization — every privileged mutation must re-check
 * the session server-side (Phase 3+).
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
