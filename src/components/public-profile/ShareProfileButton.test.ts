import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  SHARE_COPIED_MESSAGE,
  ShareProfileButton,
  buildSharePayload,
  legacyCopy,
} from "./ShareProfileButton";

describe("buildSharePayload", () => {
  it("shares the display name as title with a personalized message", () => {
    expect(buildSharePayload("Ahmed Benali", "https://karti.pro/ahmed-benali")).toEqual(
      {
        title: "Ahmed Benali",
        text: "Check out Ahmed Benali on Karti",
        url: "https://karti.pro/ahmed-benali",
      },
    );
  });

  it("trims the display name and falls back for blank names", () => {
    expect(buildSharePayload("  Ahmed  ", "https://example.com/x")).toMatchObject({
      title: "Ahmed",
      text: "Check out Ahmed on Karti",
    });
    expect(buildSharePayload("   ", "https://example.com/x")).toEqual({
      title: "Karti Profile",
      text: "Check out this profile on Karti",
      url: "https://example.com/x",
    });
  });

  it("carries only public share fields — never private data", () => {
    const payload = buildSharePayload("Ahmed Benali", "https://karti.pro/ahmed-benali");
    expect(Object.keys(payload).sort()).toEqual(["text", "title", "url"]);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("client");
    expect(serialized).not.toContain("card");
    expect(serialized).not.toContain("dashboard");
    expect(serialized).not.toContain("notes");
  });
});

describe("legacyCopy", () => {
  function fakeDoc(execResult: boolean | Error) {
    const area = {
      value: "",
      style: {} as Record<string, string>,
      select: vi.fn(),
      setAttribute: vi.fn(),
    };
    const doc = {
      createElement: vi.fn(() => area),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      execCommand: vi.fn(() => {
        if (execResult instanceof Error) throw execResult;
        return execResult;
      }),
    };
    return { area, doc: doc as unknown as Document };
  }

  it("copies the URL and reports success", () => {
    const { area, doc } = fakeDoc(true);
    expect(legacyCopy("https://karti.pro/ahmed-benali", doc)).toBe(true);
    expect(area.value).toBe("https://karti.pro/ahmed-benali");
    expect(area.select).toHaveBeenCalled();
    expect(doc.execCommand as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("copy");
  });

  it("returns false without throwing when the copy fails", () => {
    expect(legacyCopy("https://example.com/x", fakeDoc(false).doc)).toBe(false);
    expect(legacyCopy("https://example.com/x", fakeDoc(new Error("denied")).doc)).toBe(false);
  });
});

describe("ShareProfileButton markup", () => {
  function render(dark = false): string {
    return renderToStaticMarkup(createElement(ShareProfileButton, { title: "Ahmed Benali", dark }));
  }

  it("renders a labeled Share button with a friendly sublabel", () => {
    const html = render();
    expect(html).toContain("<button");
    expect(html).toContain('aria-label="Share my profile"');
    expect(html).toContain("Share my profile");
    expect(html).toContain("Send my digital card");
  });

  it("is a strong bottom action with a large touch target", () => {
    const html = render();
    // min-h-[68px] clears the 44px minimum; accent fill makes it the
    // strongest element at the bottom of the page.
    expect(html).toContain("min-h-[68px]");
    expect(html).toContain("rounded-[20px]");
    expect(html).not.toContain("Save Contact");
    expect(html).not.toContain("/api/vcard");
  });

  it("renders in both themes without private data", () => {
    for (const dark of [false, true]) {
      const html = render(dark);
      expect(html).toContain("Share my profile");
      expect(html).toContain("Send my digital card");
      expect(html).not.toContain("client");
      expect(html).not.toContain("dashboard");
    }
  });

  it("uses the spec fallback message", () => {
    expect(SHARE_COPIED_MESSAGE).toBe("Profile link copied");
  });
});
