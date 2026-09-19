import { describe, expect, it } from "vitest";
import { displayProfileUrl, isProfileLinkPublic, publicProfileUrl } from "./urls";

describe("publicProfileUrl", () => {
  it("builds the profile URL from slug and app URL", () => {
    expect(publicProfileUrl("ahmed-benali", "https://karti.app")).toBe(
      "https://karti.app/ahmed-benali",
    );
  });

  it("normalizes the slug", () => {
    expect(publicProfileUrl("  Ahmed Benali! ", "https://karti.app")).toBe(
      "https://karti.app/ahmed-benali",
    );
  });

  it("reflects slug changes (derived fresh, never stored)", () => {
    expect(publicProfileUrl("ahmed-benali", "https://karti.app")).not.toBe(
      publicProfileUrl("ahmed-b", "https://karti.app"),
    );
    expect(publicProfileUrl("ahmed-b", "https://karti.app")).toBe("https://karti.app/ahmed-b");
  });

  it("trims trailing slashes from the app URL", () => {
    expect(publicProfileUrl("x", "https://karti.app///")).toBe("https://karti.app/x");
  });

  it("falls back safely for empty slugs", () => {
    expect(publicProfileUrl("!!!", "https://karti.app")).toBe("https://karti.app/profile");
  });

  it("uses the canonical app URL by default", () => {
    expect(publicProfileUrl("x")).toContain("/x");
  });
});

describe("displayProfileUrl", () => {
  it("strips the protocol for display", () => {
    expect(displayProfileUrl("https://karti.app/ahmed-benali")).toBe("karti.app/ahmed-benali");
    expect(displayProfileUrl("http://localhost:3000/x")).toBe("localhost:3000/x");
  });
});

describe("isProfileLinkPublic", () => {
  it("is public only when ACTIVE", () => {
    expect(isProfileLinkPublic("ACTIVE")).toBe(true);
    expect(isProfileLinkPublic("DRAFT")).toBe(false);
    expect(isProfileLinkPublic("INACTIVE")).toBe(false);
  });
});
