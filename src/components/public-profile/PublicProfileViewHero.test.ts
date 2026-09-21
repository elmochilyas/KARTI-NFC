import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => createElement("img", props),
}));

import { PublicProfileView } from "./PublicProfileView";
import type { PublicProfile } from "@/features/profiles/public";

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
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: "#0e7c5b",
  theme: "light",
};

function render(
  profile: PublicProfile = BASE_PROFILE,
  opts: { avatarUrl?: string | null; coverUrl?: string | null } = {},
): string {
  return renderToStaticMarkup(
    createElement(PublicProfileView, {
      profile,
      links: [],
      avatarUrl: opts.avatarUrl ?? null,
      coverUrl:
        opts.coverUrl ??
        "https://example.supabase.co/storage/v1/object/public/profile-assets/cover.webp",
    }),
  );
}

describe("PublicProfileView hero no-overlap redesign", () => {
  it("renders cover without shadowing stack (no brightness/scrim classes)", () => {
    const html = render();
    const coverStart = html.indexOf('aria-label="Profile cover"');
    expect(coverStart).toBeGreaterThan(-1);
    const identityStart = html.indexOf('aria-label="Profile identity"');
    expect(identityStart).toBeGreaterThan(coverStart);
    const coverHtml = html.slice(coverStart, identityStart);
    expect(coverHtml).not.toContain("brightness-");
    expect(coverHtml).not.toContain("from-black");
    expect(coverHtml).not.toContain("via-black");
    expect(coverHtml).not.toContain("to-black");
    expect(coverHtml).toContain("object-cover");
  });

  it("renders identity (name) outside the cover on solid background", () => {
    const html = render();
    const coverStart = html.indexOf('aria-label="Profile cover"');
    const identityStart = html.indexOf('aria-label="Profile identity"');
    const nameIndex = html.indexOf("Layla Haddad");
    // Name appears in identity section (after cover), not over the image.
    expect(nameIndex).toBeGreaterThan(identityStart);
    expect(coverStart).toBeGreaterThan(-1);
    // No text-shadow hacks or backdrop blur on solid identity.
    const identityHtml = html.slice(identityStart, identityStart + 3000);
    expect(identityHtml).not.toContain("textShadow");
    expect(identityHtml).not.toContain("backdrop-blur");
  });

  it("keeps quick tiles in-flow with no negative overlap", () => {
    const html = render();
    const tilesStart = html.indexOf('aria-label="Quick actions"');
    expect(tilesStart).toBeGreaterThan(-1);
    const tilesHtml = html.slice(tilesStart, tilesStart + 600);
    expect(tilesHtml).not.toContain("-mt-10");
    expect(tilesHtml).not.toContain("z-10");
  });

  it("avatar straddles the cover/sheet seam with premium white ring (bounded -mt-14 only)", () => {
    const html = render();
    expect(html).toContain("-mt-14");
    // Crisp white ring + larger 112px presence, both themes.
    expect(html).toContain("h-28 w-28");
    expect(html).toContain("ring-white");
    expect(html).toContain("color-mix(in srgb, var(--karti-accent) 16%, transparent)");
  });

  it("dark theme keeps the premium white ring + dark identity text", () => {
    const html = render({ ...BASE_PROFILE, theme: "dark" });
    expect(html).toContain("ring-white");
    expect(html).toContain("text-neutral-50");
  });

  it("cover has a hairline + shadow separation from the sheet (both themes)", () => {
    for (const theme of ["light", "dark"] as const) {
      const html = render({ ...BASE_PROFILE, theme });
      const coverStart = html.indexOf('aria-label="Profile cover"');
      expect(coverStart).toBeGreaterThan(-1);
      const identityStart = html.indexOf('aria-label="Profile identity"');
      const coverHtml = html.slice(coverStart, identityStart);
      expect(coverHtml).toContain("border-b");
      expect(coverHtml).toContain("shadow-");
      // Photo itself stays untinted — no brightness/scrim return.
      expect(coverHtml).not.toContain("brightness-");
      expect(coverHtml).not.toContain("from-black");
    }
    expect(render()).toContain("border-[#E2E8F0]");
    expect(render({ ...BASE_PROFILE, theme: "dark" })).toContain("border-white/10");
  });
});
