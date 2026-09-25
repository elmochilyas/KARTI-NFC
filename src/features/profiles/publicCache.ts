import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicProfileByCode, getPublicProfileBySlug, type PublicProfileData } from "./public";

/**
 * Zero-stale cross-request cache for the public profile tap path.
 *
 * - Cached indefinitely (`revalidate: false`) — never time-expires, so a
 *   dashboard edit can never lag behind a TTL window.
 * - Purged synchronously on every profile/link mutation via
 *   `revalidatePublicProfiles()` (called next to the existing
 *   `revalidatePath` in dashboard actions). Edits stay instantly visible;
 *   repeat taps between edits skip the database entirely.
 * - One global tag (`public-profiles`) for all slugs: a slug rename purges
 *   the old slug entry too (which a per-slug-only tag would miss without
 *   tracking the previous slug). At single-admin MVP scale the over-purge
 *   cost (one refetch per slug after any edit) is negligible.
 * - The `/t/[code]` resolver stays `no-store` (ADR-024) — card destination
 *   switches bypass this cache by construction.
 */
export const PUBLIC_PROFILES_TAG = "public-profiles";

/**
 * Slow-tap threshold for the observability log below. Only cache-MISS DB
 * fetches that exceed this are logged — steady-state cached taps stay silent
 * so Vercel logs keep only the outliers worth investigating (cold starts,
 * cross-region RTT spikes, embed-fallback 3-RTT paths).
 */
export const SLOW_TAP_DB_MS = 800;

async function fetchPublicProfile(slug: string): Promise<PublicProfileData | null> {
  const started = Date.now();
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return null;
  }
  const data = await getPublicProfileBySlug(slug, supabase);
  const dur = Date.now() - started;
  if (dur >= SLOW_TAP_DB_MS) {
    console.info(`[tap] slow public-profile DB fetch slug=${slug.length}ch dur=${dur}ms`);
  }
  return data;
}

export const getCachedPublicProfileBySlug = unstable_cache(
  fetchPublicProfile,
  ["public-profile-by-slug"],
  {
    tags: [PUBLIC_PROFILES_TAG],
    revalidate: false,
  },
);

async function fetchPublicProfileByCode(code: string): Promise<PublicProfileData | null> {
  const started = Date.now();
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return null;
  }
  const data = await getPublicProfileByCode(code, supabase);
  const dur = Date.now() - started;
  if (dur >= SLOW_TAP_DB_MS) {
    console.info(`[tap] slow public-profile DB fetch code=${code.length}ch dur=${dur}ms`);
  }
  return data;
}

/**
 * Cached wallet-identity loader (/u/{publicCode}, ADR-046). Same global tag
 * as the slug loader, so every dashboard write purges both — zero stale on
 * either URL shape.
 */
export const getCachedPublicProfileByCode = unstable_cache(
  fetchPublicProfileByCode,
  ["public-profile-by-code"],
  {
    tags: [PUBLIC_PROFILES_TAG],
    revalidate: false,
  },
);

/** Purge all cached public profiles after any profile/link write.
 *
 * Uses `updateTag` (not `revalidateTag`): dashboard callers are Server
 * Actions, where `updateTag` expires immediately with read-your-own-writes
 * semantics. `revalidateTag` in Next 16 targets a cacheLife profile for
 * background revalidation — wrong tool for zero-stale dashboard edits.
 */
export function revalidatePublicProfiles(): void {
  updateTag(PUBLIC_PROFILES_TAG);
}
