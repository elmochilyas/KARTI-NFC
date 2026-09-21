import { serveProfileIcon } from "@/features/pwa/iconImage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type IconRouteContext = {
  params: Promise<{ code: string }>;
};

/**
 * GET /u/[code]/apple-touch-icon.png — 180px iOS home-screen icon.
 * Same ACTIVE-only gate as the PWA icons; referenced from page metadata
 * so "Add to Home Screen" uses the profile avatar, not a generic mark.
 */
export async function GET(_request: Request, { params }: IconRouteContext) {
  const { code } = await params;
  return serveProfileIcon(code, "apple-touch-icon.png");
}
