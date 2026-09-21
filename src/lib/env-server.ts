import "server-only";

/**
 * Server-only secrets. The `server-only` import above makes any client-side
 * (or browser-bundle) import a hard build error — stronger than the previous
 * runtime `typeof window` guard. Never add NEXT_PUBLIC_* reads here; those
 * belong in `./env`, which must stay browser-safe.
 */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (see .env.example).");
  }
  return key;
}

/**
 * Wallet credentials (ADR-046). All server-only: the `server-only` import
 * above makes any client-bundle import a hard build error, and
 * admin-isolation.test.ts statically forbids these names in client code.
 *
 * Getters return null (not throw) when unconfigured so public pages can
 * degrade to the Copy/Share fallback instead of crashing — the CTA is
 * credential-gated, never fake. Direct route hits fail safe with a generic
 * message. Never log these values.
 */

export type AppleWalletConfig = {
  passTypeId: string;
  teamId: string;
  /** Raw P12 bytes (base64-decoded once, server memory only). */
  certificate: Buffer;
  passphrase: string;
  /** Apple WWDR intermediate (PEM) — required to sign passes. */
  wwdrCertificate: string;
};

function readWalletVar(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getAppleWalletConfig(): AppleWalletConfig | null {
  const passTypeId = readWalletVar("APPLE_PASS_TYPE_ID");
  const teamId = readWalletVar("APPLE_TEAM_ID");
  const p12Base64 = readWalletVar("APPLE_PASS_CERT_P12_BASE64");
  const passphrase = readWalletVar("APPLE_PASS_CERT_PASSPHRASE");
  const wwdrRaw = readWalletVar("APPLE_WWDR_CERT_PEM");
  if (!passTypeId || !teamId || !p12Base64 || !passphrase || !wwdrRaw) return null;
  let certificate: Buffer;
  try {
    certificate = Buffer.from(p12Base64, "base64");
  } catch {
    return null;
  }
  if (certificate.length === 0) return null;
  const wwdrCertificate = wwdrRaw.includes("\\n") ? wwdrRaw.replace(/\\n/g, "\n") : wwdrRaw;
  if (!wwdrCertificate.includes("BEGIN CERTIFICATE")) return null;
  return { passTypeId, teamId, certificate, passphrase, wwdrCertificate };
}

export function isAppleWalletConfigured(): boolean {
  return getAppleWalletConfig() !== null;
}

export type GoogleWalletConfig = {
  issuerId: string;
  serviceAccountEmail: string;
  /** PEM private key with real newlines (env files store `\n` escapes). */
  privateKey: string;
};

export function getGoogleWalletConfig(): GoogleWalletConfig | null {
  const issuerId = readWalletVar("GOOGLE_WALLET_ISSUER_ID");
  const serviceAccountEmail = readWalletVar("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL");
  const rawKey = readWalletVar("GOOGLE_WALLET_PRIVATE_KEY");
  if (!issuerId || !serviceAccountEmail || !rawKey) return null;
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
  if (!privateKey.includes("BEGIN PRIVATE KEY")) return null;
  return { issuerId, serviceAccountEmail, privateKey };
}

export function isGoogleWalletConfigured(): boolean {
  return getGoogleWalletConfig() !== null;
}
