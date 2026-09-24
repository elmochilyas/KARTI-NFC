import { describe, expect, it } from "vitest";
import {
  computeCompletion,
  onboardingSteps,
  type CompletionLink,
  type CompletionProfile,
  type CompletionSection,
} from "./completion";

const FULL_PROFILE: CompletionProfile = {
  display_name: "Layla Haddad",
  avatar_path: "profiles/x/avatar/a.webp",
  cover_path: null,
  phone: "+212600000001",
  whatsapp: null,
  email: null,
  website: null,
  bio: "Designer.",
  status: "ACTIVE",
};

const EMPTY_PROFILE: CompletionProfile = {
  display_name: "  ",
  avatar_path: null,
  cover_path: null,
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  bio: null,
  status: "DRAFT",
};

const links: CompletionLink[] = [{ enabled: true }];
const noLinks: CompletionLink[] = [{ enabled: false }];

const LOCATION: CompletionSection = {
  type: "location",
  enabled: true,
  settings: { address: "123 Main St", latitude: null, longitude: null },
};

const GALLERY: CompletionSection = {
  type: "gallery",
  enabled: true,
  settings: {
    images: [{ id: "g1", image: "c/sections/gallery/a.webp", alt: "" }],
  },
};

describe("computeCompletion", () => {
  it("scores a complete profile at 100", () => {
    const result = computeCompletion(FULL_PROFILE, links, [LOCATION, GALLERY]);
    expect(result.percent).toBe(100);
    expect(result.level).toBe("complete");
    expect([...result.required, ...result.recommended].every((i) => i.done)).toBe(true);
  });

  it("scores an empty profile at 0", () => {
    const result = computeCompletion(EMPTY_PROFILE, noLinks, []);
    expect(result.percent).toBe(0);
    expect(result.level).toBe("getting-started");
  });

  it("weights required 20 and recommended 10", () => {
    // Name only → 20.
    const nameOnly = computeCompletion({ ...EMPTY_PROFILE, display_name: "A" }, noLinks, []);
    expect(nameOnly.percent).toBe(20);
    // Bio only → 10.
    const bioOnly = computeCompletion({ ...EMPTY_PROFILE, bio: "Hi" }, noLinks, []);
    expect(bioOnly.percent).toBe(10);
  });

  it("accepts cover as the image and any contact channel", () => {
    const cover = computeCompletion(
      { ...EMPTY_PROFILE, display_name: "A", cover_path: "p", website: "https://x.com" },
      noLinks,
      [],
    );
    expect(cover.required.find((i) => i.id === "image")?.done).toBe(true);
    expect(cover.required.find((i) => i.id === "action")?.done).toBe(true);
    expect(cover.percent).toBe(60);
    expect(cover.level).toBe("almost-there");
  });

  it("requires a real location target and real gallery photos", () => {
    const emptyLocation: CompletionSection = {
      type: "location",
      enabled: true,
      settings: { address: "", latitude: null, longitude: null },
    };
    const coords: CompletionSection = {
      type: "location",
      enabled: true,
      settings: { address: "", latitude: 33.9, longitude: -6.8 },
    };
    const noPhotos: CompletionSection = {
      type: "gallery",
      enabled: true,
      settings: { images: [{ id: "g", image: "", alt: "" }] },
    };
    const base = computeCompletion(FULL_PROFILE, links, [emptyLocation, noPhotos]);
    expect(base.recommended.find((i) => i.id === "location")?.done).toBe(false);
    expect(base.recommended.find((i) => i.id === "gallery")?.done).toBe(false);
    const fixed = computeCompletion(FULL_PROFILE, links, [coords, GALLERY]);
    expect(fixed.recommended.find((i) => i.id === "location")?.done).toBe(true);
    expect(fixed.recommended.find((i) => i.id === "gallery")?.done).toBe(true);
  });

  it("ignores disabled sections", () => {
    const result = computeCompletion(FULL_PROFILE, links, [
      { ...LOCATION, enabled: false },
      { ...GALLERY, enabled: false },
    ]);
    expect(result.recommended.find((i) => i.id === "location")?.done).toBe(false);
    expect(result.recommended.find((i) => i.id === "gallery")?.done).toBe(false);
  });
});

describe("onboardingSteps", () => {
  it("marks everything done for a published complete profile", () => {
    const steps = onboardingSteps(FULL_PROFILE, links, [LOCATION, GALLERY]);
    expect(steps.map((s) => s.id)).toEqual(["identity", "contact", "sections", "publish"]);
    expect(steps.every((s) => s.done)).toBe(true);
  });

  it("guides a fresh draft through identity, contact, sections, publish", () => {
    const steps = onboardingSteps(EMPTY_PROFILE, noLinks, []);
    expect(steps.every((s) => !s.done)).toBe(true);
    const partial = onboardingSteps(
      { ...EMPTY_PROFILE, display_name: "A", avatar_path: "p", phone: "+1" },
      noLinks,
      [],
    );
    expect(partial.find((s) => s.id === "identity")?.done).toBe(true);
    expect(partial.find((s) => s.id === "contact")?.done).toBe(true);
    expect(partial.find((s) => s.id === "sections")?.done).toBe(false);
    expect(partial.find((s) => s.id === "publish")?.done).toBe(false);
  });

  it("completes sections via links or non-foundation blocks", () => {
    const viaLinks = onboardingSteps(EMPTY_PROFILE, links, []);
    expect(viaLinks.find((s) => s.id === "sections")?.done).toBe(true);
    const viaBlock = onboardingSteps(EMPTY_PROFILE, noLinks, [GALLERY]);
    expect(viaBlock.find((s) => s.id === "sections")?.done).toBe(true);
    const foundationOnly = onboardingSteps(EMPTY_PROFILE, noLinks, [
      { type: "hero", enabled: true, settings: {} },
    ]);
    expect(foundationOnly.find((s) => s.id === "sections")?.done).toBe(false);
  });
});
