import { describe, expect, it } from "vitest";
import {
  SECTION_CATALOG,
  catalogEntriesByCategory,
  getCatalogEntry,
  isFoundationSectionType,
  isKnownSectionType,
  plannedCatalogEntries,
} from "./sectionCatalog";
import { sanitizeAdminSettings, defaultSectionSettings } from "./sectionSettings";
describe("section catalog", () => {
  it("loads the full registry: all 11 types live", () => {
    expect(SECTION_CATALOG).toHaveLength(11);
    const live = SECTION_CATALOG.filter((e) => e.status === "live");
    expect(live.map((e) => e.type).sort()).toEqual([
      "about",
      "actions",
      "catalog",
      "cv",
      "experience",
      "gallery",
      "hero",
      "links",
      "location",
      "menu",
      "opening_hours",
    ]);
    expect(plannedCatalogEntries()).toEqual([]);
  });

  it("covers the required Business / Personal / Media categories", () => {
    const byCategory = new Map(
      catalogEntriesByCategory().map((g) => [g.category, g.entries.map((e) => e.type).sort()]),
    );
    expect(byCategory.get("Business")).toEqual(["catalog", "location", "menu", "opening_hours"]);
    expect(byCategory.get("Personal")).toEqual(["about", "cv", "experience"]);
    expect(byCategory.get("Media")).toEqual(["gallery"]);
    expect(byCategory.get("Core")).toEqual(["actions", "hero", "links"]);
  });

  it("gives every entry a label, description, icon and empty default settings", () => {
    for (const entry of SECTION_CATALOG) {
      expect(entry.label.trim()).not.toBe("");
      expect(entry.description.trim()).not.toBe("");
      expect(entry.icon).toBeDefined();
      expect(entry.defaultSettings).toEqual({});
      expect(entry.singleton).toBe(true);
    }
  });

  it("resolves entries and known-type gates", () => {
    expect(getCatalogEntry("menu")?.label).toBe("Menu");
    expect(getCatalogEntry("teleport")).toBeNull();
    expect(isKnownSectionType("gallery")).toBe(true);
    expect(isKnownSectionType("teleport")).toBe(false);
    expect(isKnownSectionType(42)).toBe(false);
    expect(isFoundationSectionType("hero")).toBe(true);
    expect(isFoundationSectionType("actions")).toBe(true);
    expect(isFoundationSectionType("links")).toBe(true);
    expect(isFoundationSectionType("menu")).toBe(false);
  });

  it("resolves settings editors for every catalog type", () => {
    for (const entry of SECTION_CATALOG) {
      expect(getCatalogEntry(entry.type)?.settingsComponent).not.toBeNull();
    }
  });

  it("stays in sync with the public renderer's live-type list (tap bundle)", async () => {
    // ProfileSections.tsx deliberately does NOT import this catalog (dashboard
    // editors + lucide icons would ride into the public tap bundle). Its
    // LIVE_PUBLIC_SECTION_TYPES mirror must match every live catalog type.
    const { LIVE_PUBLIC_SECTION_TYPES } = await import(
      "@/components/public-profile/ProfileSections"
    );
    const liveCatalog = SECTION_CATALOG.filter((e) => e.status === "live").map((e) => e.type);
    expect([...LIVE_PUBLIC_SECTION_TYPES].sort()).toEqual([...liveCatalog].sort());
  });

  it("enforces the PERSON/BUSINESS audience split (RESTAURANT forward-declared)", () => {
    const audiences = new Map(SECTION_CATALOG.map((e) => [e.type, e.supportedProfiles]));
    expect(audiences.get("hero")).toEqual(["PERSON", "BUSINESS"]);
    expect(audiences.get("gallery")).toEqual(["PERSON", "BUSINESS"]);
    // Menu declares RESTAURANT for the future profile type; until it exists
    // the audience gate matches BUSINESS profiles (spec Phase 29 §6).
    expect(audiences.get("menu")).toEqual(["RESTAURANT", "BUSINESS"]);
    for (const type of ["location", "opening_hours", "catalog"]) {
      expect(audiences.get(type)).toEqual(["BUSINESS"]);
    }
    for (const type of ["about", "cv", "experience"]) {
      expect(audiences.get(type)).toEqual(["PERSON"]);
    }
  });

  it("validates every preset against its section schema", () => {
    const withPresets = SECTION_CATALOG.filter((e) => e.presets && e.presets.length > 0);
    expect(withPresets.map((e) => e.type).sort()).toEqual(["actions", "gallery", "menu"]);
    for (const entry of withPresets) {
      for (const preset of entry.presets ?? []) {
        expect(preset.label.trim()).not.toBe("");
        // Presets merge over current settings — merging over the defaults
        // must always validate, or the preset bar would offer broken presets.
        const result = sanitizeAdminSettings(entry.type, {
          ...defaultSectionSettings(entry.type),
          ...preset.settings,
        });
        expect(result.ok, `${entry.type}/${preset.id}`).toBe(true);
      }
    }
  });
});
