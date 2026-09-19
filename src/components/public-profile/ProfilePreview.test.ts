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
});

describe("foregroundOnAccent", () => {
  it("picks dark text on light accents and white otherwise", () => {
    expect(foregroundOnAccent("#ffffff")).toBe("#111418");
    expect(foregroundOnAccent("#0e7c5b")).toBe("#ffffff");
    expect(foregroundOnAccent(null)).toBe("#ffffff");
    expect(foregroundOnAccent("red")).toBe("#ffffff");
  });
});
