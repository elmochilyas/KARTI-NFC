import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { moveSectionId } from "../sectionCatalog";
import { AddSectionModal } from "./AddSectionModal";

describe("moveSectionId (shared drag + button order helper)", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves an id to the target index", () => {
    expect(moveSectionId(ids, "c", 0)).toEqual(["c", "a", "b", "d"]);
    expect(moveSectionId(ids, "a", 3)).toEqual(["b", "c", "d", "a"]);
  });

  it("clamps out-of-range targets", () => {
    expect(moveSectionId(ids, "b", 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveSectionId(ids, "c", -5)).toEqual(["c", "a", "b", "d"]);
  });

  it("is a no-op for unknown ids and same-position moves", () => {
    expect(moveSectionId(ids, "zzz", 0)).toEqual(ids);
    expect(moveSectionId(ids, "b", 1)).toEqual(ids);
  });

  it("never mutates the input", () => {
    const input = [...ids];
    moveSectionId(input, "a", 3);
    expect(input).toEqual(ids);
  });
});

describe("AddSectionModal catalog", () => {
  function render(added: string[] = ["hero", "actions", "links"], profileType = "PERSON"): string {
    return renderToStaticMarkup(
      createElement(AddSectionModal, {
        open: true,
        onClose: () => {},
        addedTypes: new Set(added),
        profileType,
        pending: false,
        onAdd: () => {},
      }),
    );
  }

  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      createElement(AddSectionModal, {
        open: false,
        onClose: () => {},
        addedTypes: new Set<string>(),
        profileType: "PERSON",
        pending: false,
        onAdd: () => {},
      }),
    );
    expect(html).toBe("");
  });

  it("groups Business, Personal and Media catalogs", () => {
    const html = render();
    expect(html).toContain("Business");
    expect(html).toContain("Personal");
    expect(html).toContain("Media");
    for (const label of [
      "Location",
      "Opening Hours",
      "Menu",
      "Catalog",
      "About",
      "CV",
      "Experience",
      "Gallery",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("marks every entry actionable with no Coming-soon remainder", () => {
    const html = render();
    expect(html).toContain("Added");
    expect(html).not.toContain("Coming soon");
  });

  it("stays accessible: dialog label, close control, list semantics", () => {
    const html = render();
    expect(html).toContain('aria-label="Add a section"');
    expect(html).toContain('aria-label="Close"');
  });

  it("badges audience-incompatible entries per profile type", () => {
    const person = render(["hero", "actions", "links"], "PERSON");
    expect(person).toContain("Business only");
    expect(person).not.toContain("Personal only");
    const business = render(["hero", "actions", "links"], "BUSINESS");
    expect(business).toContain("Personal only");
    expect(business).not.toContain("Business only");
  });

  it("offers Add for live compatible types not yet on the profile", () => {
    const html = render(["hero", "actions", "links"], "BUSINESS");
    expect(html).toContain('aria-label="Add Location to this profile"');
    expect(html).toContain('aria-label="Add Opening Hours to this profile"');
    expect(html).toContain('aria-label="Add Menu to this profile"');
    expect(html).toContain('aria-label="Add Catalog to this profile"');
    expect(html).toContain('aria-label="Add Gallery to this profile"');
    // No planned types remain: every compatible entry is actionable.
    expect(html).not.toContain("Coming soon");
  });

  it("offers the personal blocks on PERSON profiles", () => {
    const html = render(["hero", "actions", "links"], "PERSON");
    expect(html).toContain('aria-label="Add About to this profile"');
    expect(html).toContain('aria-label="Add Experience to this profile"');
    expect(html).toContain('aria-label="Add CV to this profile"');
  });

  it("marks already-added live types as Added", () => {
    const html = render(["hero", "actions", "links", "location"], "BUSINESS");
    expect(html).not.toContain('aria-label="Add Location to this profile"');
  });
});
