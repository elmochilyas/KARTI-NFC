import "server-only";
import sharp from "sharp";
import forge from "node-forge";
import { PKPass } from "passkit-generator";
import { getAppleWalletConfig } from "@/lib/env-server";
import { publicAssetPathUrl } from "@/features/profiles/storage";
import { applePassFilename, buildApplePassModel } from "./generatePass";
import {
  WALLET_GENERIC_FAILURE,
  sanitizeWalletField,
  type PublicWalletData,
  type WalletResult,
} from "../types";

/**
 * Apple Wallet service (server-only, ADR-046).
 *
 * Signs a .pkpass with the operator's Pass Type ID certificate. Credentials
 * never leave the server: P12 splitting, signing, and image fetching all
 * happen here; the route only receives the finished buffer. Every failure
 * collapses to the generic message — pass material and key errors never
 * reach the visitor (and per repo rules, nothing is console-logged).
 */

export const APPLE_PKPASS_MIME = "application/vnd.apple.pkpass";

export function isAppleWalletConfigured(): boolean {
  try {
    return getAppleWalletConfig() !== null;
  } catch {
    return false;
  }
}

/**
 * Split a P12 bundle into PEM signer cert + key. Exported for unit tests
 * (tests mint a throwaway self-signed P12 with forge — no real secrets).
 */
export function splitP12(p12: Buffer, passphrase: string): { certPem: string; keyPem: string } {
  const asn1 = forge.asn1.fromDer(p12.toString("binary"));
  const store = forge.pkcs12.pkcs12FromAsn1(asn1, passphrase);
  let cert: forge.pki.Certificate | null = null;
  let key: forge.pki.PrivateKey | null = null;
  for (const safeContents of store.safeContents) {
    for (const bag of safeContents.safeBags) {
      if (bag.type === forge.pki.oids.certBag && !cert) {
        cert = bag.cert ?? null;
      }
      if (
        (bag.type === forge.pki.oids.pkcs8ShroudedKeyBag || bag.type === forge.pki.oids.keyBag) &&
        !key
      ) {
        key = (bag as { key?: forge.pki.PrivateKey }).key ?? null;
      }
    }
  }
  if (!cert || !key) throw new Error("P12 holds no certificate/key pair.");
  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(key),
  };
}

/**
 * Build pass artwork: avatar (180px icon + wide logo) or an accent-solid
 * fallback when the profile has no photo. Text is never rendered to PNG
 * (no font pipeline) — the photo-or-color tile is enough beside the name.
 */
export async function buildPassArtwork(
  avatarBytes: Buffer | null,
  accent: unknown,
): Promise<Record<string, Buffer>> {
  const fallback =
    typeof accent === "string" && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#0e7c5b";
  if (avatarBytes && avatarBytes.length > 0) {
    try {
      const [icon, logo] = await Promise.all([
        sharp(avatarBytes).resize(180, 180, { fit: "cover" }).png().toBuffer(),
        sharp(avatarBytes).resize(320, 100, { fit: "cover" }).png().toBuffer(),
      ]);
      return { "icon.png": icon, "logo.png": logo };
    } catch {
      // Corrupt bytes → fall through to the solid tile.
    }
  }
  const [icon, logo] = await Promise.all([
    sharp({ create: { width: 180, height: 180, channels: 3, background: fallback } })
      .png()
      .toBuffer(),
    sharp({ create: { width: 320, height: 100, channels: 3, background: fallback } })
      .png()
      .toBuffer(),
  ]);
  return { "icon.png": icon, "logo.png": logo };
}

async function fetchAvatarBytes(avatarPath: string | null): Promise<Buffer | null> {
  const url = publicAssetPathUrl(avatarPath);
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    // 2 MB cap: artwork must stay small; oversized bytes fall back to solid.
    if (bytes.length === 0 || bytes.length > 2 * 1024 * 1024) return null;
    return bytes;
  } catch {
    return null;
  }
}

export type ApplePassOutput = {
  buffer: Buffer;
  filename: string;
  mimeType: typeof APPLE_PKPASS_MIME;
};

/**
 * Generate + sign the pass. Returns the finished buffer; throws nothing —
 * all failures (missing creds, bad P12, signing errors) become the generic
 * failure result.
 */
export async function createAppleWalletPass(
  data: PublicWalletData,
  identityUrl: string,
): Promise<WalletResult<ApplePassOutput>> {
  const config = getAppleWalletConfig();
  if (!config) {
    return { ok: false, error: { code: "WALLET_NOT_CONFIGURED", message: WALLET_GENERIC_FAILURE } };
  }
  try {
    const name = sanitizeWalletField(data.displayName, 60);
    if (!name) {
      return { ok: false, error: { code: "GENERATION_FAILED", message: WALLET_GENERIC_FAILURE } };
    }
    const { certPem, keyPem } = splitP12(config.certificate, config.passphrase);
    const model = buildApplePassModel(data, identityUrl, {
      passTypeId: config.passTypeId,
      teamId: config.teamId,
    });
    const avatarBytes = await fetchAvatarBytes(data.avatarPath);
    const artwork = await buildPassArtwork(avatarBytes, data.accentColor);
    const pass = new PKPass(
      { "pass.json": Buffer.from(JSON.stringify(model)) as Buffer, ...artwork },
      {
        wwdr: config.wwdrCertificate,
        signerCert: certPem,
        signerKey: keyPem,
        signerKeyPassphrase: config.passphrase,
      },
    );
    const buffer = pass.getAsBuffer();
    return {
      ok: true,
      data: { buffer, filename: applePassFilename(data.slug), mimeType: APPLE_PKPASS_MIME },
    };
  } catch {
    return { ok: false, error: { code: "GENERATION_FAILED", message: WALLET_GENERIC_FAILURE } };
  }
}
