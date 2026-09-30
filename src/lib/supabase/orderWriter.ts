import "server-only";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/env";
import { getServiceRoleKey } from "@/lib/env-server";
import type { Database } from "@/types/database";

if (typeof window !== "undefined") {
  throw new Error("src/lib/supabase/orderWriter.ts must never be imported in the browser.");
}

/**
 * Narrow privileged client for public order/inquiry submission (ADR-071).
 *
 * Justification: anonymous visitors hold zero grants on commercial tables
 * and supabase-js cannot span a transaction. This client exists SOLELY to
 * execute the `create_public_*` RPCs plus the Phase 6 `check_rate_limit`
 * RPC, which run the atomic writes inside SECURITY DEFINER functions with
 * no API-role grants. Raw table inserts/updates/deletes through this
 * client are forbidden — every call site must use `.rpc()` only.
 */
export function createOrderWriterClient() {
  const { url } = getSupabasePublicConfig();
  const serviceRoleKey = getServiceRoleKey();
  return createJsClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
