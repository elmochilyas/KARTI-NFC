import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  AVATAR_MAX_DIM,
  COVER_MAX_DIM,
  IMMUTABLE_CACHE_CONTROL,
  detectImageKind,
  isManagedAssetPath,
  removeAsset,
  uploadAsset,
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

  it("caps avatars at 512px (cover at 1600px) without upscaling small files", async () => {
    expect(AVATAR_MAX_DIM).toBe(512);
    expect(COVER_MAX_DIM).toBe(1600);

    // Large avatar downsizes inside 512.
    const bigUpload = vi.fn(async () => ({ error: null }));
    const big = await pngFile(1200, 800);
    const bigResult = await uploadAsset(PROFILE_ID, "avatar", big, adminDb({ upload: bigUpload }));
    expect(bigResult.ok).toBe(true);
    const bigBody = (bigUpload.mock.calls[0] as unknown as unknown[])[1] as Buffer;
    const bigMeta = await sharp(bigBody).metadata();
    expect(Math.max(bigMeta.width ?? 0, bigMeta.height ?? 0)).toBeLessThanOrEqual(512);
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
