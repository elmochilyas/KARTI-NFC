import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/wallet/actions", () => ({ resolveWalletForRequest: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { headers } from "next/headers";
import { resolveWalletForRequest } from "@/features/wallet/actions";
import { GET } from "./route";

function mockUa(ua: string | null): void {
  vi.mocked(headers).mockResolvedValue({ get: () => ua } as never);
}

const props = (code: string) => ({ params: Promise.resolve({ code }) });

describe("GET /api/wallet/[code]", () => {
  it("serves the signed .pkpass on iOS with download headers", async () => {
    mockUa("iPhone");
    const buffer = Buffer.from("PK-pass-bytes");
    vi.mocked(resolveWalletForRequest).mockResolvedValue({
      ok: true,
      kind: "APPLE_PASS",
      buffer,
      filename: "ahmed-benali.pkpass",
      mimeType: "application/vnd.apple.pkpass",
    });
    const response = await GET({} as Request, props("ABCD234567"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/vnd.apple.pkpass");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="ahmed-benali.pkpass"',
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Length")).toBe(String(buffer.length));
  });

  it("302-redirects Android to the signed save link without caching", async () => {
    mockUa("Android");
    vi.mocked(resolveWalletForRequest).mockResolvedValue({
      ok: true,
      kind: "GOOGLE_LINK",
      url: "https://pay.google.com/gp/v/save/jwt",
    });
    const response = await GET({} as Request, props("ABCD234567"));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://pay.google.com/gp/v/save/jwt");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("answers desktop hits with the phone-modal signal", async () => {
    mockUa("Windows");
    vi.mocked(resolveWalletForRequest).mockResolvedValue({
      ok: false,
      error: { code: "PLATFORM_UNSUPPORTED", message: "Wallet is available on mobile devices." },
    });
    const response = await GET({} as Request, props("ABCD234567"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      code: "PLATFORM_UNSUPPORTED",
      message: "Wallet is available on mobile devices.",
    });
  });

  it("collapses unknown profiles to a plain 404", async () => {
    mockUa("iPhone");
    vi.mocked(resolveWalletForRequest).mockResolvedValue({
      ok: false,
      error: { code: "PROFILE_UNAVAILABLE", message: "Not found" },
    });
    const response = await GET({} as Request, props("ZZZZZZZZZZ"));
    expect(response.status).toBe(404);
  });

  it("fails generation errors generically with no-store", async () => {
    mockUa("iPhone");
    vi.mocked(resolveWalletForRequest).mockResolvedValue({
      ok: false,
      error: {
        code: "WALLET_NOT_CONFIGURED",
        message: "Unable to create wallet card. Please try again.",
      },
    });
    const response = await GET({} as Request, props("ABCD234567"));
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Unable to create wallet card. Please try again.");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
