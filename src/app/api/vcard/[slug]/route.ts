import { NextResponse } from "next/server";
import { buildVCard, vcardContentDisposition } from "@/domain/vcard";
import { getPublicProfileRowBySlug } from "@/features/profiles/public";
import { getAppUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

type VCardRouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * GET /api/vcard/[slug] — Save Contact for ACTIVE profiles only.
 * Same privileged read path as the public page (ADR-018); profile-only
 * projection (no links query — the vCard body needs contact columns, never
 * link rows). Served `inline` as `text/vcard` so iOS Safari / Android
 * Chrome open the native contact/import preview instead of a Files/
 * Downloads detour (ADR-036). No caching (fresh data beats stale
 * contacts). DRAFT/INACTIVE/unknown → plain 404 without revealing which.
 */
export async function GET(_request: Request, { params }: VCardRouteContext) {
  const { slug } = await params;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const profile = await getPublicProfileRowBySlug(slug, supabase);
  if (!profile) {
    return new NextResponse("Not found", { status: 404 });
  }

  const vcf = buildVCard({
    displayName: profile.display_name,
    profileType: profile.profile_type,
    jobTitle: profile.job_title,
    companyName: profile.company_name,
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    email: profile.email,
    website: profile.website,
    address: profile.address,
    profileUrl: `${getAppUrl()}/${profile.slug}`,
  });

  // Slug is normalized [a-z0-9-] by the query layer; the disposition
  // helper re-sanitizes defensively so the header can never carry
  // CRLF/quotes/path characters.
  return new NextResponse(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": vcardContentDisposition(profile.slug),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(Buffer.byteLength(vcf, "utf8")),
    },
  });
}
