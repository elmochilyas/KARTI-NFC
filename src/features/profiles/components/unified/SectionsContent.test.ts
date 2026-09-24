import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => createElement("img", props),
}));

import { ProfileSectionRenderer } from "@/components/public-profile/ProfileSections";
import type { PublicProfile } from "@/features/profiles/public";
import { getCatalogEntry } from "../../sectionCatalog";
import { defaultSectionSettings } from "../../sectionSettings";
import {
  draftReducer,
  initDraft,
  newDraftSection,
  toPreviewData,
  type EditorDraft,
} from "../../unifiedDraft";
import { planSectionsDiff } from "../../unifiedSavePlan";
import type { ProfileRow, ProfileSectionRow } from "../../types";
import { SectionSettingsRenderer } from "../section-settings/SectionSettingsRenderer";

const PROFILE = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  client_id: "223e4567-e89b-12d3-a456-426614174002",
  profile_type: "BUSINESS",
  slug: "cafe-atlas",
  public_code: "ABCD234567",
  display_name: "Café Atlas",
  job_title: "Restaurant",
  company_name: "Café Atlas",
  bio: null,
  avatar_path: null,
  cover_path: null,
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: "#0e7c5b",
  theme: "light",
  status: "DRAFT",
} as unknown as ProfileRow;

const PREVIEW_PROFILE: PublicProfile = {
  id: PROFILE.id,
  profile_type: "BUSINESS",
  slug: "cafe-atlas",
  public_code: "ABCD234567",
  display_name: "Café Atlas",
  job_title: "Restaurant",
  company_name: "Café Atlas",
  bio: null,
  avatar_path: null,
  cover_path: null,
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: "#0e7c5b",
  theme: "light",
};

const CLIENT_UUID = "223e4567-e89b-12d3-a456-426614174002";
const HEX16 = "abcdef1234567890";

type MatrixEntry = {
  type: string;
  settings: Record<string, unknown>;
  emptySettings: Record<string, unknown>;
  expectLive: string[];
  placeholderHint: string;
  heading: string;
};

const MATRIX: MatrixEntry[] = [
  {
    type: "location",
    settings: {
      title: "Visit us",
      address: "Agadir",
      latitude: 30.42,
      longitude: -9.6,
      mapsUrl: null,
      mapZoom: 15,
      showMap: true,
      buttonLabel: "Get Directions",
    },
    emptySettings: {},
    expectLive: ["Agadir", "openstreetmap.org/export/embed.html", "Get Directions"],
    placeholderHint: "Add an address to preview",
    heading: "Visit us",
  },
  {
    type: "opening_hours",
    settings: {
      timezone: "Africa/Casablanca",
      days: Array.from({ length: 7 }, (_, day) => ({
        day,
        closed: day !== 1,
        open: day === 1 ? "09:00" : null,
        close: day === 1 ? "18:00" : null,
      })),
    },
    emptySettings: { timezone: "UTC", days: [] },
    expectLive: ["Monday", "09:00"],
    placeholderHint: "Add your business hours",
    heading: "Opening Hours",
  },
  {
    type: "menu",
    settings: {
      title: "Our Menu",
      currency: "MAD",
      layout: "cards",
      categories: [
        {
          id: "c1",
          name: "Mains",
          items: [
            {
              id: "i1",
              image: "",
              name: "Tagine",
              description: "Slow-cooked",
              price: 60,
              available: true,
            },
          ],
        },
      ],
    },
    emptySettings: {},
    expectLive: ["Tagine", "60 MAD"],
    placeholderHint: "Add your first menu item",
    heading: "Our Menu",
  },
  {
    type: "catalog",
    settings: {
      title: "Products",
      currency: "MAD",
      categories: [
        {
          id: "c1",
          name: "Goods",
          items: [
            { id: "i1", image: "", name: "Lamp", description: "", price: 120, available: true },
          ],
        },
      ],
    },
    emptySettings: {},
    expectLive: ["Lamp", "120 MAD"],
    placeholderHint: "Add your first product",
    heading: "Products",
  },
  {
    type: "about",
    settings: { title: "About", content: "Hello world" },
    emptySettings: {},
    expectLive: ["Hello world"],
    placeholderHint: "Write your introduction",
    heading: "About",
  },
  {
    type: "experience",
    settings: {
      title: "Experience",
      jobs: [
        {
          id: "j1",
          company: "Acme",
          role: "Dev",
          startDate: "2020-01",
          endDate: null,
          description: "",
        },
      ],
    },
    emptySettings: {},
    expectLive: ["Acme", "Present"],
    placeholderHint: "Add your first experience",
    heading: "Experience",
  },
  {
    type: "cv",
    settings: {
      title: "CV",
      label: "Download CV",
      file: `${CLIENT_UUID}/sections/cv/${HEX16}.pdf`,
    },
    emptySettings: {},
    expectLive: ["Download CV"],
    placeholderHint: "Upload your CV",
    heading: "CV",
  },
  {
    type: "gallery",
    settings: {
      title: "Gallery",
      layout: "grid",
      images: [{ id: "g1", image: `${CLIENT_UUID}/sections/gallery/${HEX16}.webp`, alt: "Sunset" }],
    },
    emptySettings: {},
    expectLive: ["Sunset"],
    placeholderHint: "Add your first photo",
    heading: "Gallery",
  },
];

function draftWithSection(type: string, settings: Record<string, unknown>): EditorDraft {
  let draft = initDraft({
    profile: PROFILE,
    clientName: "Café Atlas",
    links: [],
    sections: [],
    template: "business",
  });
  draft = draftReducer(draft, { type: "addSection", section: newDraftSection(type, "draft-x", 1) });
  draft = draftReducer(draft, { type: "setSectionSettings", id: "draft-x", settings });
  return draft;
}

function renderSections(
  sections: {
    id: string;
    type: string;
    position: number;
    enabled: boolean;
    settings: Record<string, unknown>;
  }[],
  previewPlaceholders?: boolean,
): string {
  return renderToStaticMarkup(
    createElement(ProfileSectionRenderer, {
      profile: PREVIEW_PROFILE,
      links: [],
      avatarUrl: null,
      coverUrl: null,
      sections: sections.map((s) => ({ ...s })),
      previewPlaceholders,
    }),
  );
}

describe("content editors are draft-live with no save buttons", () => {
  it.each([
    "hero",
    "actions",
    "links",
    "location",
    "opening_hours",
    "menu",
    "catalog",
    "about",
    "experience",
    "cv",
    "gallery",
  ])("%s editor renders without a Save settings button", (type) => {
    const entry = getCatalogEntry(type);
    expect(entry?.settingsComponent).not.toBeNull();
    const html = renderToStaticMarkup(
      createElement(SectionSettingsRenderer, {
        type,
        settings: defaultSectionSettings(type),
        pending: false,
        onSave: () => {},
        onChange: () => {},
      }),
    );
    expect(html).not.toContain("Save settings");
  });
});

describe("section defaults on add", () => {
  it.each(["location", "opening_hours", "menu", "catalog", "about", "experience", "cv", "gallery"])(
    "%s instantiates meaningful schema defaults, never bare {}",
    (type) => {
      const defaults = defaultSectionSettings(type);
      expect(Object.keys(defaults).length).toBeGreaterThan(0);
      const draft = draftReducer(
        initDraft({
          profile: PROFILE,
          clientName: "Café Atlas",
          links: [],
          sections: [],
          template: "business",
        }),
        { type: "addSection", section: newDraftSection(type, "draft-x", 1) },
      );
      // addSection path in the step uses the same helper; parity asserted
      // through the shared constructor (no divergence possible).
      expect(draft.sections[0].settings).toEqual(defaults);
      expect(draft.dirty).toBe(true);
    },
  );
});

describe("content section matrix: edit → preview → save → reload", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyz.supabase.co";

  it.each(MATRIX.map((m) => [m.type, m] as const))(
    "%s draft edits render live in preview",
    (_type, entry) => {
      const draft = draftWithSection(entry.type, entry.settings);
      const preview = toPreviewData(draft, { profileId: PROFILE.id, publicCode: "ABCD234567" });
      const html = renderToStaticMarkup(
        createElement(ProfileSectionRenderer, {
          profile: preview.profile,
          links: preview.links,
          avatarUrl: null,
          coverUrl: null,
          sections: preview.sections,
          previewPlaceholders: true,
        }),
      );
      for (const snippet of entry.expectLive) expect(html).toContain(snippet);
    },
  );

  it.each(MATRIX.map((m) => [m.type, m] as const))(
    "%s collapses publicly when empty",
    (_type, entry) => {
      const html = renderSections([
        { id: "s1", type: entry.type, position: 1, enabled: true, settings: entry.emptySettings },
      ]);
      expect(html).not.toContain(entry.heading);
      expect(html).not.toContain(entry.placeholderHint);
    },
  );

  it.each(MATRIX.map((m) => [m.type, m] as const))(
    "%s shows admin guidance instead",
    (_type, entry) => {
      const html = renderSections(
        [{ id: "s1", type: entry.type, position: 1, enabled: true, settings: entry.emptySettings }],
        true,
      );
      expect(html).toContain(entry.placeholderHint);
    },
  );

  it.each(MATRIX.map((m) => [m.type, m] as const))(
    "%s save plan carries settings and reload preserves them",
    (_type, entry) => {
      const planned = planSectionsDiff(
        [],
        [{ id: "draft-x", type: entry.type, position: 1, enabled: true, settings: entry.settings }],
        [],
      );
      expect(planned.ok).toBe(true);
      if (!planned.ok) return;
      expect(planned.plan.adds).toHaveLength(1);
      expect(planned.plan.adds[0].settings).toEqual(entry.settings);

      const row = {
        id: "523e4567-e89b-12d3-a456-426614174005",
        profile_id: PROFILE.id,
        type: entry.type,
        position: 1,
        enabled: true,
        settings: entry.settings,
      } as unknown as ProfileSectionRow;
      const rebased = draftReducer(draftWithSection(entry.type, entry.settings), {
        type: "rebase",
        profile: PROFILE,
        links: [],
        sections: [row],
      });
      expect(rebased.dirty).toBe(false);
      expect(rebased.sections).toHaveLength(1);
      expect(rebased.sections[0].settings).toEqual(entry.settings);
    },
  );

  it("restores the public asset host", () => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  });
});

describe("section ordering in draft", () => {
  it("setSectionOrder reorders and renumbers", () => {
    let draft = initDraft({
      profile: PROFILE,
      clientName: "Café Atlas",
      links: [],
      sections: [],
      template: "business",
    });
    draft = draftReducer(draft, {
      type: "addSection",
      section: newDraftSection("about", "draft-a", 1),
    });
    draft = draftReducer(draft, {
      type: "addSection",
      section: newDraftSection("gallery", "draft-g", 2),
    });
    draft = draftReducer(draft, { type: "setSectionOrder", ids: ["draft-g", "draft-a"] });
    expect(draft.sections.map((s) => s.id)).toEqual(["draft-g", "draft-a"]);
    expect(draft.sections.map((s) => s.position)).toEqual([1, 2]);
    expect(draft.dirty).toBe(true);
  });
});
