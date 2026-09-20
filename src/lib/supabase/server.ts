import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * User-scoped server Supabase client (anon key, RLS applies).
 * Must be created per request — Server Components, Server Actions,
 * Route Handlers. Session refresh is handled by src/proxy.ts.
 *
 * Throws when Supabase env is missing so callers can show a clear
 * "not configured" state instead of crashing.
 */
export async function createClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component where cookies are read-only.
          // The proxy refreshes the session instead.
        }
      },
    },
  });
}
