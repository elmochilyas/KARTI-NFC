import * as jose from "jose";
import type { GoogleWalletConfig } from "@/lib/env-server";
import { validateSafeExternalUrl } from "@/domain/urls";
import { sanitizeWalletField, type PublicWalletData } from "../types";

/**
 * Google Wallet save-link (Generic pass, ADR-046).
 *
 * Builds the GenericObject and signs the Save-to-Wallet JWT server-side
 * (RS256, service-account key). No Google API writes at runtime — the save
 * link is stateless. One-time operator step: create the GenericClass
 * `{issuerId}.karti_profile_v1` via the Wallet API (see service.ts comment
 * for the class JSON). Credentials arrive as parameters so this module is
 * unit-testable with throwaway keys; service.ts loads the real ones.
 */

export const GOOGLE_SAVE_BASE = "https://pay.google.com/gp/v/save/";
export const GOOGLE_WALLET_CLASS_SUFFIX = "karti_profile_v1";

export function googleObjectId(issuerId: string, publicCode: string): string {
  return `${issuerId}.${publicCode}`;
}

export function googleClassId(issuerId: string): string {
  return `${issuerId}.${GOOGLE_WALLET_CLASS_SUFFIX}`;
}

function languageString(value: string | null, fallback = ""): { language: string; value: string } {
  return { language: "en-US", value: value ?? fallback };
}

/**
 * Build the GenericObject payload. URLs revalidated http(s); free text
 * sanitized; avatar referenced by its public URL (already public media —
 * no new exposure, no bytes embedded).
 */
export function buildGoogleWalletObject(
  data: PublicWalletData,
  identityUrl: string,
  avatarUrl: string | null,
  issuerId: string,
): Record<string, unknown> {
  const name = sanitizeWalletField(data.displayName, 60) ?? "Karti Card";
  const company = sanitizeWalletField(data.companyName, 60);
  const title = sanitizeWalletField(data.jobTitle, 60);
  const phone = sanitizeWalletField(data.phone, 40);
  const email = sanitizeWalletField(data.email, 80);
  const website = data.website ? (validateSafeExternalUrl(data.website) ?? null) : null;
  const subtitle = [title, company].filter((part): part is string => part !== null).join(" · ");

  const textModules: Record<string, unknown>[] = [];
  if (phone) textModules.push({ header: "Phone", body: phone });
  if (email) textModules.push({ header: "Email", body: email });

  const links: Record<string, unknown>[] = [];
  if (website) links.push({ uri: website, description: "Website" });
  links.push({ uri: identityUrl, description: "Digital card" });
  if (phone) {
    const tel = `tel:${phone.replace(/[^\d+]/g, "")}`;
    if (tel !== "tel:") links.push({ uri: tel, description: "Call" });
  }

  return {
    id: googleObjectId(issuerId, data.publicCode),
    classId: googleClassId(issuerId),
    genericType: "GENERIC_TYPE_UNSPECIFIED",
    state: "ACTIVE",
    cardTitle: languageString(name),
    header: languageString(name),
    subheader: languageString(subtitle === "" ? (company ?? "") : subtitle),
    hexBackgroundColor: "#0e2a3f",
    logo: avatarUrl
      ? { sourceUri: { uri: avatarUrl }, contentDescription: languageString(`${name} logo`) }
      : undefined,
    textModulesData: textModules,
    linksModuleData: { uris: links },
    barcode: { type: "QR_CODE", value: identityUrl, alternateText: name },
  };
}

export type GoogleJwtClaims = {
  iss: string;
  aud: "google";
  typ: "savetowallet";
  iat: number;
  origins: string[];
  payload: { genericObjects: Record<string, unknown>[] };
};

/**
 * Sign the Save-to-Wallet JWT. kid (private key id) is optional — included
 * when the operator provides GOOGLE_SERVICE_ACCOUNT_KEY_ID.
 */
export async function signGoogleSaveJwt(
  object: Record<string, unknown>,
  appUrl: string,
  config: GoogleWalletConfig,
  keyId: string | null,
  issuedAtSeconds?: number,
): Promise<string> {
  const key = await jose.importPKCS8(config.privateKey, "RS256");
  const iat = issuedAtSeconds ?? Math.floor(Date.now() / 1000);
  const claims: GoogleJwtClaims = {
    iss: config.serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat,
    origins: [appUrl.replace(/\/+$/, "")],
    payload: { genericObjects: [object] },
  };
  return new jose.SignJWT(claims as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: "RS256", typ: "JWT", ...(keyId ? { kid: keyId } : {}) })
    .sign(key);
}

export function googleSaveLink(jwt: string): string {
  return `${GOOGLE_SAVE_BASE}${jwt}`;
}
