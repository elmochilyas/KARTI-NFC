import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ImageCropEditor } from "./ImageCropEditor";

function render(kind: "avatar" | "cover" = "avatar"): string {
  return renderToStaticMarkup(
    createElement(ImageCropEditor, {
      file: new File(["bytes"], "photo.png", { type: "image/png" }),
      sourceUrl: "blob:fake-url",
      kind,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    }),
  );
}

describe("ImageCropEditor markup", () => {
  it("renders a labeled dialog with the adjust flow controls", () => {
    const html = render();
    expect(html).toContain("<dialog");
    expect(html).toContain("Adjust profile photo");
    expect(html).toContain("How your profile photo will appear");
    expect(html).toContain("Use this photo");
    expect(html).toContain("Reset adjustments");
    expect(html).toContain("Cancel, keep current image");
  });

  it("exposes a 1x–3x zoom slider with a labeled value", () => {
    const html = render();
    expect(html).toContain('type="range"');
    expect(html).toContain('min="1"');
    expect(html).toContain('max="3"');
    expect(html).toContain("1.0x");
  });

  it("adapts titles and frame shape to the cover variant", () => {
    const html = render("cover");
    expect(html).toContain("Adjust cover image");
    expect(html).toContain("How your cover will appear");
    expect(html).toContain("Use this cover");
    expect(html).toContain("aspect-[3/1]");
    expect(render("avatar")).toContain("rounded-full");
  });

  it("keeps touch targets at 44px and keyboard support discoverable", () => {
    const html = render();
    expect(html).toContain("min-h-11");
    expect(html).toContain("h-11 w-full");
    expect(html).toContain("tabindex");
    expect(html).toContain("Arrow keys move the photo");
  });

  it("never uploads on render: no form, no file input, no network", () => {
    const html = render();
    expect(html).not.toContain("<form");
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain("blob:fake-url");
  });
});
