import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/features/profiles/public", () => ({ getPublicProfileByCode: vi.fn() }));
vi.mock("@/features/wallet/apple/service", () => ({
  APPLE_PKPASS_MIME: "application/vnd.apple.pkpass",
  createAppleWalletPass: vi.fn(),
  isAppleWalletConfigured: vi.fn(),
}));
vi.mock("@/features/wallet/google/service", () => ({
  createGoogleWalletSaveLink: vi.fn(),
  isGoogleWalletConfigured: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicProfileByCode } from "@/features/profiles/public";
import { createAppleWalletPass, isAppleWalletConfigured } from "@/features/wallet/apple/service";
import {
  createGoogleWalletSaveLink,
  isGoogleWalletConfigured,
} from "@/features/wallet/google/service";
import { getWalletReadiness, resolveWalletForRequest } from "./actions";

const PROFILE = {
  id: "uuid",
  profile_type: "PERSON",
  slug: "ahmed-benali",
  public_code: "ABCD234567",
  display_name: "Ahmed Benali",
  job_title: null,
  company_name: null,
  bio: null,
  avatar_path: null,
  cover_path: null,
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: null,
  theme: "light",
};

const LOADED = { profile: PROFILE, links: [] };
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";

beforeEach(() => {
  vi.mocked(createAdminClient).mockReturnValue({} as never);
  vi.mocked(getPublicProfileByCode).mockResolvedValue(LOADED as never);
});

describe("resolveWalletForRequest", () => {
  it("serves the Apple pass on iOS with the /u/ identity URL (never /t/)", async () => {
    vi.mocked(createAppleWalletPass).mockResolvedValue({
      ok: true,
      data: { buffer: Buffer.from("pk"), filename: "ahmed-benali.pkpass", mimeType: "x" },
    } as never);
    const outcome = await resolveWalletForRequest("abcd234567", IPHONE_UA);
    expect(outcome).toMatchObject({ ok: true, kind: "APPLE_PASS" });
    expect(createAppleWalletPass).toHaveBeenCalledWith(
      expect.objectContaining({ publicCode: "ABCD234567" }),
      "http://localhost:3000/u/ABCD234567",
    );
    expect(JSON.stringify(vi.mocked(createAppleWalletPass).mock.calls)).not.toContain("/t/");
  });

  it("serves the Google save link on Android", async () => {
    vi.mocked(createGoogleWalletSaveLink).mockResolvedValue({
      ok: true,
      data: "https://pay.google.com/gp/v/save/jwt",
    });
    const outcome = await resolveWalletForRequest("ABCD234567", ANDROID_UA);
    expect(outcome).toEqual({
      ok: true,
      kind: "GOOGLE_LINK",
      url: "https://pay.google.com/gp/v/save/jwt",
    });
  });

  it("rejects desktop with the phone-modal signal", async () => {
    const outcome = await resolveWalletForRequest("ABCD234567", "Mozilla/5.0 (Windows NT)");
    expect(outcome).toEqual({
      ok: false,
      error: { code: "PLATFORM_UNSUPPORTED", message: "Wallet is available on mobile devices." },
    });
    expect(createAppleWalletPass).not.toHaveBeenCalled();
    expect(createGoogleWalletSaveLink).not.toHaveBeenCalled();
  });

  it("collapses unknown/inactive profiles to PROFILE_UNAVAILABLE", async () => {
    vi.mocked(getPublicProfileByCode).mockResolvedValue(null);
    for (const code of ["ZZZZZZZZZZ", "!!!", "short", null]) {
      expect(await resolveWalletForRequest(code, IPHONE_UA)).toEqual({
        ok: false,
        error: { code: "PROFILE_UNAVAILABLE", message: "Not found" },
      });
    }
  });

  it("propagates backend failures without detail", async () => {
    vi.mocked(createAppleWalletPass).mockResolvedValue({
      ok: false,
      error: {
        code: "WALLET_NOT_CONFIGURED",
        message: "Unable to create wallet card. Please try again.",
      },
    });
    const outcome = await resolveWalletForRequest("ABCD234567", IPHONE_UA);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.code).toBe("WALLET_NOT_CONFIGURED");
  });

  it("fails closed when server reads are misconfigured", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("missing env");
    });
    expect(await resolveWalletForRequest("ABCD234567", IPHONE_UA)).toEqual({
      ok: false,
      error: { code: "PROFILE_UNAVAILABLE", message: "Not found" },
    });
  });
});

describe("getWalletReadiness", () => {
  it("reflects backend configuration as plain booleans", () => {
    vi.mocked(isAppleWalletConfigured).mockReturnValue(true);
    vi.mocked(isGoogleWalletConfigured).mockReturnValue(false);
    expect(getWalletReadiness()).toEqual({ appleReady: true, googleReady: false });
  });
});
