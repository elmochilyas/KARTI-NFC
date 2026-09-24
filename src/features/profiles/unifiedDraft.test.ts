import { describe, expect, it } from "vitest";
import {
  buildSavePayload,
  draftReducer,
  draftSectionId,
  draftSectionSettings,
  EDITOR_STEPS,
  FIELD_STEPS,
  initDraft,
  isTempId,
  newDraftSection,
  suggestSlug,
  toPreviewData,
  type EditorDraft,
} from "./unifiedDraft";
import type { ProfileLinkRow, ProfileRow, ProfileSectionRow } from "./types";

const PROFILE = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  client_id: "223e4567-e89b-12d3-a456-426614174002",
  profile_type: "PERSON",
  slug: "ilyas",
  display_name: "Ilyas",
  job_title: "Developer",
  company_name: "Acme",
  bio: "Hello.",
  avatar_path: null,
  cover_path: null,
  phone: "+212600000000",
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: "#0e7c5b",
  theme: "light",
  status: "DRAFT",
} as unknown as ProfileRow;

const LINK = {
  id: "323e4567-e89b-12d3-a456-426614174003",
  profile_id: PROFILE.id,
  type: "instagram",
  label: "Instagram",
  url: "https://instagram.com/ilyas",
  icon: null,
  sort_order: 0,
  enabled: true,
} as unknown as ProfileLinkRow;

const SECTION = {
  id: "423e4567-e89b-12d3-a456-426614174004",
  profile_id: PROFILE.id,
  type: "hero",
  position: 1,
  enabled: true,
  settings: {},
} as unknown as ProfileSectionRow;

function seed(): EditorDraft {
  return initDraft({
    profile: PROFILE,
    clientName: "Ilyas",
    links: [LINK],
    sections: [SECTION],
    template: "personal",
  });
}

describe("unified draft init", () => {
  it("seeds fields, links, sections from server rows and starts clean", () => {
    const draft = seed();
    expect(draft.isNew).toBe(false);
    expect(draft.dirty).toBe(false);
    expect(draft.fields.display_name).toBe("Ilyas");
    expect(draft.links).toHaveLength(1);
    expect(draft.links[0].isNew).toBe(false);
    expect(draft.sections).toHaveLength(1);
    expect(draft.status).toBe("DRAFT");
  });

  it("starts a new profile from the client name", () => {
    const draft = initDraft({
      profile: null,
      clientName: "New Client",
      links: [],
      sections: [],
      template: "personal",
    });
    expect(draft.isNew).toBe(true);
    expect(draft.fields.display_name).toBe("New Client");
    expect(draft.fields.slug).toBe("new-client");
  });

  it("exposes six steps with sections between links and appearance", () => {
    expect(EDITOR_STEPS.map((s) => s.id)).toEqual([
      "identity",
      "contact",
      "links",
      "sections",
      "appearance",
      "review",
    ]);
    expect(FIELD_STEPS.links).toBe(2);
    expect(FIELD_STEPS.sections).toBe(3);
  });
});

describe("draft reducer", () => {
  it("marks fields dirty on edit", () => {
    const next = draftReducer(seed(), {
      type: "setField",
      field: "display_name",
      value: "Ilyas El Moch",
    });
    expect(next.fields.display_name).toBe("Ilyas El Moch");
    expect(next.dirty).toBe(true);
  });

  it("adds, moves, toggles and deletes links with renumbering", () => {
    let draft = seed();
    draft = draftReducer(draft, {
      type: "addLink",
      link: {
        id: "draft-1",
        type: "website",
        label: "Site",
        url: "https://example.com",
        icon: null,
        enabled: true,
        sort_order: 99,
        isNew: true,
      },
    });
    expect(draft.links.map((l) => l.sort_order)).toEqual([0, 1]);
    draft = draftReducer(draft, { type: "moveLink", id: "draft-1", direction: -1 });
    expect(draft.links[0].id).toBe("draft-1");
    draft = draftReducer(draft, { type: "toggleLink", id: LINK.id, enabled: false });
    expect(draft.links.find((l) => l.id === LINK.id)?.enabled).toBe(false);
    // Deleting a draft-new link records no server delete.
    draft = draftReducer(draft, { type: "deleteLink", id: "draft-1" });
    expect(draft.links).toHaveLength(1);
    expect(draft.deletedLinkIds).toEqual([]);
    // Deleting a persisted link records it for the unified save.
    draft = draftReducer(draft, { type: "deleteLink", id: LINK.id });
    expect(draft.links).toHaveLength(0);
    expect(draft.deletedLinkIds).toEqual([LINK.id]);
  });

  it("adds, reorders, configures and deletes sections", () => {
    let draft = seed();
    draft = draftReducer(draft, {
      type: "addSection",
      section: newDraftSection("gallery", "draft-s1", 99),
    });
    expect(draft.sections.map((s) => s.position)).toEqual([1, 2]);
    expect(draft.sections[1].settings).toEqual({ title: "Gallery", layout: "grid", images: [] });
    draft = draftReducer(draft, {
      type: "setSectionSettings",
      id: "draft-s1",
      settings: { title: "Photos", layout: "masonry", images: [] },
    });
    expect(draft.sections[1].settings).toEqual({
      title: "Photos",
      layout: "masonry",
      images: [],
    });
    draft = draftReducer(draft, { type: "toggleSection", id: SECTION.id, enabled: false });
    expect(draft.sections[0].enabled).toBe(false);
    draft = draftReducer(draft, { type: "deleteSection", id: "draft-s1" });
    expect(draft.sections).toHaveLength(1);
    expect(draft.deletedSectionIds).toEqual([]);
    draft = draftReducer(draft, { type: "deleteSection", id: SECTION.id });
    expect(draft.deletedSectionIds).toEqual([SECTION.id]);
  });

  it("applies an explicit section order and rejects foreign ids", () => {
    const draft = seed();
    const gallery = { ...newDraftSection("gallery", "draft-s1", 2), settings: {} };
    const withGallery = draftReducer(draft, { type: "addSection", section: gallery });
    const reordered = draftReducer(withGallery, {
      type: "setSectionOrder",
      ids: ["draft-s1", SECTION.id],
    });
    expect(reordered.sections.map((s) => s.id)).toEqual(["draft-s1", SECTION.id]);
    expect(reordered.sections.map((s) => s.position)).toEqual([1, 2]);
    expect(reordered.dirty).toBe(true);
    const rejected = draftReducer(withGallery, {
      type: "setSectionOrder",
      ids: ["draft-s1", "intruder"],
    });
    expect(rejected.sections.map((s) => s.id)).toEqual([SECTION.id, "draft-s1"]);
  });

  it("updates images and template", () => {
    let draft = seed();
    draft = draftReducer(draft, {
      type: "setAvatar",
      path: "profiles/x/avatar/abc.webp",
      previewUrl: "blob:1",
    });
    expect(draft.fields.avatar_path).toBe("profiles/x/avatar/abc.webp");
    expect(draft.avatarPreviewUrl).toBe("blob:1");
    draft = draftReducer(draft, { type: "removeAvatar" });
    expect(draft.fields.avatar_path).toBe("");
    expect(draft.avatarPreviewUrl).toBeNull();
    draft = draftReducer(draft, { type: "setTemplate", template: "business" });
    expect(draft.template).toBe("business");
    expect(draft.dirty).toBe(true);
  });

  it("rebase preserves primary-action settings across save/reload", () => {
    const settings = { showQuickTiles: true, primaryActions: ["call"], maxQuickActions: 2 };
    const actionsRow = {
      id: "523e4567-e89b-12d3-a456-426614174005",
      profile_id: PROFILE.id,
      type: "actions",
      position: 2,
      enabled: true,
      settings,
    } as unknown as ProfileSectionRow;
    const dirty = draftReducer(seed(), {
      type: "setField",
      field: "display_name",
      value: "Ilyas El Moch",
    });
    const rebased = draftReducer(dirty, {
      type: "rebase",
      profile: PROFILE,
      links: [LINK],
      sections: [SECTION, actionsRow],
    });
    expect(rebased.dirty).toBe(false);
    expect(rebased.sections.find((s) => s.type === "actions")?.settings).toEqual(settings);
  });

  it("rebases cleanly after save", () => {
    const dirty = draftReducer(seed(), {
      type: "setField",
      field: "display_name",
      value: "Ilyas El Moch",
    });
    const rebased = draftReducer(dirty, {
      type: "rebase",
      profile: { ...PROFILE, display_name: "Ilyas El Moch" } as ProfileRow,
      links: [LINK],
      sections: [SECTION],
    });
    expect(rebased.dirty).toBe(false);
    expect(rebased.fields.display_name).toBe("Ilyas El Moch");
    expect(rebased.isNew).toBe(false);
  });
});

describe("save payload", () => {
  it("carries full end-state plus explicit deletes", () => {
    const draft = draftReducer(seed(), {
      type: "setField",
      field: "display_name",
      value: "Ilyas El Moch",
    });
    const payload = buildSavePayload(draft, { avatarPath: "", coverPath: "" }, null);
    expect(payload.profile.display_name).toBe("Ilyas El Moch");
    expect(payload.profile.avatar_path).toBe("");
    expect(payload.links).toHaveLength(1);
    expect(payload.links[0]).toMatchObject({ id: LINK.id, sort_order: 0 });
    expect(payload.deletedLinkIds).toEqual([]);
    expect(payload.sections).toHaveLength(1);
    expect(payload.template).toBe("personal");
  });
});

describe("preview adapter", () => {
  it("maps unsaved keystrokes into public shapes with sanitized settings", () => {
    let draft = seed();
    draft = draftReducer(draft, {
      type: "setField",
      field: "display_name",
      value: "Ilyas El Moch",
    });
    draft = draftReducer(draft, {
      type: "setSectionSettings",
      id: SECTION.id,
      settings: { showTagline: false, showCategory: true, smuggled: "x" },
    });
    const { profile, links, sections } = toPreviewData(draft, {
      profileId: PROFILE.id,
      publicCode: "CODE123456",
    });
    expect(profile.display_name).toBe("Ilyas El Moch");
    expect(profile.public_code).toBe("CODE123456");
    expect(links).toHaveLength(1);
    // Hostile keys never reach the renderer.
    expect(sections[0].settings).toEqual({ showTagline: false, showCategory: true });
  });

  it("falls back to a safe accent on hostile input", () => {
    let draft = seed();
    draft = draftReducer(draft, { type: "setField", field: "accent_color", value: "red" });
    const { profile } = toPreviewData(draft, { profileId: PROFILE.id, publicCode: "" });
    expect(profile.accent_color).toBe("#0e7c5b");
  });
});

describe("primary-actions save hygiene", () => {
  const ACTIONS_ID = "523e4567-e89b-12d3-a456-426614174005";
  const LINK_ID = "323e4567-e89b-12d3-a456-426614174003";

  function draftWithActions(settings: Record<string, unknown>): EditorDraft {
    const base = seed();
    return {
      ...base,
      links: [
        {
          id: LINK_ID,
          type: "instagram",
          label: "Instagram",
          url: "https://instagram.com/ilyas",
          icon: null,
          enabled: true,
          sort_order: 0,
          isNew: false,
        },
      ],
      sections: [
        ...base.sections,
        {
          id: ACTIONS_ID,
          type: "actions",
          position: 2,
          enabled: true,
          settings,
          isNew: false,
        },
      ],
    };
  }

  function actionsPayload(draft: EditorDraft): Record<string, unknown> {
    const payload = buildSavePayload(draft, { avatarPath: "", coverPath: "" }, null);
    const row = payload.sections.find((s) => s.type === "actions");
    if (!row) throw new Error("actions section missing from payload");
    return row.settings;
  }

  it("cleans stale refs but keeps resolvable and temp refs", () => {
    const draft = draftWithActions({
      showQuickTiles: true,
      primaryActions: [
        "call",
        `link:${LINK_ID}`,
        "link:623e4567-e89b-12d3-a456-426614174006",
        "teleport",
        "link:draft-1",
      ],
    });
    expect(actionsPayload(draft)).toEqual({
      showQuickTiles: true,
      primaryActions: ["link:draft-1", "call", `link:${LINK_ID}`],
    });
  });

  it("drops the key when nothing resolvable remains", () => {
    const draft = draftWithActions({
      showQuickTiles: true,
      primaryActions: ["email", "link:623e4567-e89b-12d3-a456-426614174006"],
    });
    expect(actionsPayload(draft)).toEqual({ showQuickTiles: true });
  });

  it("leaves legacy rows without the key byte-identical", () => {
    const settings = { showQuickTiles: true, showAbout: true };
    const draft = draftWithActions(settings);
    const payload = buildSavePayload(draft, { avatarPath: "", coverPath: "" }, null);
    const row = payload.sections.find((s) => s.type === "actions");
    expect(row?.settings).toBe(settings);
  });
});

describe("draft helpers", () => {
  it("detects temp ids and resolves settings by type", () => {
    expect(isTempId("draft-3")).toBe(true);
    expect(isTempId(LINK.id)).toBe(false);
    expect(suggestSlug("  Ahmed Benali ")).toBe("ahmed-benali");
    expect(suggestSlug("!!!")).toBe("profile");
    const draft = seed();
    expect(draftSectionSettings(draft, "hero")).toEqual({});
    expect(draftSectionSettings(draft, "gallery")).toBeNull();
    expect(draftSectionId(draft, "hero")).toBe(SECTION.id);
    expect(draftSectionId(draft, "gallery")).toBeNull();
  });
});
