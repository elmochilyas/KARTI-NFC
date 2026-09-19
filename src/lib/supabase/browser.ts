"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Browser Supabase client (anon key, RLS applies).
 * createBrowserClient is a singleton — safe to call from any Client Component.
 */
export function createClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  return createBrowserClient<Database>(url, anonKey);
}
