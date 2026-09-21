import type { SupabaseClient } from "@supabase/supabase-js";
import { isReservedSlug, normalizeSlug } from "@/domain/slugs";
import type { Database } from "@/types/database";
import type { ProfileTheme } from "./schema";
import type { ProfileLinkRow } from "./types";

export type PublicDb = SupabaseClient<Database>;

/**
 * Public-safe profile projection. Deliberately excludes everything
 * administrative: no client records, no notes, no card data, no internal
 * timestamps beyond display needs (none exposed at all).
 */
export const PUBLIC_PROFILE_COLUMNS =
  "id, profile_type, slug, display_name, job_title, company_name, bio, avatar_path, cover_path, phone, whatsapp, email, website, address, maps_url, accent_color, theme, status" as const;

export const PUBLIC_LINK_COLUMNS = "id, type, label, url, sort_order" as const;

// Single-RTT embed: profile + links via the profile_links FK. `enabled` and
// `created_at` ride along for JS-side filtering/sorting, then are stripped
// so the public shape stays exactly PUBLIC_LINK_COLUMNS.
const PUBLIC_PROFILE_WITH_LINKS_COLUMNS =
  `${PUBLIC_PROFILE_COLUMNS}, profile_links!profile_links_profile_id_fkey(id, type, label, url, sort_order, enabled, created_at)` as const;

type EmbeddedLinkRow = {
  id: string;
  type: string;
  label: string;
  url: string;
  sort_order: number;
  enabled: boolean;
  created_at: string;
};

export type PublicProfile = {
  id: string;
  profile_type: string;
  slug: string;
  display_name: string;
  job_title: string | null;
  company_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  maps_url: string | null;
  accent_color: string | null;
  theme: ProfileTheme;
};

export type PublicLink = Pick<ProfileLinkRow, "id" | "type" | "label" | "url" | "sort_order">;

export type PublicProfileData = {
  profile: PublicProfile;
  links: PublicLink[];
};

/**
 * Load an ACTIVE public profile by slug. Returns null for unknown,
 * reserved, DRAFT, or INACTIVE slugs — without revealing which case it is.
 * Only enabled links, in sort_order. Inject any client (tests use fakes);
 * production passes the privileged server client (ADR-018).
 */
export async function getPublicProfileBySlug(
  rawSlug: string,
  supabase: PublicDb,
): Promise<PublicProfileData | null> {
  const slug = normalizeSlug(rawSlug);
  if (slug === "" || isReservedSlug(slug)) return null;

  // Fast path: one RTT — profile + links in a single PostgREST request.
  // Disabled links are filtered and ordering applied in JS (link counts are
  // tiny; one RTT cross-region beats two sequential RTTs). Falls back to the
  // legacy two-query path when the embed key is absent.
  try {
    const { data: embedded, error: embeddedError } = await supabase
      .from("profiles")
      .select(PUBLIC_PROFILE_WITH_LINKS_COLUMNS)
      .eq("slug", slug)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!embeddedError) {
      if (!embedded) return null;
      const row = embedded as unknown as Record<string, unknown>;
      if ("profile_links" in row && Array.isArray(row.profile_links)) {
        const links = (row.profile_links as EmbeddedLinkRow[])
          .filter((link) => link.enabled === true)
          .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
          .map((link) => ({
            id: link.id,
            type: link.type,
            label: link.label,
            url: link.url,
            sort_order: link.sort_order,
          }));
        const { profile_links: _dropped, ...profile } = row as Record<string, unknown> & {
          profile_links?: unknown;
        };
        void _dropped;
        return {
          profile: {
            ...(profile as Omit<PublicProfile, "theme"> & { theme: string }),
            theme: (profile as { theme: string }).theme === "dark" ? "dark" : "light",
          },
          links,
        };
      }
      // Embed key absent (older mock / unexpected shape) → legacy path below.
      // A definitive null already returned above — no double query.
    }
    // Embed error → fall through to legacy. Never fail a tap here.
  } catch {
    // Fall through to legacy path.
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (profileError || !profile) return null;

  const { data: links, error: linksError } = await supabase
    .from("profile_links")
    .select(PUBLIC_LINK_COLUMNS)
    .eq("profile_id", profile.id)
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (linksError) return null;

  return {
    profile: {
      ...profile,
      theme: profile.theme === "dark" ? "dark" : "light",
    },
    links: links ?? [],
  };
}

/**
 * Profile-only loader for the vCard route (no links RTT).
 * Same ACTIVE-only gating as getPublicProfileBySlug — returns null for
 * unknown, reserved, DRAFT, or INACTIVE slugs without revealing which.
 * The vCard body needs contact columns only, never link rows.
 */
export async function getPublicProfileRowBySlug(
  rawSlug: string,
  supabase: PublicDb,
): Promise<PublicProfile | null> {
  const slug = normalizeSlug(rawSlug);
  if (slug === "" || isReservedSlug(slug)) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (profileError || !profile) return null;

  return {
    ...profile,
    theme: profile.theme === "dark" ? "dark" : "light",
  };
}

/** True when the profile carries enough contact data for a Save Contact CTA. */
export function hasContactData(
  profile: Pick<PublicProfile, "display_name" | "phone" | "email">,
): boolean {
  return profile.display_name.trim() !== "" && (profile.phone !== null || profile.email !== null);
}

/** "<Name> | Karti" or "<Name> — <Company> | Karti", admin-data free. */
export function publicProfileTitle(
  profile: Pick<PublicProfile, "display_name" | "company_name">,
): string {
  const name = profile.display_name.trim() || "Karti Profile";
  const company = profile.company_name?.trim();
  return company ? `${name} — ${company} | Karti` : `${name} | Karti`;
}

/** Short plain-text description for metadata; never admin content. */
export function publicProfileDescription(
  profile: Pick<PublicProfile, "job_title" | "bio" | "company_name">,
): string {
  const parts = [
    profile.job_title?.trim(),
    profile.company_name?.trim(),
    profile.bio?.trim(),
  ].filter((part): part is string => !!part);
  const description = parts.join(" · ");
  return description === "" ? "View this Karti contact profile." : description.slice(0, 160);
}
