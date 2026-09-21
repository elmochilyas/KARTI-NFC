import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => createElement("img", props),
}));

import { PublicProfileView } from "./PublicProfileView";
import type { PublicProfile } from "@/features/profiles/public";

const PROFILE: PublicProfile = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "ahmed-benali",
  display_name: "Ahmed Benali",
  job_title: "Developer",
  company_name: "Atlas",
  bio: "Short bio.",
  avatar_path: null,
  cover_path: null,
  phone: "+212600000000",
  whatsapp: null,
  email: "ahmed@example.com",
  website: "https://atlas.ma",
  address: "123 Main St",
  maps_url: "https://maps.google.com/?q=atlas",
  accent_color: "#0e7c5b",
  theme: "light",
};

const LINKS = [
  {
    id: "223e4567-e89b-12d3-a456-426614174002",
    type: "linkedin",
    label: "LinkedIn",
    url: "https://linkedin.com/in/ahmed",
    sort_order: 0,
  },
];

function render(): string {
  return renderToStaticMarkup(
    createElement(PublicProfileView, {
      profile: PROFILE,
      links: LINKS,
      avatarUrl: null,
      coverUrl: null,
    }),
  );
}

describe("PublicProfileView Share final CTA", () => {
  it("renders the profile with a Share button and attribution", () => {
    const html = render();
    expect(html).toContain("Ahmed Benali");
    expect(html).toContain("Share my profile");
    expect(html).toContain("Send my digital card");
    expect(html).toContain('aria-label="Share my profile"');
    expect(html).toContain("Powered by");
  });

  it("no longer presents Save Contact as the primary action", () => {
    const html = render();
    expect(html).not.toContain("Save Contact");
    expect(html).not.toContain("/api/vcard");
  });

  it("places Share after all profile content, before attribution", () => {
    const html = render();
    const share = html.indexOf("Share my profile");
    expect(share).toBeGreaterThan(-1);
    // After quick actions, information, about, and extra links…
    expect(share).toBeGreaterThan(html.indexOf("Quick actions"));
    expect(share).toBeGreaterThan(html.indexOf("Contact Information"));
    expect(share).toBeGreaterThan(html.indexOf("LinkedIn"));
    // …and before the Karti attribution.
    expect(share).toBeLessThan(html.indexOf("Powered by"));
  });

  it("exposes no private data in the public markup", () => {
    const html = render();
    expect(html).not.toContain("123e4567-e89b-12d3-a456-426614174001");
    expect(html).not.toContain("dashboard");
    expect(html).not.toContain("notes");
  });

  it("keeps a wrapping mobile-safe layout without fixed pixel widths", () => {
    const html = render();
    expect(html).toContain("max-w-[480px]");
    expect(html).toContain("overflow-hidden");
    expect(html).toContain("break-words");
    // No fixed pixel widths (max-w-* frame excluded — it constrains, not fixes).
    expect(html).not.toMatch(/(?<!max-)w-\[\d+px\]/);
  });
});
