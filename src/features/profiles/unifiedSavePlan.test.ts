import { describe, expect, it } from "vitest";
import {
  isDraftTempId,
  mapDraftOrder,
  planLinksDiff,
  planSectionsDiff,
  unifiedSavePayloadSchema,
} from "./unifiedSavePlan";

const LINK_A = {
  id: "323e4567-e89b-12d3-a456-426614174003",
  type: "instagram",
  label: "Instagram",
  url: "https://instagram.com/a",
  enabled: true,
};
const LINK_B = {
  id: "423e4567-e89b-12d3-a456-426614174004",
  type: "website",
  label: "Site",
  url: "https://example.com",
  enabled: true,
};

function draftLink(
  base: typeof LINK_A,
  id: string,
  patch: Partial<typeof LINK_A> & { sort_order?: number } = {},
) {
  return {
    type: base.type,
    label: base.label,
    url: base.url,
    enabled: base.enabled,
    id,
    sort_order: 0,
    ...patch,
  };
}

describe("planLinksDiff", () => {
  it("is a no-op when nothing changed", () => {
    const result = planLinksDiff(
      [LINK_A, LINK_B],
      [draftLink(LINK_A, LINK_A.id), draftLink(LINK_B, LINK_B.id, { sort_order: 1 })],
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.creates).toEqual([]);
    expect(result.plan.updates).toEqual([]);
    expect(result.plan.toggles).toEqual([]);
    expect(result.plan.deletes).toEqual([]);
    expect(result.plan.order).toEqual([LINK_A.id, LINK_B.id]);
  });

  it("plans creates, updates, toggles, deletes and reorder", () => {
    const result = planLinksDiff(
      [LINK_A, LINK_B],
      [
        draftLink(LINK_A, "draft-1", {
          type: "website",
          label: "New",
          url: "https://new.example.com",
        }),
        draftLink(LINK_B, LINK_B.id, { label: "Renamed" }),
        draftLink(LINK_A, LINK_A.id, { sort_order: 2 }),
      ],
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.creates).toHaveLength(1);
    expect(result.plan.creates[0].tempId).toBe("draft-1");
    expect(result.plan.updates).toEqual([
      { id: LINK_B.id, type: "website", label: "Renamed", url: "https://example.com" },
    ]);
    expect(result.plan.order).toEqual(["draft-1", LINK_B.id, LINK_A.id]);
  });

  it("plans deletes only for persisted rows that still exist", () => {
    const result = planLinksDiff(
      [LINK_A],
      [draftLink(LINK_A, LINK_A.id)],
      [LINK_B.id, "draft-9", "not-a-uuid"],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.deletes).toEqual([]);
  });

  it("fails closed when a persisted id is unknown to the server", () => {
    const result = planLinksDiff(
      [LINK_A],
      [draftLink(LINK_A, LINK_A.id), draftLink(LINK_B, LINK_B.id)],
      [],
    );
    expect(result.ok).toBe(false);
  });

  it("rejects malformed non-temp ids", () => {
    const result = planLinksDiff([LINK_A], [draftLink(LINK_A, "!!!")], []);
    expect(result.ok).toBe(false);
  });
});

describe("planSectionsDiff", () => {
  const HERO = {
    id: "523e4567-e89b-12d3-a456-426614174005",
    type: "hero",
    enabled: true,
    settings: {},
  };

  it("plans adds, settings updates, toggles and deletes", () => {
    const result = planSectionsDiff(
      [HERO],
      [
        { id: HERO.id, type: "hero", position: 1, enabled: false, settings: {} },
        {
          id: "draft-s1",
          type: "gallery",
          position: 2,
          enabled: true,
          settings: { layout: "masonry" },
        },
      ],
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.toggles).toEqual([{ id: HERO.id, enabled: false }]);
    expect(result.plan.settingsUpdates).toEqual([]);
    expect(result.plan.adds).toHaveLength(1);
    expect(result.plan.adds[0]).toMatchObject({ tempId: "draft-s1", type: "gallery" });
    expect(result.plan.order).toEqual([HERO.id, "draft-s1"]);
  });

  it("detects settings changes by value", () => {
    const result = planSectionsDiff(
      [{ ...HERO, settings: { showTagline: true } }],
      [{ id: HERO.id, type: "hero", position: 1, enabled: true, settings: { showTagline: false } }],
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.settingsUpdates).toHaveLength(1);
  });

  it("fails closed on unknown persisted sections", () => {
    const result = planSectionsDiff(
      [],
      [{ id: HERO.id, type: "hero", position: 1, enabled: true, settings: {} }],
      [],
    );
    expect(result.ok).toBe(false);
  });
});

describe("mapDraftOrder", () => {
  it("maps temp ids and passes real ids through", () => {
    expect(mapDraftOrder(["draft-1", LINK_A.id], new Map([["draft-1", LINK_B.id]]))).toEqual([
      LINK_B.id,
      LINK_A.id,
    ]);
  });

  it("returns null when a temp id has no mapping", () => {
    expect(mapDraftOrder(["draft-9"], new Map())).toBeNull();
  });
});

describe("unified payload schema", () => {
  it("rejects hostile shapes", () => {
    expect(unifiedSavePayloadSchema.safeParse(null).success).toBe(false);
    expect(
      unifiedSavePayloadSchema.safeParse({
        profile: {},
        previousAvatarPath: "",
        previousCoverPath: "",
        newProfileId: null,
        template: "personal",
        links: [
          {
            id: "x",
            type: "website",
            label: "L",
            url: "https://example.com",
            enabled: true,
            sort_order: 0,
          },
        ],
        deletedLinkIds: [],
        sections: "nope",
        deletedSectionIds: [],
      }).success,
    ).toBe(false);
  });
});

describe("isDraftTempId", () => {
  it("detects draft ids", () => {
    expect(isDraftTempId("draft-abc")).toBe(true);
    expect(isDraftTempId(LINK_A.id)).toBe(false);
  });
});
