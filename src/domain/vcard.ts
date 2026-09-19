/**
 * vCard 3.0 builder (specs/PRD.md §9).
 *
 * vCard 3.0 chosen for maximum iOS/Android Contacts compatibility.
 * No photo embedding in MVP (size + compatibility).
 * No dependencies — careful escaping makes a small domain module enough.
 *
 * All inputs are untrusted: escaping keeps newlines/commas/semicolons as
 * data so values can never inject extra properties or break structure.
 */

export type VCardInput = {
  displayName: string;
  jobTitle?: string | null;
  companyName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  profileUrl?: string | null;
};

/** Escape text per RFC 2426 §5.8.4: backslash, newline, comma, semicolon. */
export function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\\n")
    .replace(/\r/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function clean(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Primary voice number: stored phone first. WhatsApp doubles as the number
 * only when no phone exists and it normalizes to real digits (never a URL,
 * never duplicated alongside an identical phone).
 */
export function pickTelNumber(
  phone: string | null | undefined,
  whatsapp: string | null | undefined,
): string | null {
  const direct = clean(phone);
  if (direct) return direct;
  const wa = clean(whatsapp);
  if (!wa || /^https?:\/\//i.test(wa)) return null;
  const digits = wa.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return wa;
}

/** Build a complete vCard 3.0 document with CRLF line endings. */
export function buildVCard(input: VCardInput): string {
  const name = clean(input.displayName) ?? "Karti Contact";
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  // N is structurally required; MVP has no first/last split — never invent one.
  lines.push("N:;;;;");
  lines.push(`FN:${escapeVCardText(name)}`);

  const company = clean(input.companyName);
  if (company) lines.push(`ORG:${escapeVCardText(company)}`);

  const title = clean(input.jobTitle);
  if (title) lines.push(`TITLE:${escapeVCardText(title)}`);

  const tel = pickTelNumber(input.phone, input.whatsapp);
  if (tel) lines.push(`TEL;TYPE=CELL,VOICE:${escapeVCardText(tel)}`);

  const email = clean(input.email);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardText(email)}`);

  const website = clean(input.website);
  if (website && isHttpUrl(website)) lines.push(`URL:${escapeVCardText(website)}`);

  const profileUrl = clean(input.profileUrl);
  if (profileUrl && isHttpUrl(profileUrl) && profileUrl !== website) {
    lines.push(`URL:${escapeVCardText(profileUrl)}`);
  }

  const address = clean(input.address);
  if (address) lines.push(`ADR;TYPE=HOME:;;${escapeVCardText(address)};;;;`);

  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}
