import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/dashboard/clients/[id]/profile/actions", () => ({
  saveUnifiedDraftAction: vi.fn(),
  setStatusAction: vi.fn(),
  uploadAssetAction: vi.fn(),
  uploadSectionImageAction: vi.fn(),
  uploadDocumentAction: vi.fn(),
  ensureSectionsAction: vi.fn(),
  updateTemplateAction: vi.fn(),
  resolveMapsLinkAction: vi.fn(),
}));

import { snapshotGalleryFiles } from "./SectionEditors";
import { SectionSettingsRenderer } from "./SectionSettingsRenderer";

function fakeFileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      yield* files;
    },
  } as unknown as FileList;
  for (let i = 0; i < files.length; i += 1) {
    (list as unknown as Record<number, File>)[i] = files[i];
  }
  return list;
}

describe("snapshotGalleryFiles", () => {
  it("returns an empty array for null or empty picks", () => {
    expect(snapshotGalleryFiles(null)).toEqual([]);
    expect(snapshotGalleryFiles(fakeFileList([]))).toEqual([]);
  });

  it("snapshots the pick so a later input reset cannot empty it", () => {
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    const backing = [file];
    const list = fakeFileList(backing);
    const snapshot = snapshotGalleryFiles(list);
    expect(snapshot).toEqual([file]);
    // Simulate `e.target.value = ""` clearing the live list afterwards.
    backing.length = 0;
    (list as unknown as { length: number }).length = 0;
    expect(snapshot).toEqual([file]);
    expect(snapshot.length).toBe(1);
  });
});

describe("gallery empty state", () => {
  it("guides the operator: add a slot, pick inside it, uploads show live, save keeps", () => {
    const html = renderToStaticMarkup(
      createElement(SectionSettingsRenderer, {
        type: "gallery",
        settings: {},
        pending: false,
        onSave: () => {},
      }),
    );
    expect(html).toContain("Add photo slot");
    expect(html).toContain("upload immediately");
    expect(html).toContain("Press Save to keep them.");
  });

  it("caps the gallery at 24 photos with a hint instead of a save-time surprise", () => {
    const image = "123e4567-e89b-12d3-a456-426614174001/sections/gallery/abcdef0123456789.webp";
    const html = renderToStaticMarkup(
      createElement(SectionSettingsRenderer, {
        type: "gallery",
        settings: {
          title: "Gallery",
          layout: "grid",
          images: Array.from({ length: 24 }, (_, i) => ({
            id: `g${i}`,
            image,
            alt: "",
          })),
        },
        pending: false,
        onSave: () => {},
      }),
    );
    expect(html).toContain("up to 24 photos");
    expect(html).toContain("disabled");
  });
});
