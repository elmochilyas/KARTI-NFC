import { describe, expect, it } from "vitest";
import {
  MANIFEST_BACKGROUND_COLOR,
  MANIFEST_DEFAULT_THEME_COLOR,
  buildProfileManifest,
  manifestIconUrl,
  manifestShortName,
  manifestStartUrl,
  manifestThemeColor,
} from "./manifest";

const BASE = {
  displayName: "Ilyas El Moch",
  publicCode: "A8K29MPQ2Z",
  appUrl: "https://karti.app",
  accentColor: "#123456",
  bio: "Plumber in Casablanca.",
};

describe("buildProfileManifest", () => {
  it("builds the profile install identity from public data", () => {
    expect(buildProfileManifest(BASE)).toEqual({
      name: "Ilyas El Moch",
      short_name: "Ilyas",
      description: "Plumber in Casablanca.",
      id: "/u/A8K29MPQ2Z",
      start_url: "/u/A8K29MPQ2Z",
      display: "standalone",
      background_color: MANIFEST_BACKGROUND_COLOR,
      theme_color: "#123456",
      icons: [
        {
          src: "https://karti.app/u/A8K29MPQ2Z/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "https://karti.app/u/A8K29MPQ2Z/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });
  });

  it("start_url uses /u/{publicCode} — never the slug, never /t/", () => {
    const manifest = buildProfileManifest(BASE);
    expect(manifest.start_url).toBe("/u/A8K29MPQ2Z");
    expect(manifest.id).toBe("/u/A8K29MPQ2Z");
    expect(manifest.start_url).not.toContain("/t/");
    expect(manifest.start_url).not.toContain("ilyas");
    expect(JSON.stringify(manifest)).not.toContain("/t/");
  });

  it("normalizes lowercase codes to the stored uppercase identity", () => {
    const manifest = buildProfileManifest({ ...BASE, publicCode: "a8k29mpq2z" });
    expect(manifest.start_url).toBe("/u/A8K29MPQ2Z");
    expect(manifest.icons[0]?.src).toBe("https://karti.app/u/A8K29MPQ2Z/icon-192.png");
  });

  it("falls back for blank names, missing bio, and missing accent", () => {
    const manifest = buildProfileManifest({
      ...BASE,
      displayName: "   ",
      bio: null,
      accentColor: null,
    });
    expect(manifest.name).toBe("Karti Profile");
    expect(manifest.short_name).toBe("Karti");
    expect(manifest.description).toBe("Digital business card");
    expect(manifest.theme_color).toBe(MANIFEST_DEFAULT_THEME_COLOR);
  });

  it("truncates long bios and hostile accents safely", () => {
    const manifest = buildProfileManifest({
      ...BASE,
      bio: `  ${"x".repeat(500)}  `,
      accentColor: 'red";</script>',
    });
    expect(manifest.description).toHaveLength(140);
    expect(manifest.theme_color).toBe(MANIFEST_DEFAULT_THEME_COLOR);
  });

  it("exposes only manifest fields — never private data", () => {
    const serialized = JSON.stringify(buildProfileManifest(BASE));
    for (const secret of ["client", "card", "notes", "dashboard", "admin", "token", "key"]) {
      expect(serialized.toLowerCase()).not.toContain(secret);
    }
    expect(Object.keys(buildProfileManifest(BASE)).sort()).toEqual(
      [
        "background_color",
        "description",
        "display",
        "icons",
        "id",
        "name",
        "short_name",
        "start_url",
        "theme_color",
      ].sort(),
    );
  });
});

describe("manifestShortName", () => {
  it("takes the first token capped at 12 chars", () => {
    expect(manifestShortName("Ilyas El Moch")).toBe("Ilyas");
    expect(manifestShortName("  María  José  ")).toBe("María");
    expect(manifestShortName("AVeryLongFirstNameHere Last")).toBe("AVeryLongFir");
    expect(manifestShortName("أحمد بن علي")).toBe("أحمد");
    expect(manifestShortName("   ")).toBe("Karti");
    expect(manifestShortName("")).toBe("Karti");
  });
});

describe("manifestStartUrl", () => {
  it("always uses the /u/ identity shape", () => {
    expect(manifestStartUrl("a8k29mpq2z")).toBe("/u/A8K29MPQ2Z");
  });
});

describe("manifestIconUrl", () => {
  it("builds absolute icon URLs and strips app-URL trailing slashes", () => {
    expect(manifestIconUrl("https://karti.app///", "A8K29MPQ2Z", "icon-512.png")).toBe(
      "https://karti.app/u/A8K29MPQ2Z/icon-512.png",
    );
  });
});

describe("manifestThemeColor", () => {
  it("passes valid hex through and rejects everything else", () => {
    expect(manifestThemeColor("#a1B2c3")).toBe("#a1B2c3");
    expect(manifestThemeColor(null)).toBe(MANIFEST_DEFAULT_THEME_COLOR);
    expect(manifestThemeColor("red")).toBe(MANIFEST_DEFAULT_THEME_COLOR);
    expect(manifestThemeColor("#fff")).toBe(MANIFEST_DEFAULT_THEME_COLOR);
    expect(manifestThemeColor("#12345678")).toBe(MANIFEST_DEFAULT_THEME_COLOR);
    expect(manifestThemeColor('javascript:alert(1)')).toBe(MANIFEST_DEFAULT_THEME_COLOR);
  });
});
