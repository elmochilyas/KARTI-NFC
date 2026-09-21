import "server-only";
import { getGoogleWalletConfig } from "@/lib/env-server";
import { getAppUrl } from "@/lib/env";
import { publicAssetPathUrl } from "@/features/profiles/storage";
import { identityUrlForPublicCode } from "@/domain/publicCode";
import { buildGoogleWalletObject, googleSaveLink, signGoogleSaveJwt } from "./generateLink";
import {
  WALLET_GENERIC_FAILURE,
  sanitizeWalletField,
  type PublicWalletData,
  type WalletResult,
} from "../types";

/**
 * Google Wallet service (server-only, ADR-046).
 *
 * Signs Save-to-Wallet links with the operator's service-account key.
 * Stateless: no Wallet API writes happen per request. One-time operator
 * setup (outside this codebase) — create the GenericClass once:
 *
 *   POST https://walletobjects.googleapis.com/walletobjects/v1/genericClass
 *   { "id": "{issuerId}.karti_profile_v1" }
 *
 * with a service-account OAuth token. Afterwards every tap mints a fresh
 * signed link. Failures collapse to the generic message.
 */

function readKeyId(): string | null {
  const value = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID?.trim();
  return value ? value : null;
}

export function isGoogleWalletConfigured(): boolean {
  try {
    return getGoogleWalletConfig() !== null;
  } catch {
    return false;
  }
}

export async function createGoogleWalletSaveLink(
  data: PublicWalletData,
): Promise<WalletResult<string>> {
  const config = getGoogleWalletConfig();
  if (!config) {
    return { ok: false, error: { code: "WALLET_NOT_CONFIGURED", message: WALLET_GENERIC_FAILURE } };
  }
  try {
    const name = sanitizeWalletField(data.displayName, 60);
    if (!name) {
      return { ok: false, error: { code: "GENERATION_FAILED", message: WALLET_GENERIC_FAILURE } };
    }
    const appUrl = getAppUrl();
    const identityUrl = identityUrlForPublicCode(appUrl, data.publicCode);
    const object = buildGoogleWalletObject(
      data,
      identityUrl,
      publicAssetPathUrl(data.avatarPath),
      config.issuerId,
    );
    const jwt = await signGoogleSaveJwt(object, appUrl, config, readKeyId());
    return { ok: true, data: googleSaveLink(jwt) };
  } catch {
    return { ok: false, error: { code: "GENERATION_FAILED", message: WALLET_GENERIC_FAILURE } };
  }
}
