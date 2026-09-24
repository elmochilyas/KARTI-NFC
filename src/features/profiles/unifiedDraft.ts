import { normalizeSlug } from "@/domain/slugs";
import { readPrimaryRefs, sanitizePrimaryRefs } from "@/components/public-profile/brandIcons";
import { defaultSectionSettings, sanitizePublicSettings } from "./sectionSettings";
import type { ProfileLinkRow, ProfileRow, ProfileSectionRow } from "./types";
import type { PublicLink, PublicProfile, PublicSection } from "./public";
import type { ProfileTheme, ProfileType } from "./schema";

/**
 * Phase 34 unified editor draft — ONE client-side source of truth for the
 * profile editor. The step forms and the live preview read from the same
 * draft; nothing reaches the server until the unified Save runs (image
 * uploads are the deliberate exception — storage objects must exist before
 * the row can reference them).
 *
 * Pure module (no React, no Supabase): the reducer and adapters are
 * unit-testable without a DOM or database.
 */

export const EDITOR_STEPS = [
  { id: "identity", label: "Identity" },
  { id: "contact", label: "Contact" },
  { id: "links", label: "Links" },
  { id: "sections", label: "Sections" },
  { id: "appearance", label: "Appearance" },
  { id: "review", label: "Review" },
] as const;

export type EditorStepId = (typeof EDITOR_STEPS)[number]["id"];

/** Which wizard step owns each profile column (links/sections save as units). */
export const FIELD_STEPS: Record<string, number> = {
  profile_type: 0,
  template: 0,
  slug: 0,
  display_name: 0,
  job_title: 0,
  company_name: 0,
  bio: 0,
  avatar_path: 0,
  cover_path: 0,
  phone: 1,
  whatsapp: 1,
  email: 1,
  website: 1,
  address: 1,
  maps_url: 1,
  accent_color: 4,
  theme: 4,
  links: 2,
  sections: 3,
};

export const DEFAULT_ACCENT = "#0e7c5b";

/** Profile columns the editor owns (mirrors `readProfileForm`, no template). */
export type DraftFields = {
  profile_type: ProfileType;
  slug: string;
  display_name: string;
  job_title: string;
  company_name: string;
  bio: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  maps_url: string;
  accent_color: string;
  theme: ProfileTheme;
  avatar_path: string;
  cover_path: string;
};

export type DraftLink = {
  id: string;
  type: string;
  label: string;
  url: string;
  icon: string | null;
  enabled: boolean;
  sort_order: number;
  /** True for rows created in the draft that the server has never seen. */
  isNew: boolean;
};

export type DraftSection = {
  id: string;
  type: string;
  position: number;
  enabled: boolean;
  settings: Record<string, unknown>;
  /** True for rows created in the draft that the server has never seen. */
  isNew: boolean;
};

export type EditorDraft = {
  /** True when no persisted profile exists yet (creation flow). */
  isNew: boolean;
  fields: DraftFields;
  /** Selected template id (new profiles) / reference (existing profiles). */
  template: string;
  status: string;
  links: DraftLink[];
  deletedLinkIds: string[];
  sections: DraftSection[];
  deletedSectionIds: string[];
  /** Client-side object URLs shown before (and right after) save. */
  avatarPreviewUrl: string | null;
  coverPreviewUrl: string | null;
  dirty: boolean;
};

export function isTempId(id: string): boolean {
  return id.startsWith("draft-");
}

function fieldsFromProfile(profile: ProfileRow | null, clientName: string): DraftFields {
  return {
    profile_type: (profile?.profile_type === "BUSINESS" ? "BUSINESS" : "PERSON") as ProfileType,
    slug: profile?.slug ?? suggestSlug(clientName),
    display_name: profile?.display_name ?? clientName,
    job_title: profile?.job_title ?? "",
    company_name: profile?.company_name ?? "",
    bio: profile?.bio ?? "",
    phone: profile?.phone ?? "",
    whatsapp: profile?.whatsapp ?? "",
    email: profile?.email ?? "",
    website: profile?.website ?? "",
    address: profile?.address ?? "",
    maps_url: profile?.maps_url ?? "",
    accent_color: profile?.accent_color ?? DEFAULT_ACCENT,
    theme: (profile?.theme === "dark" ? "dark" : "light") as ProfileTheme,
    avatar_path: profile?.avatar_path ?? "",
    cover_path: profile?.cover_path ?? "",
  };
}

/** Local slug suggestion (mirrors the service helper without its server imports). */
export function suggestSlug(displayName: string): string {
  const normalized = normalizeSlug(displayName);
  return normalized === "" ? "profile" : normalized;
}

function linksFromRows(rows: ProfileLinkRow[]): DraftLink[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((l, index) => ({
      id: l.id,
      type: l.type,
      label: l.label,
      url: l.url,
      icon: l.icon ?? null,
      enabled: l.enabled,
      sort_order: index,
      isNew: false,
    }));
}

function sectionsFromRows(rows: ProfileSectionRow[]): DraftSection[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((s, index) => ({
      id: s.id,
      type: s.type,
      position: index + 1,
      enabled: s.enabled,
      settings:
        s.settings !== null && typeof s.settings === "object"
          ? { ...(s.settings as Record<string, unknown>) }
          : {},
      isNew: false,
    }));
}

export function initDraft(input: {
  profile: ProfileRow | null;
  clientName: string;
  links: ProfileLinkRow[];
  sections: ProfileSectionRow[];
  template: string;
}): EditorDraft {
  return {
    isNew: input.profile === null,
    fields: fieldsFromProfile(input.profile, input.clientName),
    template: input.template,
    status: input.profile?.status ?? "DRAFT",
    links: linksFromRows(input.links),
    deletedLinkIds: [],
    sections: sectionsFromRows(input.sections),
    deletedSectionIds: [],
    avatarPreviewUrl: null,
    coverPreviewUrl: null,
    dirty: false,
  };
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export type DraftAction =
  | { type: "setField"; field: keyof DraftFields; value: string }
  | { type: "setTemplate"; template: string }
  | { type: "setAvatar"; path: string; previewUrl: string | null }
  | { type: "removeAvatar" }
  | { type: "setCover"; path: string; previewUrl: string | null }
  | { type: "removeCover" }
  | { type: "addLink"; link: DraftLink }
  | { type: "updateLink"; id: string; patch: Partial<Omit<DraftLink, "id" | "isNew">> }
  | { type: "deleteLink"; id: string }
  | { type: "toggleLink"; id: string; enabled: boolean }
  | { type: "moveLink"; id: string; direction: -1 | 1 }
  | { type: "addSection"; section: DraftSection }
  | { type: "deleteSection"; id: string }
  | { type: "toggleSection"; id: string; enabled: boolean }
  | { type: "moveSection"; id: string; direction: -1 | 1 }
  | { type: "setSectionOrder"; ids: string[] }
  | { type: "setSectionSettings"; id: string; settings: Record<string, unknown> }
  | { type: "setStatus"; status: string }
  | {
      type: "rebase";
      profile: ProfileRow;
      links: ProfileLinkRow[];
      sections: ProfileSectionRow[];
    };

function renumberLinks(links: DraftLink[]): DraftLink[] {
  return links.map((l, index) => ({ ...l, sort_order: index }));
}

function renumberSections(sections: DraftSection[]): DraftSection[] {
  return sections.map((s, index) => ({ ...s, position: index + 1 }));
}

function moveId(ids: string[], id: string, direction: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return ids;
  next.splice(to, 0, moved);
  return next;
}

export function draftReducer(draft: EditorDraft, action: DraftAction): EditorDraft {
  switch (action.type) {
    case "setField":
      if (draft.fields[action.field] === action.value) return draft;
      return {
        ...draft,
        fields: { ...draft.fields, [action.field]: action.value },
        dirty: true,
      };
    case "setTemplate":
      if (draft.template === action.template) return draft;
      return { ...draft, template: action.template, dirty: true };
    case "setAvatar":
      return {
        ...draft,
        fields: { ...draft.fields, avatar_path: action.path },
        avatarPreviewUrl: action.previewUrl,
        dirty: true,
      };
    case "removeAvatar":
      return {
        ...draft,
        fields: { ...draft.fields, avatar_path: "" },
        avatarPreviewUrl: null,
        dirty: true,
      };
    case "setCover":
      return {
        ...draft,
        fields: { ...draft.fields, cover_path: action.path },
        coverPreviewUrl: action.previewUrl,
        dirty: true,
      };
    case "removeCover":
      return {
        ...draft,
        fields: { ...draft.fields, cover_path: "" },
        coverPreviewUrl: null,
        dirty: true,
      };
    case "addLink":
      return {
        ...draft,
        links: renumberLinks([...draft.links, action.link]),
        dirty: true,
      };
    case "updateLink":
      return {
        ...draft,
        links: draft.links.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)),
        dirty: true,
      };
    case "deleteLink": {
      const target = draft.links.find((l) => l.id === action.id);
      if (!target) return draft;
      return {
        ...draft,
        links: renumberLinks(draft.links.filter((l) => l.id !== action.id)),
        deletedLinkIds: target.isNew ? draft.deletedLinkIds : [...draft.deletedLinkIds, action.id],
        dirty: true,
      };
    }
    case "toggleLink":
      return {
        ...draft,
        links: draft.links.map((l) => (l.id === action.id ? { ...l, enabled: action.enabled } : l)),
        dirty: true,
      };
    case "moveLink": {
      const order = moveId(
        draft.links.map((l) => l.id),
        action.id,
        action.direction,
      );
      if (order.join() === draft.links.map((l) => l.id).join()) return draft;
      const byId = new Map(draft.links.map((l) => [l.id, l]));
      return {
        ...draft,
        links: renumberLinks(order.map((id) => byId.get(id)).filter((l) => l !== undefined)),
        dirty: true,
      };
    }
    case "addSection":
      return {
        ...draft,
        sections: renumberSections([...draft.sections, action.section]),
        dirty: true,
      };
    case "deleteSection": {
      const target = draft.sections.find((s) => s.id === action.id);
      if (!target) return draft;
      return {
        ...draft,
        sections: renumberSections(draft.sections.filter((s) => s.id !== action.id)),
        deletedSectionIds: target.isNew
          ? draft.deletedSectionIds
          : [...draft.deletedSectionIds, action.id],
        dirty: true,
      };
    }
    case "toggleSection":
      return {
        ...draft,
        sections: draft.sections.map((s) =>
          s.id === action.id ? { ...s, enabled: action.enabled } : s,
        ),
        dirty: true,
      };
    case "moveSection": {
      const order = moveId(
        draft.sections.map((s) => s.id),
        action.id,
        action.direction,
      );
      if (order.join() === draft.sections.map((s) => s.id).join()) return draft;
      const byId = new Map(draft.sections.map((s) => [s.id, s]));
      return {
        ...draft,
        sections: renumberSections(order.map((id) => byId.get(id)).filter((s) => s !== undefined)),
        dirty: true,
      };
    }
    case "setSectionOrder": {
      const current = draft.sections.map((s) => s.id);
      if (action.ids.join() === current.join()) return draft;
      if (action.ids.length !== current.length || !action.ids.every((id) => current.includes(id))) {
        return draft;
      }
      const byId = new Map(draft.sections.map((s) => [s.id, s]));
      return {
        ...draft,
        sections: renumberSections(
          action.ids.map((id) => byId.get(id)).filter((s) => s !== undefined),
        ),
        dirty: true,
      };
    }
    case "setSectionSettings":
      return {
        ...draft,
        sections: draft.sections.map((s) =>
          s.id === action.id ? { ...s, settings: action.settings } : s,
        ),
        dirty: true,
      };
    case "setStatus":
      if (draft.status === action.status) return draft;
      return { ...draft, status: action.status };
    case "rebase":
      return {
        ...initDraft({
          profile: action.profile,
          clientName: draft.fields.display_name,
          links: action.links,
          sections: action.sections,
          template: draft.template,
        }),
        isNew: false,
        status: action.profile.status,
        // Keep the operator's image previews across the save: the server
        // URLs refresh a beat later via router.refresh().
        avatarPreviewUrl: draft.avatarPreviewUrl,
        coverPreviewUrl: draft.coverPreviewUrl,
      };
    default:
      return draft;
  }
}

/* ------------------------------------------------------------------ */
/* Save payload — full end-state; the server diffs against its rows.   */
/* ------------------------------------------------------------------ */

export type UnifiedSavePayload = {
  profile: Record<string, string>;
  previousAvatarPath: string;
  previousCoverPath: string;
  newProfileId: string | null;
  template: string;
  links: {
    id: string;
    type: string;
    label: string;
    url: string;
    enabled: boolean;
    sort_order: number;
  }[];
  deletedLinkIds: string[];
  sections: {
    id: string;
    type: string;
    position: number;
    enabled: boolean;
    settings: Record<string, unknown>;
  }[];
  deletedSectionIds: string[];
};

const PROFILE_VALUE_KEYS = [
  "profile_type",
  "slug",
  "display_name",
  "job_title",
  "company_name",
  "bio",
  "phone",
  "whatsapp",
  "email",
  "website",
  "address",
  "maps_url",
  "accent_color",
  "theme",
  "avatar_path",
  "cover_path",
] as const;

export function buildSavePayload(
  draft: EditorDraft,
  baseline: { avatarPath: string; coverPath: string },
  newProfileId: string | null,
): UnifiedSavePayload {
  const profile: Record<string, string> = {};
  for (const key of PROFILE_VALUE_KEYS) profile[key] = draft.fields[key] ?? "";
  return {
    profile,
    previousAvatarPath: baseline.avatarPath,
    previousCoverPath: baseline.coverPath,
    newProfileId,
    template: draft.template,
    links: draft.links.map((l) => ({
      id: l.id,
      type: l.type,
      label: l.label,
      url: l.url,
      enabled: l.enabled,
      sort_order: l.sort_order,
    })),
    deletedLinkIds: [...draft.deletedLinkIds],
    sections: draft.sections.map((s) => ({
      id: s.id,
      type: s.type,
      position: s.position,
      enabled: s.enabled,
      settings: cleanSectionSettings(s.type, s.settings, draft),
    })),
    deletedSectionIds: [...draft.deletedSectionIds],
  };
}

/**
 * Phase 34.1 save-time hygiene: stale `primaryActions` refs (deleted or
 * disabled links, removed contact values) are cleaned before persistence.
 * Rendering never waits for this — the resolver ignores dead refs
 * immediately. Rows without the key stay byte-identical (zero churn for
 * legacy profiles); an emptied list drops the key (= legacy fallback).
 */
function cleanSectionSettings(
  type: string,
  settings: Record<string, unknown>,
  draft: EditorDraft,
): Record<string, unknown> {
  if (type !== "actions" || !("primaryActions" in settings)) return settings;
  // Draft-temp refs (links added but not yet saved) survive hygiene — the
  // unified save remaps them to real ids instead of dropping them.
  const tempRefs = readPrimaryRefs(settings.primaryActions, true).filter((ref) =>
    ref.startsWith("link:draft-"),
  );
  const cleaned = sanitizePrimaryRefs(settings.primaryActions, {
    phone: draft.fields.phone.trim() || null,
    whatsapp: draft.fields.whatsapp.trim() || null,
    email: draft.fields.email.trim() || null,
    website: draft.fields.website.trim() || null,
    links: draft.links,
  });
  const kept = [...tempRefs, ...cleaned.filter((ref) => !tempRefs.includes(ref))];
  if (kept.length === 0) {
    const { primaryActions: _dropped, ...rest } = settings;
    void _dropped;
    return rest;
  }
  return { ...settings, primaryActions: kept };
}

/* ------------------------------------------------------------------ */
/* Preview adapter — draft → the exact public shapes the real          */
/* renderer consumes. Unsaved keystrokes flow here with no save.       */
/* ------------------------------------------------------------------ */

export function draftAccent(draft: EditorDraft): string {
  return /^#[0-9a-f]{6}$/i.test(draft.fields.accent_color)
    ? draft.fields.accent_color
    : DEFAULT_ACCENT;
}

export function toPreviewData(
  draft: EditorDraft,
  input: { profileId: string; publicCode: string; slugFallback?: string },
): { profile: PublicProfile; links: PublicLink[]; sections: PublicSection[] } {
  const f = draft.fields;
  const trim = (v: string): string | null => (v.trim() === "" ? null : v.trim());
  const profile: PublicProfile = {
    id: input.profileId,
    profile_type: f.profile_type,
    slug: f.slug.trim() === "" ? (input.slugFallback ?? "profile") : f.slug.trim(),
    public_code: input.publicCode,
    display_name: f.display_name,
    job_title: trim(f.job_title),
    company_name: trim(f.company_name),
    bio: trim(f.bio),
    avatar_path: trim(f.avatar_path),
    cover_path: trim(f.cover_path),
    phone: trim(f.phone),
    whatsapp: trim(f.whatsapp),
    email: trim(f.email),
    website: trim(f.website),
    address: trim(f.address),
    maps_url: trim(f.maps_url),
    accent_color: draftAccent(draft),
    theme: f.theme,
  };
  // Phase 34.1: carry `enabled` so the shared resolver and the Connect
  // list drop disabled links exactly like the public loader does. The
  // extra flag is assignable to PublicLink everywhere downstream.
  const links: (PublicLink & { enabled: boolean })[] = [...draft.links]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((l, index) => ({
      id: l.id,
      type: l.type,
      label: l.label,
      url: l.url,
      sort_order: index,
      enabled: l.enabled,
    }));
  const sections: PublicSection[] = [...draft.sections]
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      id: s.id,
      type: s.type,
      position: s.position,
      enabled: s.enabled,
      settings: sanitizePublicSettings(s.type, s.settings),
    }));
  return { profile, links, sections };
}

/** Fresh section row for a draft add (defaults = current look, singleton-safe). */
export function newDraftSection(type: string, tempId: string, position: number): DraftSection {
  return {
    id: tempId,
    type,
    position,
    enabled: true,
    settings: defaultSectionSettings(type),
    isNew: true,
  };
}

/** Section settings lookup by type (Contact/Appearance integrations). */
export function draftSectionSettings(
  draft: EditorDraft,
  type: string,
): Record<string, unknown> | null {
  const row = draft.sections.find((s) => s.type === type);
  return row ? row.settings : null;
}

export function draftSectionId(draft: EditorDraft, type: string): string | null {
  return draft.sections.find((s) => s.type === type)?.id ?? null;
}
