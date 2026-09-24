import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => createElement("img", props),
}));

import { BuilderPreview } from "./BuilderPreview";
import type { PublicLink, PublicProfile, PublicSection } from "@/features/profiles/public";

const PROFILE: PublicProfile = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "layla-haddad",
  public_code: "ABCD234567",
  display_name: "Layla Haddad",
  job_title: "Designer",
  company_name: null,
  bio: "Brand designer.",
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

const LINK: PublicLink = {
  id: "223e4567-e89b-12d3-a456-426614174002",
  type: "website",
  label: "Blog",
  url: "https://example.com/blog",
  sort_order: 0,
};

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

function render(sections: PublicSection[]): string {
  return renderToStaticMarkup(
    createElement(BuilderPreview, {
      profile: PROFILE,
      links: [LINK, LINKEDIN_LINK],
      sections,
      avatarUrl: null,
      coverUrl: null,
    }),
  );
}

describe("BuilderPreview", () => {
  it("renders sections in data order inside a phone frame", () => {
    const html = render([
      section("s-links", "links", 1),
      section("s-hero", "hero", 2),
      section("s-actions", "actions", 3),
    ]);
    expect(html).toContain('aria-label="Mobile preview"');
    const connect = html.indexOf('aria-label="Connect"');
    const tiles = html.indexOf('aria-label="Quick actions"');
    expect(connect).toBeGreaterThan(-1);
    expect(tiles).toBeGreaterThan(-1);
    // Links data comes first, so Connect precedes the actions block in the
    // sheet. (Hero stays pinned to the top slot by design — ADR-051.)
    expect(connect).toBeLessThan(tiles);
    expect(html).toContain('aria-label="Profile identity"');
  });

  it("omits disabled sections exactly like the public page", () => {
    const html = render([
      section("s-hero", "hero", 1),
      section("s-links", "links", 2, false),
    ]);
    expect(html).toContain('aria-label="Profile identity"');
    expect(html).not.toContain('aria-label="Connect"');
  });

  it("uses inert stand-ins instead of the live Share/Keep islands", () => {
    const html = render([section("s-hero", "hero", 1)]);
    expect(html).toContain("Share my profile");
    expect(html).toContain("Add to Phone");
    // No live island output: the live buttons share window.location.href,
    // which would be the dashboard URL inside the builder.
    expect(html).not.toContain("Profile link copied");
  });
});
