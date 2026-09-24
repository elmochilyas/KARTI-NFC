import type { Tables } from "@/types/database";
import type { ProfileInput } from "./schema";

export type ProfileRow = Tables<"profiles">;
export type ProfileLinkRow = Tables<"profile_links">;
export type ProfileSectionRow = Tables<"profile_sections">;

export const SECTION_TYPES = ["hero", "actions", "links"] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/** Human labels for the admin section list. */
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: "Hero",
  actions: "Quick actions & info",
  links: "Links",
};

/** Canonical foundation order (positions 1/2/3). */
export const DEFAULT_SECTION_ORDER: SectionType[] = ["hero", "actions", "links"];

export const LINK_TYPES = [
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
  "x",
  "snapchat",
  "website",
  "google_review",
  "booking",
  "maps",
  "custom",
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

/** Human labels for the link-type picker. */
export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  snapchat: "Snapchat",
  website: "Website",
  google_review: "Google Reviews",
  booking: "Booking",
  maps: "Maps",
  custom: "Custom link",
};

export type ProfileErrorCode =
  "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "UNKNOWN";

export type ProfileResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ProfileErrorCode;
        message: string;
        fieldErrors?: Partial<Record<keyof ProfileInput, string>>;
      };
    };

export const PROFILE_DETAIL_COLUMNS =
  "id, client_id, profile_type, slug, public_code, display_name, job_title, company_name, bio, avatar_path, cover_path, phone, whatsapp, email, website, address, maps_url, accent_color, theme, status, created_at, updated_at" as const;

/**
 * Legacy read projection for databases predating the `public_code`
 * migration (20260923). The loader tries `PROFILE_DETAIL_COLUMNS` first
 * and retries with this list when PostgREST reports a missing column
 * (PGRST204), so pre-migration profiles keep loading instead of surfacing
 * "Could not load the profile." Never add new columns here — it is the
 * floor, not the ceiling.
 */
export const PROFILE_DETAIL_COLUMNS_LEGACY =
  "id, client_id, profile_type, slug, display_name, job_title, company_name, bio, avatar_path, cover_path, phone, whatsapp, email, website, address, maps_url, accent_color, theme, status, created_at, updated_at" as const;

export const PROFILE_SUMMARY_COLUMNS =
  "id, client_id, profile_type, slug, public_code, display_name, status, updated_at" as const;

export const PROFILE_LINK_COLUMNS =
  "id, profile_id, type, label, url, icon, sort_order, enabled, created_at, updated_at" as const;

export const PROFILE_SECTION_COLUMNS =
  "id, profile_id, type, position, enabled, settings, created_at, updated_at" as const;
