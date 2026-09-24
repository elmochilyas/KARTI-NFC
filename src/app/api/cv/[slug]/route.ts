import { NextResponse } from "next/server";
import { getPublicProfileBySlug } from "@/features/profiles/public";
import { isManagedDocumentPath, PROFILE_DOCUMENTS_BUCKET } from "@/features/profiles/storage";
import { createAdminClient } from "@/lib/supabase/admin";

type CvRouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Resolve a stored CV reference to a downloadable path. Returns null for
 * anything that is not a server-shaped private-bucket document path —
 * traversal, URLs, and foreign shapes never reach storage. Exported for
 * unit tests.
 */
export function resolveCvFilePath(settings: unknown): string | null {
  if (typeof settings !== "object" || settings === null) return null;
  const file = (settings as Record<string, unknown>).file;
  if (typeof file !== "string" || file.trim() === "") return null;
  return isManagedDocumentPath(file) ? file : null;
}

/**
 * GET /api/cv/[slug] — CV download for ACTIVE profiles only.
 *
 * The `profile-documents` bucket has no public/anon read policy
 * (migration 20260928, ADR-057), so this endpoint is the only way to the
 * bytes: it re-resolves the ACTIVE profile server-side, reads the raw CV
 * settings through the privileged client (the public projection deliberately
 * strips the file path), validates the managed-document shape, and streams
 * the object. Served `inline` (same lesson as the vCard endpoint) with
 * `no-store`. DRAFT/INACTIVE/unknown/missing-CV/hostile-path → one generic
 * 404 without revealing which.
 */
export async function GET(_request: Request, { params }: CvRouteContext) {
  const { slug: rawSlug } = await params;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = await getPublicProfileBySlug(rawSlug, supabase);
  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: section, error: sectionError } = await supabase
    .from("profile_sections")
    .select("settings")
    .eq("profile_id", data.profile.id)
    .eq("type", "cv")
    .eq("enabled", true)
    .maybeSingle();
  if (sectionError) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = resolveCvFilePath((section as { settings?: unknown } | null)?.settings);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(PROFILE_DOCUMENTS_BUCKET)
    .download(file);
  if (downloadError || !blob) {
    return new NextResponse("Not found", { status: 404 });
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await blob.arrayBuffer();
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (bytes.byteLength === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Slug is normalized [a-z0-9-] by the query layer — header-safe.
  const filename = `${data.profile.slug}-cv.pdf`;
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
