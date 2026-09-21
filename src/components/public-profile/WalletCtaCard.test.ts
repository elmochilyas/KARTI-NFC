import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => createElement("img", props),
}));

import { PublicProfileView } from "./PublicProfileView";
import { WalletCtaCard } from "./WalletCtaCard";
import type { PublicProfile } from "@/features/profiles/public";

const PROFILE: PublicProfile = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "ahmed-benali",
  public_code: "ABCD234567",
  display_name: "Ahmed Benali",
  job_title: "Developer",
  company_name: "Atlas",
  bio: null,
  avatar_path: null,
  cover_path: null,
  phone: "+212600000000",
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: "#0e7c5b",
  theme: "light",
};

function renderView(
  wallet: { publicCode: string; appleReady: boolean; googleReady: boolean } | null,
): string {
  return renderToStaticMarkup(
    createElement(PublicProfileView, {
      profile: PROFILE,
      links: [],
      avatarUrl: null,
      coverUrl: null,
      wallet,
    }),
  );
}

describe("WalletCtaCard", () => {
  it("renders the keep-this-card CTA with identity copy", () => {
    const html = renderToStaticMarkup(
      createElement(WalletCtaCard, {
        publicCode: "ABCD234567",
        displayName: "Ahmed Benali",
        appleReady: true,
        googleReady: true,
        dark: false,
      }),
    );
    expect(html).toContain("Keep this card");
    expect(html).toContain("Add to Wallet");
    expect(html).toContain("Keep this digital card on your phone.");
  });

  it("never exposes the NFC destination URL", () => {
    const html = renderToStaticMarkup(
      createElement(WalletCtaCard, {
        publicCode: "ABCD234567",
        displayName: "Ahmed",
        appleReady: false,
        googleReady: false,
        dark: true,
      }),
    );
    expect(html).not.toContain("/t/");
    expect(html).toContain("Add to Wallet");
  });
});

describe("PublicProfileView wallet placement", () => {
  it("omits the wallet card when identity is unavailable", () => {
    const html = renderView(null);
    expect(html).not.toContain("Add to Wallet");
    expect(html).toContain("Share my profile");
  });

  it("orders wallet before Share with no NFC URLs", () => {
    const html = renderView({ publicCode: "ABCD234567", appleReady: true, googleReady: false });
    const walletAt = html.indexOf("Add to Wallet");
    const shareAt = html.indexOf("Share my profile");
    expect(walletAt).toBeGreaterThan(-1);
    expect(shareAt).toBeGreaterThan(-1);
    expect(walletAt).toBeLessThan(shareAt);
    expect(html).not.toContain("/t/");
  });
});
