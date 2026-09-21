import { NextResponse } from "next/server";
import { buildProfileManifest } from "@/features/pwa/manifest";
import { getCachedPublicProfileByCode } from "@/features/profiles/publicCache";
import { getAppUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ManifestRouteContext = {
  params: Promise<{ code: string }>;
};

/**
 * GET /u/[code]/manifest.webmanifest — profile-specific PWA identity.
 *
 * Each profile carries its own install identity (name + icon + start_url
 * all describe THAT profile — there is no generic Karti app manifest).
 * Same privileged ACTIVE-only read path as the public page (ADR-018) plus
 * the purge-only cache tag, so dashboard edits invalidate the manifest
 * with zero stale windows. Unknown, malformed, DRAFT, or INACTIVE codes
 * collapse to one generic 404 without revealing which case it is.
 *
 * `no-store`: the manifest must never outlive a deactivation, and it is
 * fetched at install time only — correctness beats caching here, same as
 * the resolver and vCard endpoint.
 */
export async function GET(_request: Request, { params }: ManifestRouteContext) {
  const { code } = await params;

  let data;
  try {
    data = await getCachedPublicProfileByCode(code);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const manifest = buildProfileManifest({
    displayName: data.profile.display_name,
    publicCode: data.profile.public_code,
    appUrl: getAppUrl(),
    accentColor: data.profile.accent_color,
    bio: data.profile.bio,
  });

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
