import "server-only";
import { NextResponse } from "next/server";
import { detectImageKind, publicAssetPathUrl } from "@/features/profiles/storage";
import { getCachedPublicProfileByCode } from "@/features/profiles/publicCache";
import {
  ICON_SOURCE_MAX_BYTES,
  PROFILE_ICON_SIZES,
  iconBackground,
  iconFallbackSvg,
  iconInitials,
  type ProfileIconFile,
} from "./icons";

export type RenderedIcon = {
  png: Buffer;
  file: ProfileIconFile;
};

/**
 * The 512 entry doubles as the manifest's maskable icon
 * (`purpose: "any maskable"`): keep the subject inside the center ~80%
 * safe zone so Android adaptive cropping (circle/squircle) never clips a
 * face, padding outward with the profile accent.
 */
export const MASKABLE_ICON_FILE: ProfileIconFile = "icon-512.png";
export const MASKABLE_INNER_RATIO = 0.8;

async function loadSharp(): Promise<typeof import("sharp").default | null> {
  try {
    const mod = await import("sharp");
    const candidate =
      (mod as unknown as { default?: unknown }).default ??
      (mod as unknown as { sharp?: unknown }).sharp ??
      mod;
    return typeof candidate === "function" ? (candidate as typeof import("sharp").default) : null;
  } catch {
    return null;
  }
}

/**
 * Render a square PNG home-screen icon for an ACTIVE profile.
 *
 * Source priority: current avatar (square center-crop, consistent with the
 * public profile photo) → accent initials tile when no avatar exists, the
 * bytes fail to load, or the bytes are not a real image. Returns null for
 * unknown/malformed/DRAFT/INACTIVE codes (caller → generic 404) and when
 * the image pipeline is unavailable (the manifest stays valid JSON;
 * installation simply degrades).
 *
 * No new storage objects, no new tables: icons render on demand from the
 * already-public avatar, so avatar edits take effect immediately.
 */
export async function renderProfileIcon(
  rawCode: string,
  file: ProfileIconFile,
): Promise<RenderedIcon | null> {
  const px = PROFILE_ICON_SIZES[file];
  const sharp = await loadSharp();
  if (!sharp) return null;

  let data;
  try {
    data = await getCachedPublicProfileByCode(rawCode);
  } catch {
    return null;
  }
  if (!data) return null;

  const maskable = file === MASKABLE_ICON_FILE;
  const inner = maskable ? Math.round(px * MASKABLE_INNER_RATIO) : px;
  const backdrop = iconBackground(data.profile.accent_color);
  const finish = (input: Buffer): Promise<Buffer> => {
    let pipeline = sharp(input).resize(inner, inner, { fit: "cover", position: "centre" });
    if (maskable) {
      const total = px - inner;
      const leading = Math.floor(total / 2);
      pipeline = pipeline.extend({
        top: leading,
        left: leading,
        bottom: total - leading,
        right: total - leading,
        background: backdrop,
      });
    }
    return pipeline.png().toBuffer();
  };

  const avatarBytes = await fetchAvatarBytes(data.profile.avatar_path);
  if (avatarBytes) {
    try {
      const png = await finish(avatarBytes);
      return { png, file };
    } catch {
      // Fall through to the initials tile.
    }
  }

  try {
    const svg = iconFallbackSvg(iconInitials(data.profile.display_name), backdrop, inner);
    const png = await finish(Buffer.from(svg, "utf8"));
    return { png, file };
  } catch {
    return null;
  }
}

/** Fetch the public avatar and prove it is a real image before piping it. */
async function fetchAvatarBytes(avatarPath: string | null): Promise<Buffer | null> {
  if (!avatarPath) return null;
  const url = publicAssetPathUrl(avatarPath);
  if (!url) return null;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
  if (bytes.byteLength === 0 || bytes.byteLength > ICON_SOURCE_MAX_BYTES) return null;
  if (!detectImageKind(new Uint8Array(bytes.subarray(0, 12)))) return null;
  return bytes;
}

/** Shared icon response: PNG bytes with locked content type, never cached. */
export async function serveProfileIcon(
  rawCode: string,
  file: ProfileIconFile,
): Promise<NextResponse> {
  const rendered = await renderProfileIcon(rawCode, file);
  if (!rendered) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(Uint8Array.from(rendered.png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(rendered.png.byteLength),
    },
  });
}
