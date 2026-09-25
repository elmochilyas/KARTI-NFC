import { describe, expect, it } from "vitest";
import {
  defaultSectionSettings,
  formatMonth,
  formatPrice,
  googleDirectionsUrl,
  locationQuery,
  navigationUrls,
  openNowStatus,
  osmEmbedUrl,
  resolveLocationTarget,
  sanitizeAdminSettings,
  sanitizeMapsLink,
  sanitizePublicSettings,
} from "./sectionSettings";

describe("section settings engine", () => {
  it("defaults preserve the current look (everything visible)", () => {
    expect(defaultSectionSettings("hero")).toEqual({ showTagline: true, showCategory: true });
    expect(defaultSectionSettings("actions")).toEqual({
      showQuickTiles: true,
      showAbout: true,
      display: "tiles",
      maxQuickActions: 3,
      primaryActions: [],
    });
    expect(defaultSectionSettings("links")).toEqual({ showSubtitles: true });
    expect(defaultSectionSettings("menu")).toEqual({
      title: "Our Menu",
      currency: "MAD",
      layout: "cards",
      categories: [],
    });
    expect(defaultSectionSettings("about")).toEqual({ title: "About", content: "" });
    expect(defaultSectionSettings("gallery")).toEqual({
      title: "Gallery",
      layout: "grid",
      images: [],
    });
    expect(defaultSectionSettings("teleport")).toEqual({});
  });

  it("admin save accepts valid values and strips unknown keys", () => {
    const result = sanitizeAdminSettings("hero", {
      showTagline: false,
      showCategory: true,
      evil: "drop me",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings).toEqual({ showTagline: false, showCategory: true });
  });

  it("admin save rejects invalid value types", () => {
    const result = sanitizeAdminSettings("links", { showSubtitles: "yes" });
    expect(result.ok).toBe(false);
  });

  it("admin save rejects settings for unknown types", () => {
    expect(sanitizeAdminSettings("teleport", {}).ok).toBe(true);
    const result = sanitizeAdminSettings("teleport", { columns: 3 });
    expect(result.ok).toBe(false);
  });

  it("public projection strips hostile keys and falls back on invalid shapes", () => {
    expect(
      sanitizePublicSettings("links", {
        showSubtitles: false,
        adminNote: "steal me",
        __proto__: { polluted: true },
      }),
    ).toEqual({ showSubtitles: false });
    expect(sanitizePublicSettings("hero", { showTagline: "maybe" })).toEqual({
      showTagline: true,
      showCategory: true,
    });
    expect(sanitizePublicSettings("gallery", { columns: 3 })).toEqual({
      title: "Gallery",
      layout: "grid",
      images: [],
    });
    expect(sanitizePublicSettings("teleport", { x: 1 })).toEqual({});
    expect(sanitizePublicSettings("links", null)).toEqual({ showSubtitles: true });
  });
});

describe("location settings", () => {
  it("accepts coordinates, address and labels; coerces numeric strings", () => {
    const result = sanitizeAdminSettings("location", {
      title: "Visit us",
      address: "123 Main St",
      latitude: "33.99",
      longitude: "-6.84",
      showMap: true,
      buttonLabel: "",
      evil: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Empty button label is stored as-is; the renderer falls back to
      // "Get Directions" when blank.
      expect(result.settings).toEqual({
        title: "Visit us",
        address: "123 Main St",
        latitude: 33.99,
        longitude: -6.84,
        mapsUrl: null,
        mapZoom: 15,
        showMap: true,
        buttonLabel: "",
      });
    }
  });

  it("accepts a supported maps link and zoom; rejects hostile links", () => {
    const good = sanitizeAdminSettings("location", {
      mapsUrl: "https://www.google.com/maps/place/Agadir/@30.42,-9.6,15z",
      mapZoom: 12,
    });
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.settings).toMatchObject({
        mapsUrl: "https://www.google.com/maps/place/Agadir/@30.42,-9.6,15z",
        mapZoom: 12,
      });
    }
    expect(
      sanitizeAdminSettings("location", { mapsUrl: "https://maps.apple.com/?q=Agadir" }).ok,
    ).toBe(true);
    expect(sanitizeAdminSettings("location", { mapsUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(sanitizeAdminSettings("location", { mapsUrl: "data:text/html,hi" }).ok).toBe(false);
    expect(sanitizeAdminSettings("location", { mapsUrl: "https://evil.example.com/x" }).ok).toBe(
      false,
    );
    expect(sanitizeAdminSettings("location", { mapZoom: 0 }).ok).toBe(false);
    expect(sanitizeAdminSettings("location", { mapZoom: 20 }).ok).toBe(false);
  });

  it("sanitizeMapsLink allowlists map hosts only", () => {
    expect(sanitizeMapsLink("https://maps.app.goo.gl/abc")).toBe("https://maps.app.goo.gl/abc");
    expect(sanitizeMapsLink("https://maps.apple.com/?q=Agadir")).toBe(
      "https://maps.apple.com/?q=Agadir",
    );
    expect(sanitizeMapsLink("https://www.openstreetmap.org/#map=15/30.42/-9.6")).toBe(
      "https://www.openstreetmap.org/#map=15/30.42/-9.6",
    );
    expect(sanitizeMapsLink("  ")).toBeNull();
    expect(sanitizeMapsLink("javascript:alert(1)")).toBeNull();
    expect(sanitizeMapsLink("https://example.com/maps")).toBeNull();
    expect(sanitizeMapsLink(42)).toBeNull();
  });

  it("resolveLocationTarget prefers coordinates, then link, then address", () => {
    expect(
      resolveLocationTarget({
        address: "Agadir",
        latitude: 30.42,
        longitude: -9.6,
        mapsUrl: "https://www.google.com/maps/place/X",
      }),
    ).toEqual({
      query: "30.42,-9.6",
      directLink: "https://www.google.com/maps/place/X",
      coords: { latitude: 30.42, longitude: -9.6 },
    });
    expect(
      resolveLocationTarget({ address: "Agadir", mapsUrl: "https://maps.apple.com/?q=Agadir" }),
    ).toMatchObject({
      query: "https://maps.apple.com/?q=Agadir",
      coords: null,
    });
    expect(
      resolveLocationTarget({ address: "Agadir", mapsUrl: "javascript:alert(1)" }),
    ).toMatchObject({ query: "Agadir", directLink: null, coords: null });
    expect(resolveLocationTarget({ address: "", mapsUrl: "" })).toMatchObject({
      query: null,
      directLink: null,
      coords: null,
    });
  });

  it("osmEmbedUrl builds a keyless embed from numbers only", () => {
    const url = osmEmbedUrl(30.42775, -9.59814, 15);
    expect(url).toContain("https://www.openstreetmap.org/export/embed.html?");
    expect(url).toContain("layer=mapnik");
    expect(url).toContain("marker=30.42775,-9.59814");
    expect(url).not.toContain("<");
    expect(osmEmbedUrl(91, 0, 15)).toBeNull();
    expect(osmEmbedUrl(0, 200, 15)).toBeNull();
    expect(osmEmbedUrl(Number.NaN, 0, 15)).toBeNull();
    // Higher zoom narrows the bounding box.
    const wide = osmEmbedUrl(30, -9, 10) ?? "";
    const tight = osmEmbedUrl(30, -9, 18) ?? "";
    const span = (u: string): number => {
      const bbox = new URL(u).searchParams.get("bbox") ?? "";
      const [a, , c] = bbox.split(",").map(Number);
      return (c ?? 0) - (a ?? 0);
    };
    expect(span(tight)).toBeLessThan(span(wide));
  });

  it("rejects out-of-range coordinates", () => {
    expect(sanitizeAdminSettings("location", { latitude: 91 }).ok).toBe(false);
    expect(sanitizeAdminSettings("location", { longitude: -181 }).ok).toBe(false);
    expect(sanitizeAdminSettings("location", { latitude: "north" }).ok).toBe(false);
  });

  it("prefers coordinates over address for the navigation query", () => {
    expect(locationQuery({ address: "Somewhere", latitude: 33.99, longitude: -6.84 })).toBe(
      "33.99,-6.84",
    );
    expect(locationQuery({ address: "  123 Main St  ", latitude: null, longitude: null })).toBe(
      "123 Main St",
    );
    expect(locationQuery({ address: "", latitude: null, longitude: null })).toBeNull();
  });

  it("builds encoded Google + Apple Maps URLs", () => {
    const urls = navigationUrls("33.99,-6.84");
    expect(urls.google).toBe("https://www.google.com/maps/search/?api=1&query=33.99%2C-6.84");
    expect(urls.apple).toBe("https://maps.apple.com/?q=33.99%2C-6.84");
  });

  it("normalizes Google directions URLs from numbers only", () => {
    expect(googleDirectionsUrl(33.5731, -7.5898)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=33.5731%2C-7.5898",
    );
    expect(googleDirectionsUrl(91, 0)).toBeNull();
    expect(googleDirectionsUrl(0, -181)).toBeNull();
    expect(googleDirectionsUrl(Number.NaN, 0)).toBeNull();
  });
});

describe("opening hours settings", () => {
  const openAllDay = (day: number) => ({ day, closed: false, open: "00:00", close: "23:59" });

  function week(partial: Partial<Record<string, unknown>> = {}) {
    return {
      timezone: "UTC",
      days: Array.from({ length: 7 }, (_, day) => ({ ...openAllDay(day) })),
      ...partial,
    };
  }

  it("accepts a full valid week", () => {
    expect(sanitizeAdminSettings("opening_hours", week()).ok).toBe(true);
  });

  it("rejects bad timezones, bad times and short weeks", () => {
    expect(sanitizeAdminSettings("opening_hours", week({ timezone: "Mars/Olympus" })).ok).toBe(
      false,
    );
    expect(
      sanitizeAdminSettings("opening_hours", {
        timezone: "UTC",
        days: Array.from({ length: 7 }, (_, day) => ({
          day,
          closed: false,
          open: "9am",
          close: "18:00",
        })),
      }).ok,
    ).toBe(false);
    expect(
      sanitizeAdminSettings("opening_hours", {
        timezone: "UTC",
        days: [{ day: 1, closed: true, open: null, close: null }],
      }).ok,
    ).toBe(false);
  });

  it("computes open/closed status deterministically", () => {
    const closedWeek = week({
      days: Array.from({ length: 7 }, (_, day) => ({ day, closed: true, open: null, close: null })),
    });
    expect(openNowStatus(closedWeek, new Date("2026-09-21T12:00:00Z"))).toBe("closed");
    expect(openNowStatus(week(), new Date("2026-09-21T12:00:00Z"))).toBe("open");
    expect(openNowStatus({ timezone: "UTC", days: [] }, new Date())).toBeNull();
    expect(openNowStatus({ timezone: "Nope/Nowhere", days: [] }, new Date())).toBeNull();
  });
});

describe("collection settings (shared menu/catalog engine)", () => {
  const validItem = {
    id: "item-1",
    image: "",
    name: "Chicken Burger",
    description: "Grilled chicken",
    price: 40,
    available: true,
  };

  function validCollection() {
    return {
      title: "Our Menu",
      currency: "MAD",
      categories: [{ id: "cat-1", name: "Burgers", items: [validItem] }],
    };
  }

  it("accepts the spec example shape for menu and catalog", () => {
    for (const type of ["menu", "catalog"]) {
      const result = sanitizeAdminSettings(type, validCollection());
      expect(result.ok).toBe(true);
    }
    expect(defaultSectionSettings("menu").title).toBe("Our Menu");
    expect(defaultSectionSettings("catalog").title).toBe("Products");
  });

  it("strips unknown keys and coerces price strings", () => {
    const result = sanitizeAdminSettings("menu", {
      ...validCollection(),
      hacked: true,
      categories: [
        {
          id: "cat-1",
          name: "Burgers",
          extra: "drop",
          items: [{ ...validItem, price: "40", injected: 1 }],
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings).toEqual({
        title: "Our Menu",
        currency: "MAD",
        layout: "cards",
        categories: [{ id: "cat-1", name: "Burgers", items: [{ ...validItem, price: 40 }] }],
      });
    }
  });

  it("rejects negative prices, blank names and oversized collections", () => {
    expect(
      sanitizeAdminSettings("menu", {
        ...validCollection(),
        categories: [{ id: "c", name: "B", items: [{ ...validItem, price: -5 }] }],
      }).ok,
    ).toBe(false);
    expect(
      sanitizeAdminSettings("catalog", {
        ...validCollection(),
        categories: [{ id: "c", name: "B", items: [{ ...validItem, name: "  " }] }],
      }).ok,
    ).toBe(false);
    expect(
      sanitizeAdminSettings("menu", {
        ...validCollection(),
        categories: Array.from({ length: 21 }, (_, i) => ({
          id: `c${i}`,
          name: `C${i}`,
          items: [],
        })),
      }).ok,
    ).toBe(false);
  });

  it("formats prices with currency or hides null prices", () => {
    expect(formatPrice(40, "MAD")).toBe("40 MAD");
    expect(formatPrice(40.5, "MAD")).toBe("40.50 MAD");
    expect(formatPrice(40, "")).toBe("40");
    expect(formatPrice(null, "MAD")).toBeNull();
  });
});

describe("personal settings (Phase 31)", () => {
  it("accepts about title and content within limits", () => {
    const result = sanitizeAdminSettings("about", {
      title: "About me",
      content: "Hello.",
      extra: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings).toEqual({ title: "About me", content: "Hello." });
    expect(sanitizeAdminSettings("about", { content: "x".repeat(2001) }).ok).toBe(false);
  });

  it("accepts valid jobs and rejects bad dates and reversed ranges", () => {
    const job = {
      id: "job-1",
      company: "Atlas",
      role: "Developer",
      startDate: "2022-01",
      endDate: null,
      description: "Built things.",
    };
    expect(sanitizeAdminSettings("experience", { title: "Work", jobs: [job] }).ok).toBe(true);
    expect(
      sanitizeAdminSettings("experience", {
        jobs: [{ ...job, startDate: "Jan 2022" }],
      }).ok,
    ).toBe(false);
    expect(
      sanitizeAdminSettings("experience", {
        jobs: [{ ...job, startDate: "2023-01", endDate: "2022-12" }],
      }).ok,
    ).toBe(false);
    expect(
      sanitizeAdminSettings("experience", {
        jobs: [{ ...job, company: "  " }],
      }).ok,
    ).toBe(false);
  });

  it("accepts CV label/title/file references", () => {
    const path = "123e4567-e89b-12d3-a456-426614174001/sections/cv/abcdef0123456789.pdf";
    const result = sanitizeAdminSettings("cv", { title: "CV", label: "Get my CV", file: path });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings).toEqual({ title: "CV", label: "Get my CV", file: path });
  });

  it("exposes hasFile but never the raw file path publicly", () => {
    const path = "123e4567-e89b-12d3-a456-426614174001/sections/cv/abcdef0123456789.pdf";
    expect(sanitizePublicSettings("cv", { title: "CV", label: "L", file: path })).toEqual({
      title: "CV",
      label: "L",
      hasFile: true,
    });
    expect(sanitizePublicSettings("cv", { title: "CV", label: "L", file: "" })).toEqual({
      title: "CV",
      label: "L",
      hasFile: false,
    });
    const hostile = sanitizePublicSettings("cv", { file: path, adminNote: "x" }) as Record<
      string,
      unknown
    >;
    expect("file" in hostile).toBe(false);
    expect("adminNote" in hostile).toBe(false);
  });

  it("formats YYYY-MM months for display", () => {
    expect(formatMonth("2024-01")).toBe("Jan 2024");
    expect(formatMonth("2023-12")).toBe("Dec 2023");
    expect(formatMonth("tomorrow")).toBe("tomorrow");
  });
});

describe("gallery settings (Phase 32)", () => {
  const img = (
    id: string,
    image = "123e4567-e89b-12d3-a456-426614174001/sections/gallery/abcdef0123456789.webp",
  ) => ({
    id,
    image,
    alt: "A photo",
  });

  it("accepts title, layout and images", () => {
    const result = sanitizeAdminSettings("gallery", {
      title: "Photos",
      layout: "masonry",
      images: [img("g1")],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings).toEqual({
        title: "Photos",
        layout: "masonry",
        images: [{ id: "g1", image: img("g1").image, alt: "A photo" }],
      });
    }
  });

  it("rejects bad layouts, foreign image refs and oversized lists", () => {
    expect(sanitizeAdminSettings("gallery", { title: "", layout: "carousel", images: [] }).ok).toBe(
      false,
    );
    expect(
      sanitizeAdminSettings("gallery", {
        images: [{ id: "g1", image: "https://evil.com/x.webp", alt: "" }],
      }).ok,
    ).toBe(false);
    expect(
      sanitizeAdminSettings("gallery", {
        images: Array.from({ length: 25 }, (_, i) => ({ ...img(`g${i}`), id: `g${i}` })),
      }).ok,
    ).toBe(false);
  });

  it("falls back safely on invalid shapes", () => {
    expect(sanitizePublicSettings("gallery", null)).toEqual({
      title: "Gallery",
      layout: "grid",
      images: [],
    });
    expect(sanitizePublicSettings("gallery", { layout: "nope", images: [], hacked: 1 })).toEqual({
      title: "Gallery",
      layout: "grid",
      images: [],
    });
  });
});
