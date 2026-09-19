import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { resolveCardDestination } from "@/features/cards/resolver";
import { createAdminClient } from "@/lib/supabase/admin";

type ResolverRouteContext = {
  params: Promise<{ code: string }>;
};

/**
 * GET /t/[code] — permanent card redirect resolver (ADR-003, ADR-024).
 *
 * Anonymous, no auth work (proxy fast-path skips Supabase here), no client
 * JS, no rendering. Temporary 307 redirect — never 301/308, because the
 * destination changes remotely and cached permanents would break the core
 * feature. `no-store` keeps dashboard edits effective immediately.
 * Every failure collapses to the branded unavailable page (no leaks).
 */
export async function GET(request: Request, { params }: ResolverRouteContext) {
  const { code } = await params;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    notFound();
  }

  const resolution = await resolveCardDestination(code, supabase);
  if (!resolution.ok) {
    notFound();
  }

  const target =
    resolution.kind === "PROFILE"
      ? new URL(resolution.target, request.url).toString()
      : resolution.target;

  const response = NextResponse.redirect(target, { status: 307 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
