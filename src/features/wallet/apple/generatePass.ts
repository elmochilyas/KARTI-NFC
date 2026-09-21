import type { PublicWalletData } from "../types";
import { sanitizeWalletField } from "../types";
import { validateSafeExternalUrl } from "@/domain/urls";

/**
 * Apple Wallet pass model (pure, secret-free, ADR-046).
 *
 * Builds the generic-style pass.json payload from public wallet data only.
 * Signing + images happen in service.ts; this module is fully unit-testable
 * with hostile fixtures. The QR/code payload is ALWAYS the immutable
 * identity URL (/u/{publicCode}) — never the mutable NFC /t/{shortCode}.
 */

export type ApplePassModel = Record<string, unknown>;

const ACCENT_FALLBACK = "#0e7c5b";

function accentOrFallback(input: unknown): string {
  return typeof input === "string" && /^#[0-9a-fA-F]{6}$/.test(input) ? input : ACCENT_FALLBACK;
}

function hexToAppleRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

type PassField = { key: string; label?: string; value: string };
type DetectorField = PassField & { dataDetectorTypes: string[] };

function field(key: string, label: string | null, value: string | null): PassField | null {
  if (value === null) return null;
  return label === null ? { key, value } : { key, label, value };
}

/** Exported for unit tests (color contract). */
export function appleBackgroundColor(accent: unknown): string {
  return hexToAppleRgb(accentOrFallback(accent));
}

/**
 * Build the pass.json model. Every free-text value is sanitized
 * (CR/LF/control-char stripped, length-capped); URLs are revalidated
 * http(s) at generation time — never trust stored contents blindly.
 */
export function buildApplePassModel(
  data: PublicWalletData,
  identityUrl: string,
  config: { passTypeId: string; teamId: string },
): ApplePassModel {
  const name = sanitizeWalletField(data.displayName, 60) ?? "Karti Card";
  const company = sanitizeWalletField(data.companyName, 60);
  const title = sanitizeWalletField(data.jobTitle, 60);
  const phone = sanitizeWalletField(data.phone, 40);
  const email = sanitizeWalletField(data.email, 80);
  const website = data.website ? (validateSafeExternalUrl(data.website) ?? null) : null;

  // name is never null (falls back to "Karti Card" above).
  const primaryFields: PassField[] = [{ key: "name", label: company ?? "Contact", value: name }];

  const secondaryFields: PassField[] = [];
  const titleField = field("title", "Title", title);
  if (titleField) secondaryFields.push(titleField);
  const companyField = field("company", "Company", company);
  if (companyField) secondaryFields.push(companyField);

  const auxiliaryFields: (PassField | DetectorField)[] = [];
  if (phone) {
    auxiliaryFields.push({
      key: "phone",
      label: "Phone",
      value: phone,
      dataDetectorTypes: ["PKDataDetectorTypePhoneNumber"],
    });
  }
  if (email) {
    // No PKDataDetectorType for email exists (phone/link/address/calendar
    // only) — the address renders as plain text on the back of the pass.
    auxiliaryFields.push({ key: "email", label: "Email", value: email });
  }

  const backFields: Record<string, unknown>[] = [];
  if (website) {
    backFields.push({
      key: "website",
      label: "Website",
      value: website,
      dataDetectorTypes: ["PKDataDetectorTypeLink"],
    });
  }
  const profileField = field("profile", "Digital card", identityUrl);
  if (profileField) backFields.push(profileField);
  backFields.push({ key: "issuer", label: "Issuer", value: "Karti" });

  return {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeId,
    teamIdentifier: config.teamId,
    // Stable serial: re-saving the same profile updates the pass in place.
    serialNumber: `karti-${data.publicCode}`,
    organizationName: company ?? name,
    description: `${name} — Karti digital card`,
    backgroundColor: appleBackgroundColor(data.accentColor),
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(255, 255, 255)",
    generic: {
      headerFields: [],
      primaryFields,
      secondaryFields,
      auxiliaryFields,
      backFields,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: identityUrl,
        messageEncoding: "iso-8859-1",
      },
    ],
  };
}

/** Safe .pkpass filename from the normalized slug (header-injection hygiene). */
export function applePassFilename(slug: string): string {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
  return `${safe === "" ? "karti-card" : safe}.pkpass`;
}
