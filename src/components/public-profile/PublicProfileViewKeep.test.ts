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
  public_code: "ABCD234567",
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

describe("PublicProfileView Keep this Card", () => {
  it("renders the Keep CTA with its caption in the bottom section", () => {
    const html = render();
    expect(html).toContain("Keep this card");
    expect(html).toContain("Keep Profile");
    expect(html).toContain("Keep this digital card on your phone");
    expect(html).toContain('aria-label="Keep Profile');
  });

  it("orders Keep after profile content, before Share and attribution", () => {
    const html = render();
    const keep = html.indexOf("Keep this card");
    const share = html.indexOf("Share my profile");
    expect(keep).toBeGreaterThan(-1);
    expect(share).toBeGreaterThan(-1);
    // After contact actions, profile information, and links…
    expect(keep).toBeGreaterThan(html.indexOf("Quick actions"));
    expect(keep).toBeGreaterThan(html.indexOf("Contact Information"));
    expect(keep).toBeGreaterThan(html.indexOf("LinkedIn"));
    // …before Share Profile…
    expect(keep).toBeLessThan(share);
    // …and Share stays the final CTA before attribution.
    expect(share).toBeLessThan(html.indexOf("Powered by"));
  });

  it("carries no wallet references anywhere in the public markup", () => {
    const html = render();
    expect(html.toLowerCase()).not.toContain("wallet");
    expect(html).not.toContain("Add to Wallet");
  });

  it("keeps Share functional alongside Keep", () => {
    const html = render();
    expect(html).toContain("Share my profile");
    expect(html).toContain("Send my digital card");
  });
});
