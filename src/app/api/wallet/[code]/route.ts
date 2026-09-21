import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { resolveWalletForRequest } from "@/features/wallet/actions";

/**
 * GET /api/wallet/[code] — digital wallet for ACTIVE profiles (ADR-046).
 *
 * Anonymous, server-only, no mutations. [code] is the immutable public_code
 * (never a slug, never /t/{shortCode} — the NFC destination mutates, wallet
 * identity must not). Platform is detected from the User-Agent header; the
 * visitor never chooses a wallet.
 *
 * - iOS → signed .pkpass download (Apple Wallet install flow).
 * - Android → 302 to the signed Google Wallet save link.
 * - Desktop/unknown UA → 400 with the phone-modal signal (the island shows
 *   the QR modal instead of navigating here).
 * - Missing/DRAFT/INACTIVE → plain 404, indistinguishable by design.
 * - Unconfigured backend or signing failure → generic 500 (the CTA is
 *   credential-gated, so this only fires on direct hits or broken creds).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type WalletRouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, { params }: WalletRouteContext) {
  const { code } = await params;
  const headerList = await headers();
  const userAgent = headerList.get("user-agent");

  const outcome = await resolveWalletForRequest(code, userAgent);

  if (!outcome.ok) {
    if (outcome.error.code === "PROFILE_UNAVAILABLE") {
      return new NextResponse("Not found", { status: 404 });
    }
    if (outcome.error.code === "PLATFORM_UNSUPPORTED") {
      return NextResponse.json(
        { ok: false, code: outcome.error.code, message: outcome.error.message },
        { status: 400 },
      );
    }
    return new NextResponse(outcome.error.message, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (outcome.kind === "GOOGLE_LINK") {
    const response = NextResponse.redirect(outcome.url, { status: 302 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  return new NextResponse(outcome.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": outcome.mimeType,
      "Content-Disposition": `attachment; filename="${outcome.filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(outcome.buffer.length),
    },
  });
}
