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
