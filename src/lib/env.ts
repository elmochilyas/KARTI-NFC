/**
 * Environment validation.
 *
 * Browser code may only read NEXT_PUBLIC_* values. The service-role key is
 * strictly server-only — importing it from client code is forbidden.
 *
 * Missing Supabase configuration must fail clearly at the point of use, not
 * crash unrelated pages at import time (the Supabase project is not
 * provisioned yet; see specs/ENVIRONMENT.md).
 */

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return { url, anonKey };
}

/**
 * Server-only. Never import from client components or browser modules —
 * the service-role key bypasses RLS.
 */
export function getServiceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must never be read in the browser.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (see .env.example).");
  }
  return key;
}
