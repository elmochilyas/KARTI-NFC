/**
 * Delivery-Sheet retry sweep (machine authentication, no browser session).
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` — Vercel cron sends it
 * automatically, so scheduled retries need zero operator wiring. A
 * separate boundary from the dashboard admin session (manual Resync stays
 * behind requireAdmin()). Vercel cron triggers GET; machine callers may POST.
 */

import { getDeliveryCronSecrets } from "@/lib/env-server";
import { verifyBearerToken } from "@/features/integrations/google-sheets/signatures";
import { retryDueDeliverySyncs } from "@/features/integrations/google-sheets/sync";

export const dynamic = "force-dynamic";

async function authorized(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization");
  return getDeliveryCronSecrets().some((secret) => verifyBearerToken(secret, header));
}

async function runSweep(url: string): Promise<Response> {
  const limitParam = new URL(url).searchParams.get("limit");
  const parsed = limitParam === null ? 25 : Number(limitParam);
  const limit = Number.isSafeInteger(parsed) ? Math.min(Math.max(parsed, 1), 100) : 25;
  const counts = await retryDueDeliverySyncs(limit);
  return Response.json({ ok: true, ...counts });
}

export async function GET(req: Request): Promise<Response> {
  if (!(await authorized(req))) {
    return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  return runSweep(req.url);
}

export async function POST(req: Request): Promise<Response> {
  if (!(await authorized(req))) {
    return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  return runSweep(req.url);
}
