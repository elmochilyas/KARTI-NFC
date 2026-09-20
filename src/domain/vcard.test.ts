import { describe, expect, it } from "vitest";
import {
  buildVCard,
  escapeVCardText,
  pickTelNumber,
  vcardContentDisposition,
  vcardFilename,
  vcardFilenameBase,
} from "./vcard";

/**
 * Independent structural validator for .vcf output (no vCard dependency):
 * CRLF-only line endings, required document envelope in order, known
 * property names only, URL values restricted to http(s).
 */
function assertWellFormedVCard(
  vcf: string,
  opts: { expectTel: boolean; expectUrls: number },
): void {
  expect(vcf).not.toMatch(/[^\r]\n/);
  expect(vcf.endsWith("\r\n")).toBe(true);
  const lines = vcf.split("\r\n").filter((l) => l !== "");
  expect(lines[0]).toBe("BEGIN:VCARD");
  expect(lines[1]).toBe("VERSION:3.0");
  expect(lines[lines.length - 1]).toBe("END:VCARD");
  const names = lines.map((l) => l.split(/[;:]/, 1)[0]);
  for (const name of ["BEGIN", "VERSION", "N", "FN", "END"]) {
    expect(names).toContain(name);
  }
  const allowed = new Set([
    "BEGIN",
    "VERSION",
    "N",
    "FN",
    "ORG",
    "TITLE",
    "TEL",
    "EMAIL",
    "URL",
    "ADR",
    "END",
  ]);
  for (const name of names) {
    expect(allowed.has(name ?? "")).toBe(true);
  }
  expect(names.includes("TEL")).toBe(opts.expectTel);
  const urls = lines.filter((l) => l.startsWith("URL:"));
  expect(urls).toHaveLength(opts.expectUrls);
  for (const url of urls) {
    expect(url.slice(4)).toMatch(/^https?:\/\//);
  }
}

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

  it("neutralizes hostile stored values (URL/newline/property shapes)", () => {
    const vcf = buildVCard({
      displayName: "<script>alert(1)</script>",
      jobTitle: '"><img src=x onerror=alert(1)>',
      companyName: "Evil\r\nTEL:+1999",
      website: "javascript:alert(1)",
      profileUrl: "data:text/html,<h1>x</h1>",
      email: "a@x.com\r\nBcc:evil@x.com",
    });
    // Markup-looking text stays inert data (downloaded .vcf, never HTML) —
    // what must never happen: executable URLs, injected properties, or raw
    // newlines that would break the line structure.
    expect(vcf).not.toContain("javascript:");
    expect(vcf).not.toContain("data:text/html");
    expect(vcf).not.toContain("URL:");
    // No raw newlines inside values: every \n is part of a CRLF separator.
    expect(vcf).not.toMatch(/[^\r]\n/);
    expect(vcf.match(/^TEL;/gm)?.length ?? 0).toBe(0);
    expect(vcf).toContain("FN:<script>alert(1)</script>\r\n");
    expect(vcf).toContain("ORG:Evil\\nTEL:+1999\r\n");
  });

  it("preserves Arabic and French content with punctuation intact", () => {
    const vcf = buildVCard({
      displayName: "أحمد بن علي",
      jobTitle: "Développeur — café & crème",
      companyName: "Atlas Sàrl",
      phone: "+212 6 12 34 56 78",
      email: "ahmed@atlas.ma",
      website: "https://atlas.ma/café",
      address: "12, Rue de l'Église; Marrakech",
    });
    expect(vcf).toContain("FN:أحمد بن علي\r\n");
    expect(vcf).toContain("TITLE:Développeur — café & crème\r\n");
    expect(vcf).toContain("ORG:Atlas Sàrl\r\n");
    // Comma/semicolon are data-escaped; the text survives.
    expect(vcf).toContain("ADR;TYPE=HOME:;;12\\, Rue de l'Église\\; Marrakech;;;;\r\n");
    expect(vcf).not.toMatch(/[^\r]\n/);
  });

  it("satisfies an independent structural check of the .vcf document", () => {
    const vcf = buildVCard({
      displayName: "Marie Dupont",
      jobTitle: "Avocate",
      companyName: "Cabinet Dupont",
      phone: "+33612345678",
      email: "marie@dupont.fr",
      website: "https://dupont.fr",
      address: "Paris",
      profileUrl: "https://karti.app/marie-dupont",
    });
    assertWellFormedVCard(vcf, { expectTel: true, expectUrls: 2 });
    const minimal = buildVCard({ displayName: "Solo" });
    assertWellFormedVCard(minimal, { expectTel: false, expectUrls: 0 });
  });

  it("omits missing optional fields without undefined/null literals", () => {
    const vcf = buildVCard({ displayName: "Solo" });
    for (const token of ["ORG:", "TITLE:", "TEL;", "EMAIL:", "URL:", "ADR;", "undefined", "null"]) {
      expect(vcf).not.toContain(token);
    }
  });

  it("maps BUSINESS profiles: FN is the business name, ORG falls back to it", () => {
    const withCompany = buildVCard({
      displayName: "Café Noir",
      profileType: "BUSINESS",
      jobTitle: "Restaurant",
      companyName: "Café Noir SARL",
      phone: "+212600000001",
    });
    expect(withCompany).toContain("FN:Café Noir\r\n");
    expect(withCompany).toContain("ORG:Café Noir SARL\r\n");
    expect(withCompany).toContain("TITLE:Restaurant\r\n");

    const withoutCompany = buildVCard({
      displayName: "Café Noir",
      profileType: "BUSINESS",
      jobTitle: "Restaurant",
    });
    // Business name still files under an organization for importers.
    expect(withoutCompany).toContain("FN:Café Noir\r\n");
    expect(withoutCompany).toContain("ORG:Café Noir\r\n");
  });

  it("keeps PERSON profiles without inventing an organization", () => {
    const vcf = buildVCard({ displayName: "Ahmed Benali", profileType: "PERSON" });
    expect(vcf).toContain("FN:Ahmed Benali\r\n");
    expect(vcf).not.toContain("ORG:");
  });

  it("uses WhatsApp as TEL fallback only for valid phone-like values", () => {
    const fromWa = buildVCard({ displayName: "A", whatsapp: "+212612345678" });
    expect(fromWa).toContain("TEL;TYPE=CELL,VOICE:+212612345678\r\n");
    const waUrl = buildVCard({ displayName: "A", whatsapp: "https://wa.me/212612345678" });
    expect(waUrl).not.toContain("TEL;");
    expect(waUrl).not.toContain("wa.me");
  });

  it("emits a proper escaped ADR field", () => {
    const vcf = buildVCard({
      displayName: "A",
      address: "12, Rue de l'Église; Marrakech\nMorocco\\Atlas",
    });
    expect(vcf).toContain(
      "ADR;TYPE=HOME:;;12\\, Rue de l'Église\\; Marrakech\\nMorocco\\\\Atlas;;;;\r\n",
    );
    expect(vcf).not.toMatch(/[^\r]\n/);
  });

  it("builds safe ASCII filenames from slugs", () => {
    expect(vcardFilename("ahmed-benali")).toBe("ahmed-benali.vcf");
    expect(vcardFilenameBase("  Ahmed Benali!! ")).toBe("ahmed-benali");
    expect(vcardFilename("")).toBe("karti-contact.vcf");
    // Header injection shapes collapse to a safe base.
    expect(vcardFilename('a"\r\nBcc:evil')).toBe("a-bcc-evil.vcf");
    expect(vcardFilename("../../etc/passwd")).toBe("etc-passwd.vcf");
    for (const filename of [
      vcardFilename("ahmed-benali"),
      vcardFilename('a"\r\nBcc:evil'),
      vcardFilename("../../etc/passwd"),
    ]) {
      expect(filename).toMatch(/^[a-z0-9-]+\.vcf$/);
      expect(filename).not.toMatch(/[\r\n"';\\\\/]/);
    }
  });

  it("builds an inline disposition for native contact preview", () => {
    const disposition = vcardContentDisposition("ahmed-benali");
    expect(disposition.startsWith("inline; ")).toBe(true);
    expect(disposition).toContain('filename="ahmed-benali.vcf"');
    expect(disposition).toContain("filename*=UTF-8''ahmed-benali.vcf");
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition).not.toContain("attachment");
  });
});
