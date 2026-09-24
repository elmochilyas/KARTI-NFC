import { describe, expect, it } from "vitest";
import {
  detectBrand,
  parsePrimaryRef,
  pickQuickActions,
  primaryAvailability,
  readPrimaryRefs,
  resolvePrimaryActions,
  sanitizePrimaryRefs,
} from "./brandIcons";

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

  it("honors an explicit limit (maxQuickActions setting)", () => {
    const input = {
      phone: "+212600000000",
      whatsapp: "+212600000001",
      email: "a@x.com",
      website: "https://example.com",
      links: [] as { id: string; type: string; label: string; url: string }[],
    };
    expect(pickQuickActions({ ...input, limit: 1 }).actions).toHaveLength(1);
    expect(pickQuickActions({ ...input, limit: 2 }).actions).toHaveLength(2);
    expect(pickQuickActions({ ...input }).actions).toHaveLength(3);
  });

  it("clamps out-of-range limits to 1–4", () => {
    const input = {
      phone: "+212600000000",
      whatsapp: "+212600000001",
      email: "a@x.com",
      website: "https://example.com",
      links: [] as { id: string; type: string; label: string; url: string }[],
    };
    expect(pickQuickActions({ ...input, limit: 99 }).actions).toHaveLength(4);
    expect(pickQuickActions({ ...input, limit: 0 }).actions).toHaveLength(1);
  });
});

describe("parsePrimaryRef / readPrimaryRefs", () => {
  it("accepts built-ins and link uuid refs", () => {
    expect(parsePrimaryRef("call")).toEqual({ kind: "builtin", id: "call" });
    expect(parsePrimaryRef("  whatsapp ")).toEqual({ kind: "builtin", id: "whatsapp" });
    expect(parsePrimaryRef("link:323e4567-e89b-12d3-a456-426614174003")).toEqual({
      kind: "link",
      id: "323e4567-e89b-12d3-a456-426614174003",
    });
  });

  it("rejects unknown, malformed and hostile refs", () => {
    expect(parsePrimaryRef("teleport")).toBeNull();
    expect(parsePrimaryRef("link:not-a-uuid")).toBeNull();
    expect(parsePrimaryRef("link:")).toBeNull();
    expect(parsePrimaryRef("javascript:alert(1)")).toBeNull();
    expect(parsePrimaryRef(42)).toBeNull();
    expect(parsePrimaryRef(null)).toBeNull();
  });

  it("dedupes while preserving order", () => {
    expect(
      readPrimaryRefs(["call", "call", "link:323e4567-e89b-12d3-a456-426614174003", "nope"]),
    ).toEqual(["call", "link:323e4567-e89b-12d3-a456-426614174003"]);
    expect(readPrimaryRefs("call")).toEqual([]);
  });
});

describe("primaryAvailability", () => {
  it("gates built-ins on valid values and links on enabled + renderable", () => {
    const availability = primaryAvailability({
      phone: "+212600000000",
      whatsapp: "bad!!",
      email: null,
      website: "https://example.com",
      links: [
        { id: "L1", type: "instagram", label: "IG", url: "https://instagram.com/a" },
        { id: "L2", type: "custom", label: "Off", url: "https://example.com/off", enabled: false },
        { id: "L3", type: "custom", label: "", url: "https://example.com/empty" },
      ],
    });
    expect(availability.call).toBe(true);
    expect(availability.whatsapp).toBe(false);
    expect(availability.email).toBe(false);
    expect(availability.website).toBe(true);
    expect([...availability.linkIds]).toEqual(["l1"]);
  });
});

describe("resolvePrimaryActions", () => {
  const IG_ID = "323e4567-e89b-12d3-a456-426614174003";
  const LI_ID = "423e4567-e89b-12d3-a456-426614174004";

  const BASE = {
    phone: "+212600000000",
    whatsapp: "+212600000001",
    email: "a@x.com",
    website: null,
    links: [
      { id: IG_ID, type: "instagram", label: "Instagram", url: "https://instagram.com/a" },
      { id: LI_ID, type: "linkedin", label: "LinkedIn", url: "https://linkedin.com/in/a" },
    ],
  };

  it("falls back to the legacy order when unset", () => {
    const legacy = pickQuickActions(BASE).actions.map((a) => a.id);
    expect(resolvePrimaryActions(BASE).actions.map((a) => a.id)).toEqual(legacy);
    expect(resolvePrimaryActions({ ...BASE, primaryActions: [] }).actions.map((a) => a.id)).toEqual(
      legacy,
    );
  });

  it("honors an explicit mixed order and consumes only shown links", () => {
    const { actions, consumedIds } = resolvePrimaryActions({
      ...BASE,
      primaryActions: [`link:${LI_ID}`, "whatsapp", "call"],
    });
    expect(actions.map((a) => a.label)).toEqual(["LinkedIn", "WhatsApp", "Call"]);
    expect(consumedIds.has(LI_ID)).toBe(true);
    expect(consumedIds.has(IG_ID)).toBe(false);
  });

  it("caps the explicit order at the limit", () => {
    const { actions } = resolvePrimaryActions({
      ...BASE,
      limit: 2,
      primaryActions: [`link:${LI_ID}`, "whatsapp", "call"],
    });
    expect(actions.map((a) => a.label)).toEqual(["LinkedIn", "WhatsApp"]);
  });

  it("drops disabled links, deleted links, missing values and garbage", () => {
    const { actions } = resolvePrimaryActions({
      phone: null,
      whatsapp: null,
      email: null,
      website: null,
      links: [
        { id: IG_ID, type: "instagram", label: "IG", url: "https://instagram.com/a", enabled: false },
      ],
      primaryActions: [
        "call",
        `link:${IG_ID}`,
        "link:523e4567-e89b-12d3-a456-426614174005",
        "teleport",
        "email",
      ],
    });
    expect(actions).toEqual([]);
  });

  it("keeps resolving the survivors around stale refs", () => {
    const { actions } = resolvePrimaryActions({
      ...BASE,
      phone: null,
      primaryActions: ["call", `link:${LI_ID}`, "link:deadbeef-dead-beef-dead-beefdeadbeef"],
    });
    expect(actions.map((a) => a.label)).toEqual(["LinkedIn"]);
  });
});

describe("sanitizePrimaryRefs", () => {
  it("keeps only currently resolvable refs", () => {
    expect(
      sanitizePrimaryRefs(["whatsapp", "call", "link:nope", `link:${"323e4567-e89b-12d3-a456-426614174003"}`], {
        phone: "+212600000000",
        whatsapp: null,
        email: null,
        website: null,
        links: [
          {
            id: "323e4567-e89b-12d3-a456-426614174003",
            type: "instagram",
            label: "IG",
            url: "https://instagram.com/a",
          },
        ],
      }),
    ).toEqual(["call", "link:323e4567-e89b-12d3-a456-426614174003"]);
  });
});
