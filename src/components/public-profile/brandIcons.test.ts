import { describe, expect, it } from "vitest";
import { detectBrand, pickQuickActions } from "./brandIcons";

describe("detectBrand", () => {
  it("prefers the explicit link type", () => {
    expect(detectBrand({ type: "instagram", label: "x", url: "https://x.com/a" })).toBe(
      "instagram",
    );
    expect(detectBrand({ type: "x", label: "Follow", url: "https://example.com" })).toBe("x");
    expect(detectBrand({ type: "google_review", label: "Reviews", url: "https://g.co" })).toBe(
      "google",
    );
  });

  it("detects brands from custom-type URLs", () => {
    expect(
      detectBrand({ type: "custom", label: "My page", url: "https://instagram.com/apex" }),
    ).toBe("instagram");
    expect(detectBrand({ type: "custom", label: "Chat", url: "https://wa.me/212600000000" })).toBe(
      "whatsapp",
    );
    expect(detectBrand({ type: "custom", label: "Videos", url: "https://youtube.com/@apex" })).toBe(
      "youtube",
    );
  });

  it("detects brands from labels when the URL is generic", () => {
    expect(detectBrand({ type: "custom", label: "Telegram channel", url: "https://t.co/a" })).toBe(
      "telegram",
    );
  });

  it("falls back to a generic link brand", () => {
    expect(detectBrand({ type: "custom", label: "Blog", url: "https://blog.example.com" })).toBe(
      "link",
    );
  });
});

describe("pickQuickActions", () => {
  it("orders Instagram → WhatsApp → Call and consumes the Instagram link", () => {
    const { actions, consumedIds } = pickQuickActions({
      phone: "+212600000000",
      whatsapp: "+212600000001",
      email: null,
      website: null,
      links: [
        { id: "l1", type: "website", label: "Site", url: "https://example.com" },
        { id: "l2", type: "instagram", label: "Instagram", url: "https://instagram.com/apex" },
      ],
    });
    expect(actions.map((a) => a.label)).toEqual(["Instagram", "WhatsApp", "Call"]);
    expect(actions[0].external).toBe(true);
    expect(actions[1].href).toBe("https://wa.me/212600000001");
    expect(actions[2].href).toBe("tel:+212600000000");
    expect(consumedIds.has("l2")).toBe(true);
    expect(consumedIds.has("l1")).toBe(false);
  });

  it("caps at three and skips invalid links", () => {
    const { actions } = pickQuickActions({
      phone: "+212600000000",
      whatsapp: "+212600000001",
      email: "a@x.com",
      website: "https://example.com",
      links: [{ id: "l9", type: "custom", label: "Bad", url: "not-a-url" }],
    });
    expect(actions).toHaveLength(3);
  });

  it("returns no actions when nothing is available", () => {
    const { actions } = pickQuickActions({
      phone: null,
      whatsapp: null,
      email: null,
      website: null,
      links: [],
    });
    expect(actions).toEqual([]);
  });
});
