import { describe, expect, it } from "vitest";
import { classifyAcquisitionSource } from "./attribution";

describe("classifyAcquisitionSource", () => {
  it("classifies direct (no signals)", () => {
    expect(classifyAcquisitionSource({})).toBe("DIRECT");
  });

  it("classifies organic search referrers", () => {
    expect(classifyAcquisitionSource({ referrer: "https://www.google.com/search?q=karti" })).toBe(
      "ORGANIC_SEARCH",
    );
    expect(classifyAcquisitionSource({ referrer: "https://www.bing.com/search?q=nfc" })).toBe(
      "ORGANIC_SEARCH",
    );
  });

  it("classifies paid search UTMs", () => {
    expect(
      classifyAcquisitionSource({
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "nfc",
      }),
    ).toBe("PAID_SEARCH");
  });

  it("classifies organic social UTMs and referrers", () => {
    expect(
      classifyAcquisitionSource({
        utmSource: "instagram",
        utmMedium: "organic_social",
      }),
    ).toBe("ORGANIC_SOCIAL");
    expect(classifyAcquisitionSource({ referrer: "https://www.instagram.com/" })).toBe(
      "ORGANIC_SOCIAL",
    );
    expect(classifyAcquisitionSource({ referrer: "https://www.tiktok.com/@x" })).toBe(
      "ORGANIC_SOCIAL",
    );
  });

  it("classifies paid social UTMs", () => {
    expect(
      classifyAcquisitionSource({
        utmSource: "instagram",
        utmMedium: "paid_social",
      }),
    ).toBe("PAID_SOCIAL");
  });

  it("classifies plain external referrers as referral", () => {
    expect(classifyAcquisitionSource({ referrer: "https://blog.example.com/post" })).toBe(
      "REFERRAL",
    );
  });

  it("classifies unknown/unparseable referrers without blocking", () => {
    expect(classifyAcquisitionSource({ referrer: "::not a url::" })).toBe("UNKNOWN");
  });
});
