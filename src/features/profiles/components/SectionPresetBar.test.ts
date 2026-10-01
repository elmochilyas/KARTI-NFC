import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { isPresetActive, SectionPresetBar } from "./SectionPresetBar";

const PRESETS = [
  { id: "tiles", label: "Tiles", description: "Visual cards.", settings: { display: "tiles" } },
  {
    id: "buttons",
    label: "Buttons",
    description: "Full-width buttons.",
    settings: { display: "buttons" },
  },
];

function render(props?: {
  currentSettings?: Record<string, unknown>;
  activeId?: string | null;
}) {
  return renderToStaticMarkup(
    createElement(SectionPresetBar, {
      typeLabel: "Quick actions",
      presets: PRESETS,
      pending: false,
      currentSettings: props?.currentSettings,
      activeId: props?.activeId,
      onApply: () => {},
    }),
  );
}

describe("isPresetActive", () => {
  it("matches exact values", () => {
    expect(isPresetActive({ display: "tiles" }, { display: "tiles" })).toBe(true);
  });

  it("partial-matches when current settings carry extra keys", () => {
    expect(
      isPresetActive({ display: "tiles" }, { display: "tiles", showAbout: true }),
    ).toBe(true);
  });

  it("rejects mismatched values", () => {
    expect(isPresetActive({ display: "tiles" }, { display: "buttons" })).toBe(false);
  });

  it("rejects missing keys and empty presets", () => {
    expect(isPresetActive({ display: "tiles" }, {})).toBe(false);
    expect(isPresetActive({}, { display: "tiles" })).toBe(false);
  });
});

describe("SectionPresetBar selected state", () => {
  it("marks the matching preset pressed with a check, others unpressed", () => {
    const html = render({ currentSettings: { display: "tiles", showAbout: true } });
    // Active preset: pressed + active label + primary styling.
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Apply Tiles preset (active)");
    expect(html).toContain("bg-accent");
    // Inactive preset stays unpressed with the plain label.
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Apply Buttons preset"');
  });

  it("marks nothing active when settings match no preset", () => {
    const html = render({ currentSettings: { display: "custom" } });
    expect(html).not.toContain('aria-pressed="true"');
    expect(html).not.toContain("(active)");
  });

  it("marks nothing active without current settings", () => {
    const html = render();
    expect(html).not.toContain('aria-pressed="true"');
  });

  it("prefers an explicit activeId override over settings comparison", () => {
    const html = render({ currentSettings: { display: "tiles" }, activeId: "buttons" });
    expect(html).toContain("Apply Buttons preset (active)");
    expect(html).toContain('aria-label="Apply Tiles preset"');
  });

  it("renders nothing for an empty preset list", () => {
    const html = renderToStaticMarkup(
      createElement(SectionPresetBar, {
        typeLabel: "Empty",
        presets: [],
        pending: false,
        onApply: vi.fn(),
      }),
    );
    expect(html).toBe("");
  });
});
