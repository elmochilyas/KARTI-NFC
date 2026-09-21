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

// Single-RTT embed: cards → profiles via the destination FK. Falls back to
// the legacy two-query path when the embed is unavailable (see below).
const RESOLVER_CARD_WITH_PROFILE_COLUMNS =
  `${RESOLVER_CARD_COLUMNS}, profiles!cards_destination_profile_id_fkey(slug, status)` as const;

type EmbeddedProfile = { slug: string; status: string } | null;

type CardWithProfile = {
  id: string;
  short_code: string;
  status: string;
  destination_type: string | null;
  destination_profile_id: string | null;
  destination_url: string | null;
  profiles?: EmbeddedProfile | EmbeddedProfile[];
};

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

  // Fast path: one RTT — card + destination profile in a single PostgREST
  // request. EXTERNAL_URL taps never needed a second query; PROFILE taps now
  // skip it too when the embed resolves.
  try {
    const { data: embedded, error: embeddedError } = await supabase
      .from("cards")
      .select(RESOLVER_CARD_WITH_PROFILE_COLUMNS)
      .eq("short_code", shortCode)
      .maybeSingle();
    if (!embeddedError) {
      // Embed answered definitively — a missing card is NOT_FOUND with no
      // second query (previously the legacy path re-queried).
      if (!embedded) return { ok: false, reason: "NOT_FOUND" };
      const card = embedded as unknown as CardWithProfile;
      if (card.status !== "ACTIVE") return { ok: false, reason: "NOT_ACTIVE" };
      if (card.destination_type === "PROFILE") {
        if (!card.destination_profile_id) return { ok: false, reason: "INVALID_DESTINATION" };
        // Distinguish absent embed key (legacy shape → second query) from an
        // explicit null (dangling profile id → unavailable, no second RTT).
        // `?? null` would collapse both — check key presence first.
        if (!("profiles" in card)) {
          // Fall through to the legacy two-query path below.
        } else {
          const raw = card.profiles;
          const profile = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
          if (!profile) return { ok: false, reason: "PROFILE_UNAVAILABLE" };
          if (profile.status !== "ACTIVE") return { ok: false, reason: "PROFILE_UNAVAILABLE" };
          return { ok: true, kind: "PROFILE", target: `/${profile.slug}` };
        }
      } else if (card.destination_type === "EXTERNAL_URL") {
        const target = card.destination_url ? validateSafeExternalUrl(card.destination_url) : null;
        if (!target) return { ok: false, reason: "INVALID_DESTINATION" };
        return { ok: true, kind: "EXTERNAL_URL", target };
      } else {
        // Card found but destination_type is null/unknown — invalid without
        // further queries.
        return { ok: false, reason: "INVALID_DESTINATION" };
      }
    }
    // Embed error or missing key → fall through to the legacy two-query path
    // (which the existing unit fakes exercise). Never fail a tap here.
  } catch {
    // Fall through to legacy path.
  }

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
