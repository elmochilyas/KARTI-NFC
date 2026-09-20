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
  bio: null,
  avatar_path: null,
  cover_path: null,
  phone: "+212600000000",
  whatsapp: null,
  email: "ahmed@example.com",
  website: "https://atlas.ma",
  address: null,
  maps_url: null,
  accent_color: "#0e7c5b",
  theme: "light",
};

describe("PublicProfileView Save Contact wiring", () => {
  it("renders both Save actions against the canonical vCard endpoint", () => {
    const html = renderToStaticMarkup(
      createElement(PublicProfileView, {
        profile: PROFILE,
        links: [],
        avatarUrl: null,
        coverUrl: null,
      }),
    );
    // In-flow CTA + sticky bar share one href (`.vcf` alias for OS sniffers).
    expect(html.split('href="/api/vcard/ahmed-benali.vcf"')).toHaveLength(3);
    expect(html).toContain(">Save Contact<");
    // Direct navigation for the Save anchors: no forced-download and no
    // new-tab attributes on them. (External website rows elsewhere on the
    // page legitimately use target=_blank.)
    const saveAnchors = html.match(/<a[^>]*href="\/api\/vcard[^"]*"[^>]*>/g) ?? [];
    expect(saveAnchors).toHaveLength(2);
    for (const anchor of saveAnchors) {
      expect(anchor).not.toMatch(/\bdownload\s*=/i);
      expect(anchor).not.toMatch(/\btarget\s*=/i);
    }
    // No technical file-format words face normal users.
    expect(html).not.toContain("Download file");
    expect(html).not.toContain(">VCF<");
    // Fallback stays hidden until the native flow actually fails.
    expect(html).not.toContain("open Contacts");
  });
});
