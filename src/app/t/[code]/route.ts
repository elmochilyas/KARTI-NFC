import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { resolveCardDestination } from "@/features/cards/resolver";
import { getAppUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

type ResolverRouteContext = {
  params: Promise<{ code: string }>;
};

// Explicit: resolver is per-tap dynamic, never static, never ISR. Destination
// edits must take effect immediately (ADR-024).
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /t/[code] — permanent card redirect resolver (ADR-003, ADR-024).
 *
 * Anonymous, no auth work (proxy fast-path skips Supabase here), no client
 * JS, no rendering. Temporary 307 redirect — never 301/308, because the
 * destination changes remotely and cached permanents would break the core
 * feature. `no-store` keeps dashboard edits effective immediately.
 * Every failure collapses to the branded unavailable page (no leaks).
 */
export async function GET(_request: Request, { params }: ResolverRouteContext) {
  const started = Date.now();
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

  // PROFILE targets are same-origin paths; resolve them against the canonical
  // APP_URL, never the incoming Host header (host-header poisoning).
  const target =
    resolution.kind === "PROFILE"
      ? new URL(resolution.target, `${getAppUrl()}/`).toString()
      : resolution.target;

  const response = NextResponse.redirect(target, { status: 307 });
  response.headers.set("Cache-Control", "no-store");
  // Observability only: total resolver ms (validate + DB + redirect build).
  // Sampled server-side via Vercel logs; never blocks the redirect.
  response.headers.set("Server-Timing", `resolver;dur=${Date.now() - started}`);
  return response;
}
