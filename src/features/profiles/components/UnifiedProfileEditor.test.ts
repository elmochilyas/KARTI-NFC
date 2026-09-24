import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactNode } from "react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => createElement("img", props),
}));

// next/navigation is app-router only; markup tests stub useRouter.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

// The editor calls server actions (which pull server-only modules via the
// public-cache/admin chain). Markup tests stub the action boundary.
vi.mock("@/app/dashboard/clients/[id]/profile/actions", () => ({
  saveUnifiedDraftAction: vi.fn(),
  setStatusAction: vi.fn(),
  uploadAssetAction: vi.fn(),
  uploadSectionImageAction: vi.fn(),
  uploadDocumentAction: vi.fn(),
  ensureSectionsAction: vi.fn(),
  updateTemplateAction: vi.fn(),
}));

import {
  UnifiedEditorContext,
  UnifiedProfileEditor,
  type EditorContextValue,
} from "./UnifiedProfileEditor";
import { IdentityStep } from "./unified/IdentityStep";
import { ContactStep } from "./unified/ContactStep";
import { LinksStep } from "./unified/LinksStep";
import { SectionsStep } from "./unified/SectionsStep";
import { AppearanceStep } from "./unified/AppearanceStep";
import { ReviewStep } from "./unified/ReviewStep";
import { BuilderPreview } from "@/components/public-profile/BuilderPreview";
import { resolvePrimaryActions } from "@/components/public-profile/brandIcons";
import { computeCompletion } from "../completion";
import { initDraft, toPreviewData } from "../unifiedDraft";
import type { ProfileLinkRow, ProfileRow, ProfileSectionRow } from "../types";

const PROFILE = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  client_id: "223e4567-e89b-12d3-a456-426614174002",
  profile_type: "PERSON",
  slug: "ilyas",
  public_code: "ABCD234567",
  display_name: "Ilyas",
  job_title: "Developer",
  company_name: "Acme",
  bio: "Hello.",
  avatar_path: null,
  cover_path: null,
  phone: "+212600000000",
  whatsapp: null,
  email: "ilyas@example.com",
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

function section(id: string, type: string, position: number): ProfileSectionRow {
  return {
    id,
    profile_id: PROFILE.id,
    type,
    position,
    enabled: true,
    settings: {},
  } as unknown as ProfileSectionRow;
}

const SECTIONS = [
  section("423e4567-e89b-12d3-a456-426614174004", "hero", 1),
  section("523e4567-e89b-12d3-a456-426614174005", "actions", 2),
  section("623e4567-e89b-12d3-a456-426614174006", "links", 3),
];

function editorHtml(profile: ProfileRow | null): string {
  return renderToStaticMarkup(
    createElement(UnifiedProfileEditor, {
      clientId: PROFILE.client_id,
      clientName: "Ilyas Client",
      profile,
      links: profile ? [LINK] : [],
      sections: profile ? SECTIONS : [],
      template: "personal",
      newProfileId: profile ? null : "723e4567-e89b-12d3-a456-426614174007",
      initialAvatarUrl: null,
      initialCoverUrl: null,
      justCreated: false,
      appUrl: "https://karti.app",
      publicCode: "ABCD234567",
    }),
  );
}

const LINK_TWO = {
  id: "723e4567-e89b-12d3-a456-426614174007",
  profile_id: PROFILE.id,
  type: "linkedin",
  label: "LinkedIn",
  url: "https://linkedin.com/in/ilyas",
  icon: null,
  sort_order: 1,
  enabled: true,
} as unknown as ProfileLinkRow;

function withDraft(
  node: ReactNode,
  isNew = false,
  overrides: {
    links?: ProfileLinkRow[];
    actionsSettings?: Record<string, unknown>;
    sections?: ProfileSectionRow[];
    saveState?: { saving: boolean; saved: boolean; error: string | null; sectionId?: string };
  } = {},
): string {
  const links = overrides.links ?? (isNew ? [] : [LINK]);
  const baseSections = overrides.sections ?? SECTIONS;
  const sections =
    overrides.actionsSettings && !isNew
      ? baseSections.map((s) =>
          s.type === "actions"
            ? { ...s, settings: overrides.actionsSettings as Record<string, unknown> }
            : s,
        )
      : isNew && !overrides.sections
        ? []
        : baseSections;
  const draft = initDraft({
    profile: isNew ? null : PROFILE,
    clientName: "Ilyas Client",
    links,
    sections: sections as typeof SECTIONS,
    template: "personal",
  });
  const value: EditorContextValue = {
    draft,
    dispatch: () => {},
    clientId: PROFILE.client_id,
    clientName: "Ilyas Client",
    profileId: isNew ? null : PROFILE.id,
    newProfileId: isNew ? "723e4567-e89b-12d3-a456-426614174007" : null,
    appUrl: "https://karti.app",
    avatarUrl: null,
    coverUrl: null,
    publicCode: "ABCD234567",
    justCreated: false,
    sectionsAvailable: true,
    saveState: overrides.saveState ?? { saving: false, saved: false, error: null },
    save: () => {},
    tempId: () => "draft-test",
    step: 0,
    setStep: () => {},
  };
  return renderToStaticMarkup(createElement(UnifiedEditorContext.Provider, { value }, node));
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

describe("UnifiedProfileEditor", () => {
  it("renders exactly ONE preview on the page", () => {
    const html = editorHtml(PROFILE);
    expect(count(html, 'aria-label="Mobile preview"')).toBe(1);
    expect(html).toContain("Phone preview");
    // No scattered per-area saves: one Save draft in the footer.
    expect(html).not.toContain("Save settings");
  });

  it("renders one navigation model with six steps", () => {
    const html = editorHtml(PROFILE);
    for (const label of ["Identity", "Contact", "Links", "Sections", "Appearance", "Review"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-label="Profile steps"');
  });

  it("shows a compact header with status and progress, not page-level cards", () => {
    const html = editorHtml(PROFILE);
    expect(html).toContain("Edit Profile");
    expect(html).toContain("% complete");
    expect(html).not.toContain("Which preset this profile was built from");
    expect(html).not.toContain("Order, visibility and settings of the public profile blocks");
  });

  it("puts the template picker in Identity for new profiles", () => {
    const html = editorHtml(null);
    expect(html).toContain("Preloads the profile with a section set");
    expect(html).toContain("Create profile");
  });

  it("keeps the template reference inside Identity for existing profiles", () => {
    const html = editorHtml(PROFILE);
    expect(html).toContain("Save template");
    expect(html).toContain("Identity");
  });

  it("tracks dirty state in the header", () => {
    const html = editorHtml(PROFILE);
    expect(html).toContain("No unsaved changes");
    expect(html).not.toContain(">Unsaved changes<");
  });

  it("has no Edit/Preview tabs — the sheet is the only mobile preview path", () => {
    const html = editorHtml(PROFILE);
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain("Editor view");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("Preview");
    // Sheet closed by default: still exactly one preview renderer.
    expect(count(html, 'aria-label="Mobile preview"')).toBe(1);
  });
});

describe("unified steps", () => {
  it("Identity owns profile type, naming, slug, bio and images", () => {
    const html = withDraft(createElement(IdentityStep));
    expect(html).toContain("Profile type");
    expect(html).toContain("Public slug");
    expect(html).toContain("Display name");
    expect(html).toContain("Short bio");
    expect(html).toContain("Profile Photo");
    expect(html).toContain("Cover Image");
  });

  it("Contact integrates contact data with explicit primary-action configuration", () => {
    const html = withDraft(createElement(ContactStep));
    expect(html).toContain("Primary actions");
    expect(html).toContain("Show first");
    expect(html).toContain("Presets for Quick actions");
    expect(html).toContain("WhatsApp");
    // No explicit order yet: legacy fallback hint, segmented 1–4 control.
    expect(html).toContain("No explicit order");
    expect(html).toContain("Show first 4 actions");
  });

  it("Contact renders the explicit primary order as cards", () => {
    const html = withDraft(createElement(ContactStep), false, {
      links: [LINK, LINK_TWO],
      actionsSettings: {
        showQuickTiles: true,
        primaryActions: ["call", `link:${LINK_TWO.id}`],
        maxQuickActions: 2,
      },
    });
    expect(html).toContain("Primary actions in order");
    expect(html).toContain("Move Call up");
    expect(html).toContain("Remove Call from primary actions");
    // Non-primary available link offers featuring; unavailable built-in hints.
    expect(html).toContain("Feature Instagram as a primary action");
    expect(html).toContain("Add a WhatsApp number to enable");
    // Segmented count reflects the stored maximum.
    expect(html).toContain("Show first 2 actions");
    expect(html).toContain('aria-pressed="true"');
  });

  it("preview and public renderer resolve the same primary order", () => {
    const actionsSettings = {
      showQuickTiles: true,
      primaryActions: [`link:${LINK_TWO.id}`, "call"],
      maxQuickActions: 2,
    };
    const draft = initDraft({
      profile: PROFILE,
      clientName: "Ilyas Client",
      links: [LINK, LINK_TWO],
      sections: SECTIONS.map((s) =>
        s.type === "actions" ? { ...s, settings: actionsSettings } : s,
      ) as typeof SECTIONS,
      template: "personal",
    });
    const preview = toPreviewData(draft, { profileId: PROFILE.id, publicCode: "ABCD234567" });
    const html = renderToStaticMarkup(
      createElement(BuilderPreview, {
        profile: preview.profile,
        links: preview.links,
        sections: preview.sections,
        avatarUrl: null,
        coverUrl: null,
      }),
    );
    // Same shared resolver over the same data: identical order.
    const { actions } = resolvePrimaryActions({
      phone: PROFILE.phone,
      whatsapp: PROFILE.whatsapp,
      email: PROFILE.email,
      website: PROFILE.website,
      links: preview.links,
      limit: 2,
      primaryActions: actionsSettings.primaryActions,
    });
    expect(actions.map((a) => a.label)).toEqual(["LinkedIn", "Call"]);
    const linkedIn = html.indexOf("LinkedIn");
    const call = html.indexOf("Call — Tap to call");
    expect(linkedIn).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(-1);
    expect(linkedIn).toBeLessThan(call);
  });

  it("Links is the complete link manager", () => {
    const html = withDraft(createElement(LinksStep));
    expect(html).toContain("Add Link");
    expect(html).toContain("Instagram");
    expect(html).toContain("Link display settings");
  });

  it("Sections manages content blocks with page order and no core duplicates", () => {
    const html = withDraft(createElement(SectionsStep));
    expect(html).toContain("Add section");
    expect(html).toContain("Page order");
    expect(html).toContain("Always first");
    // Core sections render as compact order rows pointing at their steps…
    expect(html).toContain("Go there");
    // …never as full content cards with Remove affordances.
    expect(html).not.toContain("Confirm remove");
    expect(html).not.toContain("Remove");
  });

  it("Sections content cards configure inline with presets and remove", () => {
    const gallery = {
      id: "823e4567-e89b-12d3-a456-426614174008",
      profile_id: PROFILE.id,
      type: "gallery",
      position: 4,
      enabled: true,
      settings: {},
    } as unknown as ProfileSectionRow;
    const html = withDraft(createElement(SectionsStep), false, {
      sections: [...SECTIONS, gallery],
    });
    expect(html).toContain("Configure");
    expect(html).toContain("Remove Gallery from this profile");
    expect(html).toContain("media · Position 4 · Visible");
  });

  it("Sections surfaces a failed save beside the offending card", () => {
    const galleryId = "823e4567-e89b-12d3-a456-426614174008";
    const gallery = {
      id: galleryId,
      profile_id: PROFILE.id,
      type: "gallery",
      position: 4,
      enabled: true,
      settings: {},
    } as unknown as ProfileSectionRow;
    const html = withDraft(createElement(SectionsStep), false, {
      sections: [...SECTIONS, gallery],
      saveState: {
        saving: false,
        saved: false,
        error: "“Gallery” settings are invalid",
        sectionId: galleryId,
      },
    });
    // Card expands with the message inline (banner stays in the shell).
    expect(html).toContain("“Gallery” settings are invalid");
    expect(html).toContain("Collapse");
    expect(html).toContain("Add photo slot");
    expect(html).toContain("Presets for Gallery");
  });

  it("Appearance controls presentation only", () => {
    const html = withDraft(createElement(AppearanceStep));
    expect(html).toContain("Accent color");
    expect(html).toContain("Theme");
    expect(html).toContain("Section styles");
  });

  it("Review holds completion, public link, status and NFC entry points", () => {
    const draft = initDraft({
      profile: PROFILE,
      clientName: "Ilyas Client",
      links: [LINK],
      sections: SECTIONS,
      template: "personal",
    });
    const completion = computeCompletion(
      {
        display_name: draft.fields.display_name,
        avatar_path: null,
        cover_path: null,
        phone: draft.fields.phone || null,
        whatsapp: null,
        email: null,
        website: null,
        bio: null,
        status: "DRAFT",
      },
      [{ enabled: true }],
      [],
    );
    const html = withDraft(createElement(ReviewStep, { completion }));
    expect(html).toContain("Profile completion");
    expect(html).toContain('aria-label="Profile link"');
    expect(html).toContain('aria-label="Status"');
    expect(html).toContain("NFC card");
    expect(html).toContain("Get your profile live");
  });
});
