import { serveProfileIcon } from "@/features/pwa/iconImage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type IconRouteContext = {
  params: Promise<{ code: string }>;
};

/**
 * GET /u/[code]/icon-512.png — 512px home-screen icon for the profile PWA.
 * ACTIVE profiles only (same gate as the page + manifest); unknown,
 * DRAFT, or INACTIVE codes → generic 404. Never cached (`no-store`) so
 * avatar edits reflect immediately.
 */
export async function GET(_request: Request, { params }: IconRouteContext) {
  const { code } = await params;
  return serveProfileIcon(code, "icon-512.png");
}
