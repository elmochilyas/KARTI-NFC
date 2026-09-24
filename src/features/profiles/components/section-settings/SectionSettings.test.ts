import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

// The location editor calls a server action (server-only chain). Markup
// tests stub the action boundary.
vi.mock("@/app/dashboard/clients/[id]/profile/actions", () => ({
  saveUnifiedDraftAction: vi.fn(),
  setStatusAction: vi.fn(),
  uploadAssetAction: vi.fn(),
  uploadSectionImageAction: vi.fn(),
  uploadDocumentAction: vi.fn(),
  ensureSectionsAction: vi.fn(),
  updateTemplateAction: vi.fn(),
  resolveMapsLinkAction: vi.fn(),
}));

import { SectionSettingsRenderer } from "./SectionSettingsRenderer";
import { CatalogSettingsEditor, MenuSettingsEditor } from "./CollectionEditor";

function render(type: string, settings: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(SectionSettingsRenderer, {
      type,
      settings,
      pending: false,
      onSave: () => {},
    }),
  );
}

describe("SectionSettingsRenderer", () => {
  it("loads the hero editor with tagline and category toggles and no save button", () => {
    const html = render("hero");
    expect(html).toContain("Tagline");
    expect(html).toContain("Category pill");
    expect(html).not.toContain("Save settings");
  });

  it("loads the actions editor with tiles and about toggles", () => {
    const html = render("actions");
    expect(html).toContain("Quick action tiles");
    expect(html).toContain("About block");
  });

  it("loads the links editor with the subtitles toggle", () => {
    const html = render("links", { showSubtitles: false });
    expect(html).toContain("Link subtitles");
  });

  it("loads the link-only location editor without technical fields", () => {
    const html = render("location");
    expect(html).toContain("Map link");
    expect(html).toContain("Google Maps, Apple Maps or OpenStreetMap");
    expect(html).toContain("Address / label");
    expect(html).toContain("Show map");
    expect(html).not.toContain("Latitude");
    expect(html).not.toContain("Longitude");
    expect(html).not.toContain("Map zoom");
  });

  it("reflects stored values in toggle states", () => {
    const html = render("links", { showSubtitles: false });
    // Unchecked checkbox renders without the checked attribute.
    expect(html).not.toMatch(/<input[^>]*checked/);
    const checked = render("links", { showSubtitles: true });
    expect(checked).toMatch(/<input[^>]*checked/);
  });

  it("renders nothing for unknown types", () => {
    expect(render("teleport")).toBe("");
  });

  it("loads the personal editors", () => {
    expect(render("about")).toContain("Content");
    expect(render("experience")).toContain("Add job");
    expect(render("cv")).toContain("Upload PDF");
    expect(render("gallery")).toContain("Add photo slot");
  });
});

describe("Collection editors", () => {
  it("menu editor shows title, currency and category controls with no save button", () => {
    const html = renderToStaticMarkup(
      createElement(MenuSettingsEditor, {
        settings: {},
        pending: false,
        onSave: () => {},
        onChange: () => {},
      }),
    );
    expect(html).toContain("Title");
    expect(html).toContain("Currency");
    expect(html).toContain("Add category");
    expect(html).not.toContain("Save settings");
  });

  it("catalog editor renders existing categories and items without JSON", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogSettingsEditor, {
        settings: {
          title: "Products",
          currency: "MAD",
          categories: [
            {
              id: "cat-e",
              name: "Electronics",
              items: [
                {
                  id: "p1",
                  image: "",
                  name: "Headphones",
                  description: "",
                  price: 299,
                  available: true,
                },
              ],
            },
          ],
        },
        pending: false,
        onSave: () => {},
      }),
    );
    expect(html).toContain("Electronics");
    expect(html).toContain("Headphones");
    expect(html).not.toContain("{");
  });
});
