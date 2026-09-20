import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidShortCodeFormat, normalizeShortCode } from "@/domain/cards";
import { validateSafeExternalUrl } from "@/domain/urls";
import type { Database } from "@/types/database";

/**
 * Permanent card redirect resolution (ADR-003, ADR-024).
 *
 * Physical cards and QR codes point at /t/{shortCode}; this resolver reads
 * the card's CURRENT backend destination on every hit. Pure orchestration
 * over minimal queries — no auth, no client data, no analytics.
 */

export type ResolverDb = SupabaseClient<Database>;

export type CardResolution =
  | { ok: true; kind: "PROFILE"; target: string }
  | { ok: true; kind: "EXTERNAL_URL"; target: string }
  | {
      ok: false;
      reason: "NOT_FOUND" | "NOT_ACTIVE" | "INVALID_DESTINATION" | "PROFILE_UNAVAILABLE";
    };

const RESOLVER_CARD_COLUMNS =
  "id, short_code, status, destination_type, destination_profile_id, destination_url" as const;

/**
 * Resolve a raw short code to a redirect target. Slugs come from the
 * profile ENTITY (never stored on the card), so slug changes and
 * destination switches take effect immediately with no rewrite.
 */
export async function resolveCardDestination(
  rawCode: unknown,
  supabase: ResolverDb,
): Promise<CardResolution> {
  if (typeof rawCode !== "string") return { ok: false, reason: "NOT_FOUND" };
  const shortCode = normalizeShortCode(rawCode);
  if (!isValidShortCodeFormat(shortCode)) return { ok: false, reason: "NOT_FOUND" };

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select(RESOLVER_CARD_COLUMNS)
    .eq("short_code", shortCode)
    .maybeSingle();

  if (cardError || !card) return { ok: false, reason: "NOT_FOUND" };
  if (card.status !== "ACTIVE") return { ok: false, reason: "NOT_ACTIVE" };

  if (card.destination_type === "PROFILE") {
    if (!card.destination_profile_id) return { ok: false, reason: "INVALID_DESTINATION" };
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, slug, status")
      .eq("id", card.destination_profile_id)
      .maybeSingle();
    if (profileError || !profile) return { ok: false, reason: "PROFILE_UNAVAILABLE" };
    if (profile.status !== "ACTIVE") return { ok: false, reason: "PROFILE_UNAVAILABLE" };
    return { ok: true, kind: "PROFILE", target: `/${profile.slug}` };
  }

  if (card.destination_type === "EXTERNAL_URL") {
    // Revalidated on every hit — never trust stored contents blindly.
    const target = card.destination_url ? validateSafeExternalUrl(card.destination_url) : null;
    if (!target) return { ok: false, reason: "INVALID_DESTINATION" };
    return { ok: true, kind: "EXTERNAL_URL", target };
  }

  return { ok: false, reason: "INVALID_DESTINATION" };
}
