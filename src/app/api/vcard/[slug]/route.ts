import { NextResponse } from "next/server";
import { buildVCard } from "@/domain/vcard";
import { getPublicProfileBySlug } from "@/features/profiles/public";
import { getAppUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

type VCardRouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * GET /api/vcard/[slug] — Save Contact download for ACTIVE profiles only.
 * Same privileged read path as the public page (ADR-018); no caching
 * (fresh data beats stale contacts). DRAFT/INACTIVE/unknown → plain 404
 * without revealing which case.
 */
export async function GET(_request: Request, { params }: VCardRouteContext) {
  const { slug } = await params;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = await getPublicProfileBySlug(slug, supabase);
  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const vcf = buildVCard({
    displayName: data.profile.display_name,
    jobTitle: data.profile.job_title,
    companyName: data.profile.company_name,
    phone: data.profile.phone,
    whatsapp: data.profile.whatsapp,
    email: data.profile.email,
    website: data.profile.website,
    address: data.profile.address,
    profileUrl: `${getAppUrl()}/${data.profile.slug}`,
  });

  // Slug is normalized [a-z0-9-] by the query layer — safe filename base.
  const filename = `${data.profile.slug}.vcf`;
  return new NextResponse(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
