import "server-only";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/env";
import { getServiceRoleKey } from "@/lib/env-server";
import type { Database } from "@/types/database";

if (typeof window !== "undefined") {
  throw new Error("src/lib/supabase/admin.ts must never be imported in the browser.");
}

/**
 * Privileged server-only Supabase client (bypasses RLS).
 *
 * Justified use-cases only — currently: anonymous public-profile reads
 * (Phase 5, ADR-018). Every query through this client MUST project an
 * explicit public-safe column list; never select admin/private data.
 * Mutations are forbidden here — all writes go through the user-scoped
 * server client with RLS.
 */
export function createAdminClient() {
  const { url } = getSupabasePublicConfig();
  const serviceRoleKey = getServiceRoleKey();
  return createJsClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
