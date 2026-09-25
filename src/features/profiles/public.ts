import type { SupabaseClient } from "@supabase/supabase-js";
import { isReservedSlug, normalizeSlug } from "@/domain/slugs";
import { isValidPublicCodeFormat, normalizePublicCode } from "@/domain/publicCode";
import type { Database } from "@/types/database";
import type { ProfileTheme } from "./schema";
import type { ProfileLinkRow } from "./types";
import { defaultSectionSettings, sanitizePublicSettings } from "./sectionSettings";

export type PublicDb = SupabaseClient<Database>;

/**
 * Public-safe profile projection. Deliberately excludes everything
 * administrative: no client records, no notes, no card data, no internal
 * timestamps beyond display needs (none exposed at all).
 */
export const PUBLIC_PROFILE_COLUMNS =
  "id, profile_type, slug, display_name, job_title, company_name, bio, avatar_path, cover_path, phone, whatsapp, email, website, address, maps_url, accent_color, theme, status" as const;

// Stable identity column (migration 20260923, ADR-046). The generated
// Database type predates it (regen blocked: no SUPABASE_ACCESS_TOKEN here),
// so rows carrying it are handled via PublicProfileRowWithCode casts —
// never by hand-editing src/types/database.ts.
export const PUBLIC_CODE_COLUMN = "public_code" as const;

export type PublicProfileRowWithCode = Record<string, unknown> & {
  public_code: string;
};

export const PUBLIC_LINK_COLUMNS = "id, type, label, url, sort_order" as const;

/**
 * Public-safe section projection. Identity + order + enabled + settings —
 * but `settings` is ALWAYS passed through `sanitizePublicSettings` before
 * it reaches `PublicSection`, so only schema-declared display keys survive
 * (admin-only or unknown keys are structurally stripped, ADR-053).
 */
export const PUBLIC_SECTION_COLUMNS = "id, type, position, enabled, settings" as const;

// Identity projection: the public allowlist plus the immutable public_code
// (wallet identity /u/{publicCode}, ADR-046). Kept as a separate constant
// so the pinned 18-column allowlist test stays exact.
export const PUBLIC_IDENTITY_COLUMNS = `${PUBLIC_PROFILE_COLUMNS}, ${PUBLIC_CODE_COLUMN}` as const;

const PUBLIC_IDENTITY_WITH_LINKS_COLUMNS =
  `${PUBLIC_IDENTITY_COLUMNS}, profile_links!profile_links_profile_id_fkey(id, type, label, url, sort_order, enabled, created_at), profile_sections!profile_sections_profile_id_fkey(id, type, position, enabled, settings)` as const;

type EmbeddedSectionRow = {
  id: string;
  type: string;
  position: number;
  enabled: boolean;
  settings?: unknown;
};

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
  /** Immutable identity code (migration 20260923) — powers /u/{publicCode}. */
  public_code: string;
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

/** Public-safe section: identity + order + enabled + sanitized settings. */
export type PublicSection = {
  id: string;
  type: string;
  position: number;
  enabled: boolean;
  settings: Record<string, unknown>;
};

/** Canonical foundation order when a profile carries no section rows yet. */
export const DEFAULT_PUBLIC_SECTIONS: PublicSection[] = [
  {
    id: "hero",
    type: "hero",
    position: 1,
    enabled: true,
    settings: defaultSectionSettings("hero"),
  },
  {
    id: "actions",
    type: "actions",
    position: 2,
    enabled: true,
    settings: defaultSectionSettings("actions"),
  },
  {
    id: "links",
    type: "links",
    position: 3,
    enabled: true,
    settings: defaultSectionSettings("links"),
  },
];

export type PublicProfileData = {
  profile: PublicProfile;
  links: PublicLink[];
  sections: PublicSection[];
};

/**
 * Map a projected row (slug or code loader, embed or legacy shape) to the
 * public shape. public_code is NOT NULL in the database, so it is always
 * present at runtime; the cast bridges the generated Database type until
 * `pnpm db:types` is re-run with credentials (ADR-013: generated file stays
 * hand-untouched). Theme falls back to light for unexpected values.
 */
function toPublicProfile(row: Record<string, unknown>): PublicProfile {
  const {
    profile_links: _droppedLinks,
    profile_sections: _droppedSections,
    ...rest
  } = row as Record<string, unknown> & {
    profile_links?: unknown;
    profile_sections?: unknown;
  };
  void _droppedLinks;
  void _droppedSections;
  const source = rest as Omit<PublicProfile, "theme" | "public_code"> & {
    theme: string;
    public_code?: unknown;
  };
  return {
    ...source,
    public_code: typeof source.public_code === "string" ? source.public_code : "",
    theme: source.theme === "dark" ? "dark" : "light",
  };
}

function sortEmbeddedLinks(rows: EmbeddedLinkRow[]): PublicLink[] {
  return rows
    .filter((link) => link.enabled === true)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .map((link) => ({
      id: link.id,
      type: link.type,
      label: link.label,
      url: link.url,
      sort_order: link.sort_order,
    }));
}

/**
 * Resolve the public section order from embedded (or legacy) rows.
 *
 * - Rows present → enabled-only, sorted by position, settings sanitized per
 *   type (unknown/admin-only keys stripped, invalid shapes reset to
 *   defaults). Disabled sections are dropped here so they never reach the
 *   renderer (and never leak into serialized props).
 * - Zero rows at all → the canonical foundation order. This covers profiles
 *   created before the Phase 25 backfill (or a partially restored backup);
 *   the UI stays identical until the admin reorders. An admin who disables
 *   every section still has rows, so an explicit all-off state renders
 *   nothing instead of resurrecting content.
 * - Unknown future types pass through untouched; the renderer ignores types
 *   it does not know (forward-compatible, never crashes).
 */
function resolvePublicSections(rows: EmbeddedSectionRow[] | unknown): PublicSection[] {
  if (!Array.isArray(rows) || rows.length === 0) return [...DEFAULT_PUBLIC_SECTIONS];
  return (rows as EmbeddedSectionRow[])
    .filter(
      (s) =>
        s !== null &&
        typeof s === "object" &&
        typeof (s as { id?: unknown }).id === "string" &&
        typeof (s as { type?: unknown }).type === "string" &&
        typeof (s as { position?: unknown }).position === "number" &&
        (s as { enabled?: unknown }).enabled === true,
    )
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      id: s.id,
      type: s.type,
      position: s.position,
      enabled: true,
      settings: sanitizePublicSettings(s.type, (s as { settings?: unknown }).settings),
    }));
}

/**
 * Legacy sections read (fallback when the embed key is absent, or when the
 * embed errors). Reads ALL rows — no enabled filter — so an explicit
 * all-disabled state stays empty while a profile with zero rows (missing
 * backfill) falls back to the canonical order. Any failure degrades to
 * default sections — never fail a tap.
 */
async function loadLegacySections(supabase: PublicDb, profileId: string): Promise<PublicSection[]> {
  try {
    const { data: sectionRows, error: sectionsError } = await supabase
      .from("profile_sections")
      .select(PUBLIC_SECTION_COLUMNS)
      .eq("profile_id", profileId)
      .order("position", { ascending: true });
    if (!sectionsError && Array.isArray(sectionRows) && sectionRows.length > 0) {
      // Rows exist: honor them exactly (all-disabled → empty, explicit choice).
      return resolvePublicSections(sectionRows as EmbeddedSectionRow[]);
    }
  } catch {
    // Fall through to defaults.
  }
  return [...DEFAULT_PUBLIC_SECTIONS];
}

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
  // Identity projection (includes public_code) in both shapes.
  try {
    const { data: embedded, error: embeddedError } = await supabase
      .from("profiles")
      .select(PUBLIC_IDENTITY_WITH_LINKS_COLUMNS)
      .eq("slug", slug)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!embeddedError) {
      if (!embedded) return null;
      const row = embedded as unknown as Record<string, unknown>;
      if ("profile_links" in row && Array.isArray(row.profile_links)) {
        return {
          profile: toPublicProfile(row),
          links: sortEmbeddedLinks(row.profile_links as EmbeddedLinkRow[]),
          sections: resolvePublicSections(row.profile_sections),
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
    .select(PUBLIC_IDENTITY_COLUMNS)
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (profileError || !profile) return null;

  // Legacy fallback only (embed unavailable): links + sections need just the
  // profile id, so they run concurrently and save ~1 RTT on slow networks.
  const [linksResult, sections] = await Promise.all([
    supabase
      .from("profile_links")
      .select(PUBLIC_LINK_COLUMNS)
      .eq("profile_id", profile.id)
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    loadLegacySections(supabase, profile.id),
  ]);

  if (linksResult.error) return null;

  return {
    profile: toPublicProfile(profile as unknown as Record<string, unknown>),
    links: linksResult.data ?? [],
    sections,
  };
}

/**
 * Load an ACTIVE public profile by immutable public_code (`/u/{publicCode}`,
 * wallet identity, ADR-046). Same gating and projection as the slug loader:
 * unknown, malformed, DRAFT, or INACTIVE codes return null without revealing
 * which. Slugs stay human-friendly; codes stay forever.
 */
export async function getPublicProfileByCode(
  rawCode: unknown,
  supabase: PublicDb,
): Promise<PublicProfileData | null> {
  if (typeof rawCode !== "string") return null;
  const code = normalizePublicCode(rawCode);
  if (!isValidPublicCodeFormat(code)) return null;

  // Fast path: one RTT — profile + links via the links embed.
  try {
    const { data: embedded, error: embeddedError } = await supabase
      .from("profiles")
      .select(PUBLIC_IDENTITY_WITH_LINKS_COLUMNS)
      .eq("public_code", code)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!embeddedError) {
      if (!embedded) return null;
      const row = embedded as unknown as Record<string, unknown>;
      if ("profile_links" in row && Array.isArray(row.profile_links)) {
        return {
          profile: toPublicProfile(row),
          links: sortEmbeddedLinks(row.profile_links as EmbeddedLinkRow[]),
          sections: resolvePublicSections(row.profile_sections),
        };
      }
      // Embed key absent → legacy path below (null already returned above).
    }
  } catch {
    // Fall through to legacy path.
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PUBLIC_IDENTITY_COLUMNS)
    .eq("public_code", code)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (profileError || !profile) return null;

  // Legacy fallback only (embed unavailable): links + sections need just the
  // profile id, so they run concurrently and save ~1 RTT on slow networks.
  const profileId = (profile as unknown as Record<string, string>).id;
  const [linksResult, sections] = await Promise.all([
    supabase
      .from("profile_links")
      .select(PUBLIC_LINK_COLUMNS)
      .eq("profile_id", profileId)
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    loadLegacySections(supabase, profileId),
  ]);

  if (linksResult.error) return null;

  return {
    profile: toPublicProfile(profile as unknown as Record<string, unknown>),
    links: linksResult.data ?? [],
    sections,
  };
}

/**
 * Profile-only loader for the vCard route (no links RTT).
 * Same ACTIVE-only gating as getPublicProfileBySlug — returns null for
 * unknown, reserved, DRAFT, or INACTIVE slugs without revealing which.
 * The vCard body needs contact columns only, never link rows. Identity
 * projection keeps the PublicProfile shape complete (public_code unused
 * by vCard output, but present for type unity).
 */
export async function getPublicProfileRowBySlug(
  rawSlug: string,
  supabase: PublicDb,
): Promise<PublicProfile | null> {
  const slug = normalizeSlug(rawSlug);
  if (slug === "" || isReservedSlug(slug)) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PUBLIC_IDENTITY_COLUMNS)
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (profileError || !profile) return null;

  return toPublicProfile(profile as unknown as Record<string, unknown>);
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
