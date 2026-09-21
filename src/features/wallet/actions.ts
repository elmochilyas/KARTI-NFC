import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicProfileByCode } from "@/features/profiles/public";
import { identityUrlForPublicCode } from "@/domain/publicCode";
import { getAppUrl } from "@/lib/env";
import { detectPlatform } from "./detectPlatform";
import { APPLE_PKPASS_MIME, createAppleWalletPass, isAppleWalletConfigured } from "./apple/service";
import { createGoogleWalletSaveLink, isGoogleWalletConfigured } from "./google/service";
import { toPublicWalletData, type WalletErrorCode, type WalletPlatform } from "./types";

/**
 * Wallet request boundary (server-only, ADR-046).
 *
 * Single orchestration used by GET /api/wallet/[code]: ACTIVE-only load →
 * platform detect → correct wallet response. No mutations, no private data.
 * The visitor never chooses a wallet — detection decides. Desktop callers
 * get PLATFORM_UNSUPPORTED so the island can show the phone-modal instead.
 */

export type WalletReadiness = {
  appleReady: boolean;
  googleReady: boolean;
};

/** Plain booleans for pages to gate the CTA (credential-gated, never fake). */
export function getWalletReadiness(): WalletReadiness {
  return {
    appleReady: isAppleWalletConfigured(),
    googleReady: isGoogleWalletConfigured(),
  };
}

export type WalletRouteOutput =
  | { ok: true; kind: "APPLE_PASS"; buffer: Buffer; filename: string; mimeType: string }
  | { ok: true; kind: "GOOGLE_LINK"; url: string }
  | { ok: false; error: { code: WalletErrorCode; message: string } };

function unavailable(): WalletRouteOutput {
  // Same generic 404 body style as the vCard route — DRAFT/INACTIVE/unknown
  // are indistinguishable, and no slug-vs-code oracle is exposed.
  return { ok: false, error: { code: "PROFILE_UNAVAILABLE", message: "Not found" } };
}

export async function resolveWalletForRequest(
  rawCode: unknown,
  userAgent: string | null,
  platformOverride?: WalletPlatform,
): Promise<WalletRouteOutput> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return unavailable();
  }

  const loaded = await getPublicProfileByCode(rawCode, supabase);
  if (!loaded) return unavailable();

  const platform = platformOverride ?? detectPlatform(userAgent ?? "");
  const data = toPublicWalletData(loaded.profile);
  const identityUrl = identityUrlForPublicCode(getAppUrl(), data.publicCode);

  if (platform === "ios") {
    const pass = await createAppleWalletPass(data, identityUrl);
    if (!pass.ok) return { ok: false, error: pass.error };
    return {
      ok: true,
      kind: "APPLE_PASS",
      buffer: pass.data.buffer,
      filename: pass.data.filename,
      mimeType: APPLE_PKPASS_MIME,
    };
  }

  if (platform === "android") {
    const link = await createGoogleWalletSaveLink(data);
    if (!link.ok) return { ok: false, error: link.error };
    return { ok: true, kind: "GOOGLE_LINK", url: link.data };
  }

  return {
    ok: false,
    error: { code: "PLATFORM_UNSUPPORTED", message: "Wallet is available on mobile devices." },
  };
}
