import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => createElement("img", props),
}));

import { ProfileSectionRenderer } from "./ProfileSections";
import type { PublicLink, PublicProfile, PublicSection } from "@/features/profiles/public";

const BASE_PROFILE: PublicProfile = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "layla-haddad",
  public_code: "ABCD234567",
  display_name: "Layla Haddad",
  job_title: "Designer",
  company_name: "Studio Nord",
  bio: "Brand designer based in Rabat.",
  avatar_path: null,
  cover_path: null,
  phone: "+212600000001",
  whatsapp: null,
  email: "layla@example.com",
  website: null,
  address: null,
  maps_url: null,
  accent_color: "#0e7c5b",
  theme: "light",
};

const BLOG_LINK: PublicLink = {
  id: "223e4567-e89b-12d3-a456-426614174002",
  type: "website",
  label: "Blog",
  url: "https://example.com/blog",
  sort_order: 0,
};

// A link the quick tiles never consume (tiles take at most call/whatsapp +
// one website), so the Connect section always has a row in these tests.
const LINKEDIN_LINK: PublicLink = {
  id: "323e4567-e89b-12d3-a456-426614174003",
  type: "linkedin",
  label: "LinkedIn",
  url: "https://linkedin.com/in/laylahaddad",
  sort_order: 1,
};

function section(id: string, type: string, position: number, enabled = true): PublicSection {
  return { id, type, position, enabled, settings: {} };
}

const DEFAULT_SECTIONS = [
  section("s-hero", "hero", 1),
  section("s-actions", "actions", 2),
  section("s-links", "links", 3),
];

function render(
  sections: PublicSection[] | undefined,
  links: PublicLink[] = [BLOG_LINK, LINKEDIN_LINK],
): string {
  return renderToStaticMarkup(
    createElement(ProfileSectionRenderer, {
      profile: BASE_PROFILE,
      links,
      avatarUrl: null,
      coverUrl: null,
      sections,
    }),
  );
}

describe("ProfileSectionRenderer foundation", () => {
  it("renders hero → actions → links by default (sections omitted)", () => {
    const html = render(undefined);
    const hero = html.indexOf('aria-label="Profile identity"');
    const tiles = html.indexOf('aria-label="Quick actions"');
    const info = html.indexOf("Contact Information");
    const connect = html.indexOf('aria-label="Connect"');
    expect(hero).toBeGreaterThan(-1);
    expect(tiles).toBeGreaterThan(-1);
    expect(info).toBeGreaterThan(-1);
    expect(connect).toBeGreaterThan(-1);
    expect(hero).toBeLessThan(tiles);
    expect(tiles).toBeLessThan(info);
    expect(info).toBeLessThan(connect);
  });

  it("honors a reordered links-first data order", () => {
    const html = render([
      section("s-links", "links", 1),
      section("s-hero", "hero", 2),
      section("s-actions", "actions", 3),
    ]);
    const tiles = html.indexOf('aria-label="Quick actions"');
    const connect = html.indexOf('aria-label="Connect"');
    expect(connect).toBeGreaterThan(-1);
    expect(tiles).toBeGreaterThan(-1);
    // Links section sits in the sheet before the actions block.
    expect(connect).toBeLessThan(tiles);
  });

  it("omits a disabled links section", () => {
    const html = render([
      section("s-hero", "hero", 1),
      section("s-actions", "actions", 2),
      section("s-links", "links", 3, false),
    ]);
    expect(html).not.toContain('aria-label="Connect"');
    expect(html).toContain('aria-label="Profile identity"');
    expect(html).toContain('aria-label="Quick actions"');
  });

  it("omits a disabled hero section", () => {
    const html = render([
      section("s-hero", "hero", 1, false),
      section("s-actions", "actions", 2),
      section("s-links", "links", 3),
    ]);
    expect(html).not.toContain('aria-label="Profile cover"');
    expect(html).not.toContain('aria-label="Profile identity"');
    expect(html).toContain('aria-label="Quick actions"');
  });

  it("ignores unknown future types without crashing", () => {
    const html = render([...DEFAULT_SECTIONS, section("s-maps", "maps", 4)]);
    expect(html).toContain('aria-label="Profile identity"');
    expect(html).toContain('aria-label="Connect"');
    expect(html).not.toContain("s-maps");
  });

  it("renders empty (no sections) when given an empty enabled set", () => {
    const html = render([
      section("s-hero", "hero", 1, false),
      section("s-actions", "actions", 2, false),
      section("s-links", "links", 3, false),
    ]);
    expect(html).not.toContain('aria-label="Profile identity"');
    expect(html).not.toContain('aria-label="Quick actions"');
    expect(html).not.toContain('aria-label="Connect"');
  });
});

describe("ProfileSectionRenderer settings", () => {
  const LINKS_FIRST: PublicSection[] = [
    { id: "s-links", type: "links", position: 1, enabled: true, settings: {} },
    { id: "s-hero", type: "hero", position: 2, enabled: true, settings: {} },
    { id: "s-actions", type: "actions", position: 3, enabled: true, settings: {} },
  ];

  function renderWith(linkSettings: Record<string, unknown>): string {
    return render(
      LINKS_FIRST.map((s) => (s.type === "links" ? { ...s, settings: linkSettings } : s)),
    );
  }

  it("hides link subtitles when showSubtitles is false", () => {
    const shown = renderWith({});
    expect(shown).toContain(">Connect with me</span>");
    const hidden = renderWith({ showSubtitles: false });
    expect(hidden).toContain('aria-label="Connect"');
    // Subtitle row gone; the accessible name still carries the CTA.
    expect(hidden).not.toContain(">Connect with me</span>");
    expect(hidden).toContain("LinkedIn — Connect with me");
  });

  it("caps quick tiles at maxQuickActions", () => {
    const sections: PublicSection[] = [
      section("s-hero", "hero", 1),
      { id: "s-actions", type: "actions", position: 2, enabled: true, settings: {} },
      section("s-links", "links", 3),
    ];
    const full = render(sections);
    expect(full).toContain("repeat(3, minmax(0, 1fr))");
    expect(full).toContain("Send mail");
    const capped = render(
      sections.map((s) => (s.type === "actions" ? { ...s, settings: { maxQuickActions: 1 } } : s)),
    );
    // One tile only (Call); the email tile sublabel disappears with it.
    // (The Blog link falls back to the Connect rows, which keep their own
    // "Visit website" subtitle — unrelated to the tile cap.)
    expect(capped).toContain("repeat(1, minmax(0, 1fr))");
    expect(capped).toContain("Tap to call");
    expect(capped).not.toContain("Send mail");
  });

  it("renders the explicit primary order through the shared resolver", () => {
    const sections: PublicSection[] = [
      section("s-hero", "hero", 1),
      {
        id: "s-actions",
        type: "actions",
        position: 2,
        enabled: true,
        settings: {
          primaryActions: ["link:323e4567-e89b-12d3-a456-426614174003", "email"],
          maxQuickActions: 4,
        },
      },
      section("s-links", "links", 3),
    ];
    const html = render(sections);
    // LinkedIn first, then Email — the legacy Call-first order is overridden.
    expect(html).toContain("LinkedIn — Tap to open");
    expect(html).toContain("Email — Send mail");
    expect(html).not.toContain("Call — Tap to call");
    // The website link is no longer a tile, so it stays in Connect.
    expect(html).toContain("Blog — Visit website");
  });

  it("hides the hero tagline and category when disabled", () => {
    const html = render(
      DEFAULT_SECTIONS.map((s) =>
        s.type === "hero" ? { ...s, settings: { showTagline: false, showCategory: false } } : s,
      ),
    );
    expect(html).toContain('aria-label="Profile identity"');
    // Hero tagline carries title={bio}; the About block keeps its own copy.
    expect(html).not.toContain('title="Brand designer based in Rabat."');
    expect(html).not.toContain("DESIGNER • STUDIO NORD");
    expect(html).toContain("Layla Haddad");
  });

  it("hides quick tiles and the about block when disabled", () => {
    const html = render(
      DEFAULT_SECTIONS.map((s) =>
        s.type === "actions" ? { ...s, settings: { showQuickTiles: false, showAbout: false } } : s,
      ),
    );
    expect(html).not.toContain('aria-label="Quick actions"');
    expect(html).not.toContain("About Layla");
    expect(html).toContain('aria-label="Contact information"');
  });
});

describe("ProfileSectionRenderer business sections", () => {
  const BUSINESS_PROFILE: PublicProfile = {
    ...BASE_PROFILE,
    profile_type: "BUSINESS",
    company_name: "Café Atlas",
  };

  function renderBusiness(sections: PublicSection[]): string {
    return renderToStaticMarkup(
      createElement(ProfileSectionRenderer, {
        profile: BUSINESS_PROFILE,
        links: [],
        avatarUrl: null,
        coverUrl: null,
        sections,
      }),
    );
  }

  const LOCATION: PublicSection = {
    id: "s-location",
    type: "location",
    position: 4,
    enabled: true,
    settings: {
      title: "Find us",
      address: "123 Main St",
      latitude: 33.99,
      longitude: -6.84,
      showMap: true,
      buttonLabel: "Get Directions",
    },
  };

  const HOURS: PublicSection = {
    id: "s-hours",
    type: "opening_hours",
    position: 5,
    enabled: true,
    settings: {
      timezone: "UTC",
      days: Array.from({ length: 7 }, (_, day) => ({ day, closed: true, open: null, close: null })),
    },
  };

  it("renders location with a keyless map embed and navigation links", () => {
    const html = renderBusiness([LOCATION]);
    expect(html).toContain("Find us");
    expect(html).toContain("123 Main St");
    expect(html).toContain("https://www.google.com/maps/dir/?api=1&amp;destination=33.99%2C-6.84");
    expect(html).toContain("https://maps.apple.com/?q=33.99%2C-6.84");
    expect(html).toContain("Get Directions");
    // OSM embed is constructed from sanitized numbers — no API key, lazy.
    expect(html).toContain("<iframe");
    expect(html).toContain("https://www.openstreetmap.org/export/embed.html?");
    expect(html).toContain("marker=33.99,-6.84");
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain("maps.google.com/maps?");
  });

  it("renders no iframe for address-only locations", () => {
    const html = renderBusiness([
      {
        ...LOCATION,
        settings: { ...LOCATION.settings, latitude: null, longitude: null },
      },
    ]);
    expect(html).toContain("123 Main St");
    expect(html).not.toContain("<iframe");
    expect(html).toContain("https://www.google.com/maps/search/?api=1&amp;query=123%20Main%20St");
  });

  it("collapses the location section without a target", () => {
    const html = renderBusiness([
      {
        ...LOCATION,
        settings: { ...LOCATION.settings, address: "", latitude: null, longitude: null },
      },
    ]);
    expect(html).not.toContain("Find us");
  });

  it("shows an admin placeholder for empty location instead of collapsing", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileSectionRenderer, {
        profile: BASE_PROFILE,
        links: [],
        avatarUrl: null,
        coverUrl: null,
        sections: [
          {
            ...LOCATION,
            settings: { ...LOCATION.settings, address: "", latitude: null, longitude: null },
          },
        ],
        previewPlaceholders: true,
      }),
    );
    expect(html).toContain("Add an address to preview");
  });

  it("renders the weekly schedule with a closed badge", () => {
    const html = renderBusiness([HOURS]);
    expect(html).toContain('aria-label="Opening hours"');
    expect(html).toContain("Monday");
    expect(html).toContain("Closed");
    expect(html).not.toContain("Open now");
  });
});

describe("ProfileSectionRenderer collections", () => {
  const BUSINESS_PROFILE: PublicProfile = {
    ...BASE_PROFILE,
    profile_type: "BUSINESS",
    company_name: "Café Atlas",
  };

  const MENU: PublicSection = {
    id: "s-menu",
    type: "menu",
    position: 6,
    enabled: true,
    settings: {
      title: "Our Menu",
      currency: "MAD",
      categories: [
        {
          id: "cat-1",
          name: "Burgers",
          items: [
            {
              id: "item-1",
              image: "",
              name: "Chicken Burger",
              description: "Grilled chicken",
              price: 40,
              available: true,
            },
            {
              id: "item-2",
              image: "",
              name: "Sold Out Burger",
              description: "Gone",
              price: 50,
              available: false,
            },
          ],
        },
      ],
    },
  };

  function renderCollections(sections: PublicSection[]): string {
    return renderToStaticMarkup(
      createElement(ProfileSectionRenderer, {
        profile: BUSINESS_PROFILE,
        links: [],
        avatarUrl: null,
        coverUrl: null,
        sections,
      }),
    );
  }

  it("renders menu categories and available items with prices", () => {
    const html = renderCollections([MENU]);
    expect(html).toContain("Our Menu");
    expect(html).toContain("Burgers");
    expect(html).toContain("Chicken Burger");
    expect(html).toContain("Grilled chicken");
    expect(html).toContain("40 MAD");
    // Unavailable items never render.
    expect(html).not.toContain("Sold Out Burger");
  });

  it("renders catalog with its own title", () => {
    const html = renderCollections([
      {
        id: "s-catalog",
        type: "catalog",
        position: 7,
        enabled: true,
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
                  description: "Noise cancelling",
                  price: 299,
                  available: true,
                },
              ],
            },
          ],
        },
      },
    ]);
    expect(html).toContain("Products");
    expect(html).toContain("Electronics");
    expect(html).toContain("Headphones");
    expect(html).toContain("299 MAD");
  });

  it("collapses collections with nothing visible", () => {
    const html = renderCollections([
      {
        id: "s-empty",
        type: "menu",
        position: 6,
        enabled: true,
        settings: { title: "", currency: "MAD", categories: [] },
      },
    ]);
    expect(html).not.toContain("Menu");
  });
});

describe("ProfileSectionRenderer personal sections", () => {
  function renderPersonal(sections: PublicSection[]): string {
    return renderToStaticMarkup(
      createElement(ProfileSectionRenderer, {
        profile: BASE_PROFILE,
        links: [],
        avatarUrl: null,
        coverUrl: null,
        sections,
      }),
    );
  }

  it("renders the about biography", () => {
    const html = renderPersonal([
      {
        id: "s-about",
        type: "about",
        position: 4,
        enabled: true,
        settings: { title: "About me", content: "Designer from Rabat.\nSecond line." },
      },
    ]);
    expect(html).toContain("About me");
    expect(html).toContain("Designer from Rabat.");
  });

  it("collapses about without content", () => {
    const html = renderPersonal([
      {
        id: "s-about",
        type: "about",
        position: 4,
        enabled: true,
        settings: { title: "", content: "  " },
      },
    ]);
    expect(html).not.toContain("About Layla");
  });

  it("renders the experience timeline with present roles", () => {
    const html = renderPersonal([
      {
        id: "s-exp",
        type: "experience",
        position: 5,
        enabled: true,
        settings: {
          title: "Work",
          jobs: [
            {
              id: "j1",
              company: "Atlas",
              role: "Developer",
              startDate: "2022-01",
              endDate: null,
              description: "Built things.",
            },
            {
              id: "j2",
              company: "Old Co",
              role: "Intern",
              startDate: "2021-06",
              endDate: "2021-12",
              description: "",
            },
          ],
        },
      },
    ]);
    expect(html).toContain("Work");
    expect(html).toContain("Developer");
    expect(html).toContain("Atlas");
    expect(html).toContain("Jan 2022");
    expect(html).toContain("Present");
    expect(html).toContain("Dec 2021");
    expect(html).toContain("Built things.");
  });

  it("collapses experience without valid jobs", () => {
    const html = renderPersonal([
      {
        id: "s-exp",
        type: "experience",
        position: 5,
        enabled: true,
        settings: { title: "", jobs: [] },
      },
    ]);
    expect(html).not.toContain("Experience");
  });

  it("renders the CV download button without exposing the file path", () => {
    const path = "123e4567-e89b-12d3-a456-426614174001/sections/cv/abcdef0123456789.pdf";
    const html = renderPersonal([
      {
        id: "s-cv",
        type: "cv",
        position: 6,
        enabled: true,
        settings: { title: "CV", label: "Get my CV", hasFile: true },
      },
    ]);
    expect(html).toContain("Get my CV");
    expect(html).toContain('href="/api/cv/layla-haddad"');
    expect(html).not.toContain(path);
    expect(html).not.toContain("abcdef0123456789");
  });

  it("collapses the CV section without a file", () => {
    const html = renderPersonal([
      {
        id: "s-cv",
        type: "cv",
        position: 6,
        enabled: true,
        settings: { title: "CV", label: "L", hasFile: false },
      },
    ]);
    expect(html).not.toContain("Get my CV");
  });
});

describe("ProfileSectionRenderer gallery", () => {
  // Gallery images resolve to public storage URLs inside the renderer,
  // so these tests provision the storage origin (production always has it).
  let previousUrl: string | undefined;
  beforeEach(() => {
    previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyz.supabase.co";
  });
  afterEach(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  });

  const GALLERY: PublicSection = {
    id: "s-gallery",
    type: "gallery",
    position: 7,
    enabled: true,
    settings: {
      title: "Photos",
      layout: "grid",
      images: [
        {
          id: "g1",
          image: "123e4567-e89b-12d3-a456-426614174001/sections/gallery/aaaaaaaaaaaaaaaa.webp",
          alt: "Sunset",
        },
        { id: "g2", image: "", alt: "" },
      ],
    },
  };

  function renderGallery(settings: Record<string, unknown>): string {
    return renderToStaticMarkup(
      createElement(ProfileSectionRenderer, {
        profile: BASE_PROFILE,
        links: [],
        avatarUrl: null,
        coverUrl: null,
        sections: [{ ...GALLERY, settings }],
      }),
    );
  }

  it("renders a responsive lazy grid with alt text", () => {
    const html = renderGallery(GALLERY.settings);
    expect(html).toContain("Photos");
    expect(html).toContain("aaaaaaaaaaaaaaaa.webp");
    expect(html).toContain('alt="Sunset"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("grid");
  });

  it("renders masonry layout without empty slots", () => {
    const html = renderGallery({ ...GALLERY.settings, layout: "masonry" });
    expect(html).toContain("columns-");
    // Blank-image entries never render.
    expect(html.match(/<img/g)?.length).toBe(1);
  });

  it("collapses with no usable images", () => {
    const html = renderGallery({ title: "", layout: "grid", images: [] });
    expect(html).not.toContain("Photos");
    expect(html).not.toContain("<img");
  });
});
