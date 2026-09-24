import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  AVATAR_MAX_DIM,
  COVER_MAX_DIM,
  IMMUTABLE_CACHE_CONTROL,
  PROFILE_ASSETS_BUCKET,
  PROFILE_DOCUMENTS_BUCKET,
  detectImageKind,
  detectPdfKind,
  documentAssetPath,
  isManagedAssetPath,
  isManagedDocumentPath,
  isManagedSectionImagePath,
  publicAssetPathUrl,
  publicAssetUrl,
  removeAsset,
  sectionAssetPath,
  storageOrigin,
  uploadAsset,
  uploadDocument,
  uploadSectionImage,
  type StorageDb,
} from "./storage";

// Real 1x1 transparent PNG (sharp-decodable). The previous truncated
// header-only fixture passed the magic-byte gate but sharp correctly rejects
// it as corrupt, so uploads need a decodable image.
const PNG_BYTES = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

function adminDb(hooks: { upload?: ReturnType<typeof vi.fn>; remove?: ReturnType<typeof vi.fn> }) {
  return {
    auth: { getClaims: async () => ({ data: { claims: { sub: "admin" } }, error: null }) },
    storage: {
      from: () => ({ upload: hooks.upload, remove: hooks.remove }),
    },
  } as unknown as StorageDb;
}

describe("detectImageKind", () => {
  it("recognizes JPEG, PNG, and WebP magic bytes", () => {
    expect(detectImageKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      "jpg",
    );
    expect(
      detectImageKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])),
    ).toBe("png");
    expect(
      detectImageKind(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe("webp");
  });

  it("rejects HTML, text, SVG, executables, and truncated input", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html>");
    expect(detectImageKind(html)).toBeNull();
    const svg = new TextEncoder().encode("<svg xmlns=");
    expect(detectImageKind(svg)).toBeNull();
    expect(detectImageKind(new TextEncoder().encode("RIFFxxxxNOTW EB"))).toBeNull();
    expect(detectImageKind(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectImageKind(new Uint8Array([]))).toBeNull();
  });
});

describe("uploadAsset signature gate", () => {
  const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174000";

  it("rejects a forged image/png type on HTML bytes without uploading", async () => {
    const upload = vi.fn();
    const db = adminDb({ upload });
    const forged = new File(["<html><script>alert(1)</script></html>"], "evil.png", {
      type: "image/png",
    });
    const result = await uploadAsset(PROFILE_ID, "avatar", forged, db);
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects SVG bytes even with an image MIME type", async () => {
    const upload = vi.fn();
    const db = adminDb({ upload });
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], "x.png", {
      type: "image/png",
    });
    expect((await uploadAsset(PROFILE_ID, "avatar", svg, db)).ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads real PNG bytes with a generated path", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const db = adminDb({ upload });
    const real = new File([PNG_BYTES], "photo.png", { type: "image/png" });
    const result = await uploadAsset(PROFILE_ID, "avatar", real, db);
    expect(result.ok).toBe(true);
    expect(upload).toHaveBeenCalledOnce();
    if (result.ok) expect(isManagedAssetPath(result.path)).toBe(true);
  });
});

describe("isManagedAssetPath", () => {
  it("accepts server-generated asset paths", () => {
    expect(
      isManagedAssetPath(
        "profiles/123e4567-e89b-12d3-a456-426614174000/avatar/abcdef0123456789.png",
      ),
    ).toBe(true);
    expect(isManagedAssetPath("profiles/pending/cover/0123456789abcdef.webp")).toBe(true);
  });

  it("gates deletes to managed paths without touching storage", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const db = adminDb({ remove });
    const bad = await removeAsset(
      "https://x.supabase.co/storage/v1/object/public/profile-assets/a.png",
      db,
    );
    expect(bad.ok).toBe(false);
    expect(remove).not.toHaveBeenCalled();
    const good = await removeAsset(
      "profiles/123e4567-e89b-12d3-a456-426614174000/avatar/abcdef0123456789.png",
      db,
    );
    expect(good.ok).toBe(true);
    expect(remove).toHaveBeenCalledOnce();
  });

  it("rejects traversal, foreign buckets, extensions, and URLs", () => {
    expect(isManagedAssetPath("profiles/../other/avatar/abcdef0123456789.png")).toBe(false);
    expect(isManagedAssetPath("other/avatar/abcdef0123456789.png")).toBe(false);
    expect(
      isManagedAssetPath(
        "profiles/123e4567-e89b-12d3-a456-426614174000/avatar/abcdef0123456789.svg",
      ),
    ).toBe(false);
    expect(
      isManagedAssetPath("https://x.supabase.co/storage/v1/object/public/profile-assets/a.png"),
    ).toBe(false);
    expect(isManagedAssetPath("")).toBe(false);
  });
});

describe("uploadAsset server normalize (sharp)", () => {
  const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174000";

  async function pngFile(width: number, height: number): Promise<File> {
    const buf = await sharp({
      create: { width, height, channels: 3, background: { r: 14, g: 124, b: 91 } },
    })
      .png()
      .toBuffer();
    return new File([new Uint8Array(buf)], `${width}x${height}.png`, { type: "image/png" });
  }

  function webpMagic(body: unknown): boolean {
    const bytes =
      body instanceof Buffer
        ? new Uint8Array(body)
        : body instanceof Uint8Array
          ? body
          : new Uint8Array((body as ArrayBuffer).valueOf() as ArrayBuffer);
    return detectImageKind(bytes.slice(0, 12)) === "webp";
  }

  it("converts PNG to WebP with immutable cache headers and a .webp path", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const db = adminDb({ upload });
    const real = new File([PNG_BYTES], "photo.png", { type: "image/png" });
    const result = await uploadAsset(PROFILE_ID, "avatar", real, db);
    expect(result.ok).toBe(true);
    expect(upload).toHaveBeenCalledOnce();
    const [path, body, options] = upload.mock.calls[0] as unknown as [
      string,
      Buffer,
      { contentType: string; cacheControl: string; upsert: boolean },
    ];
    if (result.ok) {
      expect(result.path).toBe(path);
      expect(path.endsWith(".webp")).toBe(true);
      expect(isManagedAssetPath(path)).toBe(true);
    }
    expect(webpMagic(body)).toBe(true);
    expect(options.contentType).toBe("image/webp");
    expect(options.cacheControl).toBe(IMMUTABLE_CACHE_CONTROL);
    expect(options.upsert).toBe(false);
  });

  it("caps avatars at 1024px (cover at 1600px) without upscaling small files", async () => {
    expect(AVATAR_MAX_DIM).toBe(1024);
    expect(COVER_MAX_DIM).toBe(1600);

    // Large avatar downsizes inside 1024.
    const bigUpload = vi.fn(async () => ({ error: null }));
    const big = await pngFile(1200, 800);
    const bigResult = await uploadAsset(PROFILE_ID, "avatar", big, adminDb({ upload: bigUpload }));
    expect(bigResult.ok).toBe(true);
    const bigBody = (bigUpload.mock.calls[0] as unknown as unknown[])[1] as Buffer;
    const bigMeta = await sharp(bigBody).metadata();
    expect(Math.max(bigMeta.width ?? 0, bigMeta.height ?? 0)).toBeLessThanOrEqual(1024);
    expect(webpMagic(bigBody)).toBe(true);

    // Small file keeps its size (never upscales).
    const smallUpload = vi.fn(async () => ({ error: null }));
    const small = await pngFile(100, 80);
    const smallResult = await uploadAsset(
      PROFILE_ID,
      "avatar",
      small,
      adminDb({ upload: smallUpload }),
    );
    expect(smallResult.ok).toBe(true);
    const smallBody = (smallUpload.mock.calls[0] as unknown as unknown[])[1] as Buffer;
    const smallMeta = await sharp(smallBody).metadata();
    expect(smallMeta.width).toBe(100);
    expect(smallMeta.height).toBe(80);
  });

  it("rejects sources larger than 4000px without uploading", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const wide = await pngFile(4100, 10);
    const result = await uploadAsset(PROFILE_ID, "cover", wide, adminDb({ upload }));
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });
});

describe("zero-client public asset URLs (tap path)", () => {
  const ENV_KEY = "NEXT_PUBLIC_SUPABASE_URL";
  const previous = process.env[ENV_KEY];

  function withEnv(value: string | undefined, fn: () => void) {
    if (value === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = value;
    try {
      fn();
    } finally {
      if (previous === undefined) delete process.env[ENV_KEY];
      else process.env[ENV_KEY] = previous;
    }
  }

  it("builds the same URL as getPublicUrl without a client", () => {
    withEnv("https://xyz.supabase.co", () => {
      const path = "profiles/abc/avatar/0123456789abcdef.webp";
      const viaClient = publicAssetUrl(
        {
          storage: {
            from: () => ({
              getPublicUrl: (p: string) => ({
                data: {
                  publicUrl: `https://xyz.supabase.co/storage/v1/object/public/${PROFILE_ASSETS_BUCKET}/${p}`,
                },
              }),
            }),
          },
        } as unknown as StorageDb,
        path,
      );
      expect(publicAssetPathUrl(path)).toBe(viaClient);
    });
  });

  it("returns null for null paths and missing config", () => {
    withEnv("https://xyz.supabase.co", () => {
      expect(publicAssetPathUrl(null)).toBeNull();
    });
    withEnv(undefined, () => {
      expect(publicAssetPathUrl("profiles/a/avatar/b.webp")).toBeNull();
      expect(storageOrigin()).toBeNull();
    });
  });

  it("exposes the storage origin for preconnect", () => {
    withEnv("https://xyz.supabase.co", () => {
      expect(storageOrigin()).toBe("https://xyz.supabase.co");
    });
    withEnv("https://xyz.supabase.co/", () => {
      expect(storageOrigin()).toBe("https://xyz.supabase.co");
    });
  });
});

describe("section images (Phase 29)", () => {
  const CLIENT_ID = "123e4567-e89b-12d3-a456-426614174001";
  const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174003";

  function sectionDb(options: {
    authed?: boolean;
    ownerClientId?: string;
    upload?: ReturnType<typeof vi.fn>;
  } = {}) {
    const { authed = true, ownerClientId = CLIENT_ID, upload = vi.fn(async () => ({ error: null })) } =
      options;
    return {
      auth: {
        getClaims: async () =>
          authed ? { data: { claims: { sub: "admin" } }, error: null } : { data: null },
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: PROFILE_ID, client_id: ownerClientId },
              error: null,
            }),
          }),
        }),
      }),
      storage: { from: () => ({ upload }) },
    } as unknown as StorageDb;
  }

  function pngFile() {
    return new File([PNG_BYTES], "dish.png", { type: "image/png" });
  }

  it("generates section-scoped paths accepted by the managed gate", () => {
    const path = sectionAssetPath(CLIENT_ID, "menu", "webp");
    expect(path.startsWith(`${CLIENT_ID}/sections/menu/`)).toBe(true);
    expect(isManagedSectionImagePath(path)).toBe(true);
    expect(isManagedAssetPath(path)).toBe(true);
    // Identity assets keep working through the union gate.
    expect(
      isManagedAssetPath("profiles/123e4567-e89b-12d3-a456-426614174000/avatar/abcdef0123456789.png"),
    ).toBe(true);
  });

  it("rejects traversal and foreign shapes in the section gate", () => {
    expect(isManagedSectionImagePath(`${CLIENT_ID}/sections/../other/abcdef0123456789.webp`)).toBe(false);
    expect(isManagedSectionImagePath("not-a-uuid/sections/menu/abcdef0123456789.webp")).toBe(false);
    expect(isManagedSectionImagePath(`${CLIENT_ID}/sections/menu/abcdef0123456789.svg`)).toBe(false);
    expect(isManagedSectionImagePath(`${CLIENT_ID}/sections/menu/short.webp`)).toBe(false);
    expect(isManagedSectionImagePath("")).toBe(false);
  });

  it("uploads real bytes to the section path with webp normalization", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const result = await uploadSectionImage(CLIENT_ID, PROFILE_ID, "menu", pngFile(), sectionDb({ upload }));
    expect(result.ok).toBe(true);
    expect(upload).toHaveBeenCalledOnce();
    const [path, bytes, options] = upload.mock.calls[0] as unknown as [
      string,
      unknown,
      { contentType: string },
    ];
    expect(path.startsWith(`${CLIENT_ID}/sections/menu/`)).toBe(true);
    expect(options.contentType).toBe("image/webp");
    expect(bytes).toBeDefined();
    if (result.ok) expect(isManagedAssetPath(result.path)).toBe(true);
  });

  it("denies cross-client uploads without touching storage", async () => {
    const upload = vi.fn();
    const result = await uploadSectionImage(
      "223e4567-e89b-12d3-a456-426614174002",
      PROFILE_ID,
      "menu",
      pngFile(),
      sectionDb({ upload }),
    );
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects bad section types and forged bytes", async () => {
    const upload = vi.fn();
    const db = sectionDb({ upload });
    expect((await uploadSectionImage(CLIENT_ID, PROFILE_ID, "../evil", pngFile(), db)).ok).toBe(false);
    const forged = new File(["<html></html>"], "evil.png", { type: "image/png" });
    expect((await uploadSectionImage(CLIENT_ID, PROFILE_ID, "menu", forged, db)).ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const upload = vi.fn();
    const result = await uploadSectionImage(
      CLIENT_ID,
      PROFILE_ID,
      "menu",
      pngFile(),
      sectionDb({ upload, authed: false }),
    );
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("stores gallery uploads under the gallery scope with managed deletion", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const db = sectionDb({ upload });
    const result = await uploadSectionImage(CLIENT_ID, PROFILE_ID, "gallery", pngFile(), db);
    expect(result.ok).toBe(true);
    const [path] = upload.mock.calls[0] as unknown as [string];
    expect(path.startsWith(`${CLIENT_ID}/sections/gallery/`)).toBe(true);
    if (result.ok) {
      expect(isManagedAssetPath(result.path)).toBe(true);
      const remove = vi.fn(async () => ({ error: null }));
      const dbWithRemove = {
        ...db,
        storage: { from: vi.fn(() => ({ remove })) },
      } as unknown as StorageDb;
      expect((await removeAsset(result.path, dbWithRemove)).ok).toBe(true);
      const [[bucket]] = (dbWithRemove.storage.from as unknown as ReturnType<typeof vi.fn>).mock
        .calls as unknown as [[string]];
      expect(bucket).toBe(PROFILE_ASSETS_BUCKET);
    }
  });
});

describe("documents (Phase 31 CV PDFs)", () => {
  const CLIENT_ID = "123e4567-e89b-12d3-a456-426614174001";
  const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174003";
  const PDF_BYTES = new TextEncoder().encode("%PDF-1.4 minimal");

  function docDb(options: {
    authed?: boolean;
    ownerClientId?: string;
    upload?: ReturnType<typeof vi.fn>;
    remove?: ReturnType<typeof vi.fn>;
  } = {}) {
    const {
      authed = true,
      ownerClientId = CLIENT_ID,
      upload = vi.fn(async () => ({ error: null })),
      remove = vi.fn(async () => ({ error: null })),
    } = options;
    return {
      auth: {
        getClaims: async () =>
          authed ? { data: { claims: { sub: "admin" } }, error: null } : { data: null },
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: PROFILE_ID, client_id: ownerClientId },
              error: null,
            }),
          }),
        }),
      }),
      storage: { from: vi.fn(() => ({ upload, remove })) },
      __upload: upload,
      __remove: remove,
    } as unknown as StorageDb & { __upload: ReturnType<typeof vi.fn>; __remove: ReturnType<typeof vi.fn> };
  }

  function pdfFile() {
    return new File([PDF_BYTES], "cv.pdf", { type: "application/pdf" });
  }

  it("detects PDF magic bytes and rejects impostors", () => {
    expect(detectPdfKind(new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(detectPdfKind(new TextEncoder().encode("<html>"))).toBe(false);
    expect(detectPdfKind(new Uint8Array([]))).toBe(false);
  });

  it("generates document paths accepted by the document gate only", () => {
    const path = documentAssetPath(CLIENT_ID, "cv");
    expect(path.startsWith(`${CLIENT_ID}/sections/cv/`)).toBe(true);
    expect(path.endsWith(".pdf")).toBe(true);
    expect(isManagedDocumentPath(path)).toBe(true);
    // Documents are NOT valid image paths and vice versa.
    expect(isManagedSectionImagePath(path)).toBe(false);
    expect(isManagedDocumentPath(`${CLIENT_ID}/sections/cv/abcdef0123456789.webp`)).toBe(false);
    expect(isManagedDocumentPath(`${CLIENT_ID}/sections/../other/abcdef0123456789.pdf`)).toBe(false);
  });

  it("uploads real PDFs to the private bucket with original bytes", async () => {
    const db = docDb();
    const result = await uploadDocument(CLIENT_ID, PROFILE_ID, "cv", pdfFile(), db);
    expect(result.ok).toBe(true);
    expect(db.__upload).toHaveBeenCalledOnce();
    const [path, file, options] = db.__upload.mock.calls[0] as [
      string,
      File,
      { contentType: string },
    ];
    expect(path.startsWith(`${CLIENT_ID}/sections/cv/`)).toBe(true);
    expect(options.contentType).toBe("application/pdf");
    expect(file).toBeInstanceOf(File);
    const [[bucket]] = (db.storage.from as ReturnType<typeof vi.fn>).mock.calls as [[string]];
    expect(bucket).toBe(PROFILE_DOCUMENTS_BUCKET);
  });

  it("rejects wrong MIME, forged bytes, oversized and cross-client uploads", async () => {
    const db = docDb();
    const pngAsPdf = new File([PDF_BYTES], "cv.pdf", { type: "image/png" });
    // MIME allowlist is PDF-only even when bytes are valid PDF.
    expect((await uploadDocument(CLIENT_ID, PROFILE_ID, "cv", pngAsPdf, db)).ok).toBe(false);
    const forged = new File(["<html></html>"], "cv.pdf", { type: "application/pdf" });
    expect((await uploadDocument(CLIENT_ID, PROFILE_ID, "cv", forged, db)).ok).toBe(false);
    expect(db.__upload).not.toHaveBeenCalled();

    const cross = await uploadDocument(
      "223e4567-e89b-12d3-a456-426614174002",
      PROFILE_ID,
      "cv",
      pdfFile(),
      docDb(),
    );
    expect(cross.ok).toBe(false);

    const anon = await uploadDocument(CLIENT_ID, PROFILE_ID, "cv", pdfFile(), docDb({ authed: false }));
    expect(anon.ok).toBe(false);

    expect((await uploadDocument(CLIENT_ID, PROFILE_ID, "../evil", pdfFile(), docDb())).ok).toBe(false);
  });

  it("routes document deletes to the private bucket", async () => {
    const db = docDb();
    const path = documentAssetPath(CLIENT_ID, "cv");
    expect((await removeAsset(path, db)).ok).toBe(true);
    const [[bucket]] = (db.storage.from as ReturnType<typeof vi.fn>).mock.calls as [[string]];
    expect(bucket).toBe(PROFILE_DOCUMENTS_BUCKET);
    // Non-managed paths still rejected.
    expect((await removeAsset("https://example.com/cv.pdf", db)).ok).toBe(false);
  });
});
