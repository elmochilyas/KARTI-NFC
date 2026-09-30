import { describe, expect, it } from "vitest";
import {
  buildInstagramCanonicalUrl,
  buildWhatsAppDestination,
  isValidEmailShape,
  normalizeEmail,
  normalizeHttpsUrl,
  normalizeInstagram,
  normalizePhone,
  normalizeUrl,
  normalizeWhatsApp,
} from "./normalize";

describe("normalizeEmail", () => {
  it("trims and lowercases without provider tricks", () => {
    expect(normalizeEmail("  Younes.Barrag@Example.COM  ")).toBe("younes.barrag@example.com");
    // Gmail dots are preserved.
    expect(normalizeEmail("Y.O.U.N.E.S@gmail.com")).toBe("y.o.u.n.e.s@gmail.com");
  });

  it("validates basic shape", () => {
    expect(isValidEmailShape("a@b.co")).toBe(true);
    expect(isValidEmailShape("no-at")).toBe(false);
    expect(isValidEmailShape("a@b")).toBe(false);
    expect(isValidEmailShape("a @b.co")).toBe(false);
  });
});

describe("normalizePhone / normalizeWhatsApp", () => {
  it("passes through E.164 international input", () => {
    expect(normalizePhone("+33612345678")).toBe("+33612345678");
    expect(normalizePhone("+12125550123")).toBe("+12125550123");
  });

  it("converts 00 international prefix to +", () => {
    expect(normalizePhone("0033612345678")).toBe("+33612345678");
  });

  it("normalizes Moroccan national numbers (any NDC, not just 06/07)", () => {
    expect(normalizePhone("0612345678")).toBe("+212612345678");
    expect(normalizePhone("0712345678")).toBe("+212712345678");
    expect(normalizePhone("0522345678")).toBe("+212522345678");
    expect(normalizePhone("0537345678")).toBe("+212537345678");
  });

  it("normalizes Moroccan numbers without trunk or plus", () => {
    expect(normalizePhone("612345678")).toBe("+212612345678");
    expect(normalizePhone("212612345678")).toBe("+212612345678");
  });

  it("tolerates separators", () => {
    expect(normalizePhone("+212 6 12-34 56 78")).toBe("+212612345678");
    expect(normalizePhone("(06) 12 34 56 78")).toBe("+212612345678");
  });

  it("rejects malformed input without claiming telecom validity", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("+212")).toBeNull();
  });

  it("whatsapp mirrors phone hygiene", () => {
    expect(normalizeWhatsApp("0612345678")).toBe("+212612345678");
    expect(normalizeWhatsApp("nope")).toBeNull();
  });
});

describe("normalizeUrl / normalizeHttpsUrl", () => {
  it("accepts safe https URLs", () => {
    expect(normalizeUrl("  https://example.com/a  ")).toBe("https://example.com/a");
    expect(normalizeHttpsUrl("https://example.com/a")).toBe("https://example.com/a");
  });

  it("rejects unsafe protocols without fetching", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
    ]) {
      expect(normalizeUrl(bad)).toBeNull();
      expect(normalizeHttpsUrl(bad)).toBeNull();
    }
  });

  it("https gate rejects plain http for custom destinations", () => {
    expect(normalizeUrl("http://example.com/")).not.toBeNull();
    expect(normalizeHttpsUrl("http://example.com/")).toBeNull();
  });
});

describe("normalizeInstagram", () => {
  it("accepts bare usernames", () => {
    expect(normalizeInstagram("karti.ma")).toBe("https://www.instagram.com/karti.ma/");
  });

  it("accepts @usernames", () => {
    expect(normalizeInstagram("@karti.ma")).toBe("https://www.instagram.com/karti.ma/");
  });

  it("normalizes instagram.com profile URLs", () => {
    expect(normalizeInstagram("https://instagram.com/karti.ma")).toBe(
      "https://www.instagram.com/karti.ma/",
    );
    expect(normalizeInstagram("https://www.instagram.com/karti.ma/")).toBe(
      "https://www.instagram.com/karti.ma/",
    );
  });

  it("rejects unrelated domains", () => {
    expect(normalizeInstagram("https://tiktok.com/@karti")).toBeNull();
    expect(normalizeInstagram("https://example.com/karti")).toBeNull();
    expect(normalizeInstagram("not a user!!")).toBeNull();
  });

  it("buildInstagramCanonicalUrl mirrors normalizeInstagram", () => {
    expect(buildInstagramCanonicalUrl("karti")).toBe("https://www.instagram.com/karti/");
  });
});

describe("buildWhatsAppDestination", () => {
  it("builds wa.me from the normalized number server-side", () => {
    expect(buildWhatsAppDestination("+212612345678")).toBe("https://wa.me/212612345678");
    expect(buildWhatsAppDestination("0612345678")).toBe("https://wa.me/212612345678");
  });

  it("encodes the predefined message", () => {
    expect(buildWhatsAppDestination("+212612345678", "Salam, bghit carte")).toBe(
      "https://wa.me/212612345678?text=Salam%2C%20bghit%20carte",
    );
  });

  it("returns null for malformed numbers", () => {
    expect(buildWhatsAppDestination("nope")).toBeNull();
  });
});
