import "server-only";

/**
 * Server-only secrets. The `server-only` import above makes any client-side
 * (or browser-bundle) import a hard build error — stronger than the previous
 * runtime `typeof window` guard. Never add NEXT_PUBLIC_* reads here; those
 * belong in `./env`, which must stay browser-safe.
 */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (see .env.example).");
  }
  return key;
}
