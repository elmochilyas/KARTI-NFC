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
  whatsapp: "+212600000002",
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: "#0e7c5b",
  theme: "light",
};

const INSTAGRAM_LINK = {
  id: "223e4567-e89b-12d3-a456-426614174002",
  type: "instagram",
  label: "Instagram",
  url: "https://instagram.com/layla.studio",
  sort_order: 0,
};

const LINKEDIN_LINK = {
  id: "323e4567-e89b-12d3-a456-426614174003",
  type: "linkedin",
  label: "LinkedIn",
  url: "https://linkedin.com/in/laylahaddad",
  sort_order: 1,
};

function render(
  profile: PublicProfile = BASE_PROFILE,
  links: (typeof INSTAGRAM_LINK)[] = [INSTAGRAM_LINK],
): string {
  return renderToStaticMarkup(
    createElement(PublicProfileView, {
      profile,
      links,
      avatarUrl: null,
      coverUrl: null,
    }),
  );
}

function quickTilesSection(html: string): string {
  const start = html.indexOf('aria-label="Quick actions"');
  expect(start).toBeGreaterThan(-1);
  // Quick tiles nav ends before the Contact Information section.
  const end = html.indexOf("Contact Information", start);
  return html.slice(start, end === -1 ? undefined : end);
}

describe("PublicProfileView top action cards", () => {
  it("renders Instagram, WhatsApp, and Call with human sublabels", () => {
    const html = render();
    const tiles = quickTilesSection(html);
    expect(tiles).toContain("Instagram");
    expect(tiles).toContain("View profile");
    expect(tiles).toContain("WhatsApp");
    expect(tiles).toContain("Chat now");
    expect(tiles).toContain("Call");
    expect(tiles).toContain("Tap to call");
  });

  it("uses equal-width centered cards with 110px minimum height", () => {
    const html = render();
    const tiles = quickTilesSection(html);
    // Equal widths via repeat(n, minmax(0, 1fr)) — spaces vary by serializer.
    expect(tiles).toContain("grid-template-columns");
    expect(tiles).toContain("repeat(3");
    expect(tiles).toContain("minmax(0");
    // Minimum height 110px on every tile.
    expect(tiles).toContain("min-h-[110px]");
    // Vertical centered layout.
    expect(tiles).toContain("flex-col");
    expect(tiles).toContain("items-center");
    expect(tiles).toContain("justify-center");
    expect(tiles).toContain("text-center");
  });

  it("never truncates tile text — wraps naturally with no ellipsis", () => {
    const html = render();
    const tiles = quickTilesSection(html);
    expect(tiles).not.toContain("truncate");
    expect(tiles).not.toContain("text-ellipsis");
    expect(tiles).not.toContain("overflow-hidden");
    expect(tiles).toContain("break-words");
  });

  it("keeps tile text readable at 320px widths (narrow columns)", () => {
    const html = render();
    const tiles = quickTilesSection(html);
    // Small title/sub sizes + tight horizontal padding fit ~90px columns.
    expect(tiles).toContain("text-[13px]");
    expect(tiles).toContain("text-[11px]");
    expect(tiles).toContain("px-2");
    expect(tiles).toContain("min-w-0");
  });

  it("exposes accessible names and press/hover interaction states", () => {
    const html = render();
    const tiles = quickTilesSection(html);
    expect(tiles).toContain('aria-label="Instagram — View profile"');
    expect(tiles).toContain('aria-label="WhatsApp — Chat now"');
    expect(tiles).toContain('aria-label="Call — Tap to call"');
    expect(tiles).toContain("hover:-translate-y-0.5");
    expect(tiles).toContain("active:scale-[0.96]");
    expect(tiles).toContain("focus-visible:");
  });
});

describe("PublicProfileView connect cards", () => {
  it("replaces the LinkedIn technical subtitle with a human CTA", () => {
    const html = render(BASE_PROFILE, [INSTAGRAM_LINK, LINKEDIN_LINK]);
    expect(html).toContain("LinkedIn");
    expect(html).toContain("Connect with me");
    // The raw hostname must not appear as visible subtitle text
    // (it remains in the href attribute, which is expected).
    expect(html).not.toContain(">linkedin.com");
    expect(html).not.toContain(">www.linkedin.com");
  });
});
