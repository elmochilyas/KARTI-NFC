import { describe, expect, it } from "vitest";
import { buildVCard, escapeVCardText, pickTelNumber } from "./vcard";

describe("escapeVCardText", () => {
  it("escapes backslash, comma, semicolon, and newlines", () => {
    expect(escapeVCardText("a\\b,c;d")).toBe("a\\\\b\\,c\\;d");
    expect(escapeVCardText("line1\nline2")).toBe("line1\\nline2");
    expect(escapeVCardText("line1\r\nline2")).toBe("line1\\nline2");
    expect(escapeVCardText("line1\rline2")).toBe("line1\\nline2");
  });
});

describe("pickTelNumber", () => {
  it("prefers phone and skips whatsapp URLs", () => {
    expect(pickTelNumber("+212 600", "https://wa.me/212")).toBe("+212 600");
    expect(pickTelNumber("", "+212612345678")).toBe("+212612345678");
    expect(pickTelNumber("", "https://wa.me/212612345678")).toBeNull();
    expect(pickTelNumber("", "abc")).toBeNull();
    expect(pickTelNumber(null, null)).toBeNull();
  });
});

describe("buildVCard", () => {
  it("builds a name-only vCard with CRLF endings", () => {
    const vcf = buildVCard({ displayName: "Ahmed Benali" });
    expect(vcf).toBe("BEGIN:VCARD\r\nVERSION:3.0\r\nN:;;;;\r\nFN:Ahmed Benali\r\nEND:VCARD\r\n");
    expect(vcf).not.toContain("\n\n");
  });

  it("builds a full contact", () => {
    const vcf = buildVCard({
      displayName: "Ahmed Benali",
      jobTitle: "Developer",
      companyName: "Atlas",
      phone: "+212600000000",
      email: "ahmed@example.com",
      website: "https://example.com",
      address: "Marrakech Medina",
      profileUrl: "https://karti.app/ahmed-benali",
    });
    for (const line of [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:;;;;",
      "FN:Ahmed Benali",
      "ORG:Atlas",
      "TITLE:Developer",
      "TEL;TYPE=CELL,VOICE:+212600000000",
      "EMAIL;TYPE=INTERNET:ahmed@example.com",
      "URL:https://example.com",
      "URL:https://karti.app/ahmed-benali",
      "ADR;TYPE=HOME:;;Marrakech Medina;;;;",
      "END:VCARD",
    ]) {
      expect(vcf).toContain(line + "\r\n");
    }
  });

  it("dedupes identical website and profile URLs", () => {
    const vcf = buildVCard({
      displayName: "A",
      website: "https://x.com",
      profileUrl: "https://x.com",
    });
    expect(vcf.match(/URL:/g)?.length).toBe(1);
  });

  it("skips non-http URLs", () => {
    const vcf = buildVCard({ displayName: "A", website: "javascript:alert(1)" });
    expect(vcf).not.toContain("javascript:");
  });

  it("handles Arabic and French Unicode", () => {
    const vcf = buildVCard({
      displayName: "أحمد بنعلي",
      companyName: "Société Élégance",
      jobTitle: "Younès El Amrani",
    });
    expect(vcf).toContain("FN:أحمد بنعلي\r\n");
    expect(vcf).toContain("ORG:Société Élégance\r\n");
    expect(vcf).toContain("TITLE:Younès El Amrani\r\n");
  });

  it("escapes commas, semicolons, and backslashes", () => {
    const vcf = buildVCard({
      displayName: "Doe, John",
      companyName: "Atlas; Group",
      jobTitle: "Director\\Sales",
    });
    expect(vcf).toContain("FN:Doe\\, John\r\n");
    expect(vcf).toContain("ORG:Atlas\\; Group\r\n");
    expect(vcf).toContain("TITLE:Director\\\\Sales\r\n");
  });

  it("keeps newline injection as data", () => {
    const vcf = buildVCard({ displayName: "Alice\nTEL:+123" });
    expect(vcf).toContain("FN:Alice\\nTEL:+123\r\n");
    expect(vcf.match(/^TEL;/gm)?.length ?? 0).toBe(0);
  });

  it("omits missing optional fields without undefined/null literals", () => {
    const vcf = buildVCard({ displayName: "Solo" });
    for (const token of ["ORG:", "TITLE:", "TEL;", "EMAIL:", "URL:", "ADR;", "undefined", "null"]) {
      expect(vcf).not.toContain(token);
    }
  });
});
