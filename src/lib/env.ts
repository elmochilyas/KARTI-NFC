/**
 * Browser-safe environment validation (NEXT_PUBLIC_* only).
 *
 * The service-role key lives in `./env-server`, guarded by the `server-only`
 * package — never move secret access into this module.
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
 * Server-only secret access lives in `./env-server` (guarded by the
 * `server-only` package, which fails the build if pulled into client code).
 * This module stays browser-safe: only NEXT_PUBLIC_* values here.
 */
