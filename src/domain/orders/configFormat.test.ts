import { describe, expect, it } from "vitest";
import { formatOrderConfiguration } from "./configFormat";

describe("order configuration formatting", () => {
  it("formats personal card fields", () => {
    expect(
      formatOrderConfiguration("PERSONAL_CARD", {
        fullName: "Ahmed B.",
        professionalTitle: "Designer",
      }),
    ).toEqual([
      { label: "Name", value: "Ahmed B." },
      { label: "Title", value: "Designer" },
    ]);
  });

  it("flags missing CV and missing review URL explicitly", () => {
    expect(
      formatOrderConfiguration("CAREER_CARD", { fullName: "Sara", hasCv: false }),
    ).toContainEqual({
      label: "Has CV",
      value: "No",
    });
    expect(
      formatOrderConfiguration("GOOGLE_REVIEW_CARD", {
        businessName: "Café X",
        needsUrlHelp: true,
      }),
    ).toContainEqual({ label: "Review URL", value: "Missing — customer needs help" });
  });

  it("omits absent optional fields instead of rendering blanks", () => {
    expect(formatOrderConfiguration("WHATSAPP_CARD", { whatsappNumber: "+212612345678" })).toEqual([
      { label: "Number", value: "+212612345678" },
    ]);
  });

  it("formats contact and custom-link cards", () => {
    expect(
      formatOrderConfiguration("CONTACT_CARD", {
        fullName: "Yasmine",
        phone: "+212600000000",
        email: "y@example.com",
      }),
    ).toEqual([
      { label: "Name", value: "Yasmine" },
      { label: "Phone", value: "+212600000000" },
      { label: "Email", value: "y@example.com" },
    ]);
    expect(
      formatOrderConfiguration("CUSTOM_LINK_CARD", {
        destinationUrl: "https://example.com/menu",
        purpose: "Menu",
      }),
    ).toEqual([
      { label: "Destination URL", value: "https://example.com/menu" },
      { label: "Purpose", value: "Menu" },
    ]);
  });

  it("never renders raw JSON for unknown or malformed input", () => {
    expect(formatOrderConfiguration("BUSINESS_CARD", null)).toEqual([]);
    expect(formatOrderConfiguration("BUSINESS_CARD", "raw")).toEqual([]);
    expect(
      formatOrderConfiguration("BUSINESS_CARD", { businessName: 42, unrelated: "<b>x</b>" }),
    ).toEqual([]);
  });
});
