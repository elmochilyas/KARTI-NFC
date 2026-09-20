import { describe, expect, it } from "vitest";
import { foregroundOnAccent, mailHref, telHref, whatsappHref } from "./ProfilePreview";

describe("contact href helpers", () => {
  it("builds tel: links without formatting", () => {
    expect(telHref("+212 6 12 34 56 78")).toBe("tel:+212612345678");
    expect(telHref("(06) 12-34-56-78")).toBe("tel:0612345678");
  });

  it("builds WhatsApp links from numbers and passes URLs through", () => {
    expect(whatsappHref("+212 612-345678")).toBe("https://wa.me/212612345678");
    expect(whatsappHref("https://wa.me/212612345678?text=hi")).toBe(
      "https://wa.me/212612345678?text=hi",
    );
  });

  it("builds mailto: links", () => {
    expect(mailHref("a@x.com")).toBe("mailto:a@x.com");
  });

  it("omits hostile contact values instead of rendering them", () => {
    expect(telHref("javascript:alert(1)")).toBeNull();
    expect(telHref('"+onclick="alert(1)')).toBeNull();
    expect(telHref("123")).toBeNull();
    expect(whatsappHref("javascript:alert(1)")).toBeNull();
    expect(whatsappHref("https://user:pass@evil.example/")).toBeNull();
    expect(whatsappHref("abc")).toBeNull();
    expect(mailHref("a@x.com\nBcc:evil@x.com")).toBeNull();
    expect(mailHref('a"x@x.com')).toBeNull();
    expect(mailHref("not-an-email")).toBeNull();
  });
});

describe("foregroundOnAccent", () => {
  it("picks dark text on light accents and white otherwise", () => {
    expect(foregroundOnAccent("#ffffff")).toBe("#111418");
    expect(foregroundOnAccent("#0e7c5b")).toBe("#ffffff");
    expect(foregroundOnAccent(null)).toBe("#ffffff");
    expect(foregroundOnAccent("red")).toBe("#ffffff");
  });
});
