import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "./page";
import LoginPage from "./login/page";
import DashboardLayout from "./dashboard/layout";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/env", () => ({ isSupabaseConfigured: vi.fn(() => true) }));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/components/dashboard/DashboardShell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => children,
}));

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

beforeEach(() => {
  vi.mocked(redirect).mockClear();
  vi.mocked(isSupabaseConfigured).mockReset();
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  vi.mocked(createClient).mockReset();
});

function homepageHtml(): string {
  return renderToStaticMarkup(HomePage());
}

describe("public homepage brand cleanup", () => {
  it("does not expose an admin sign-in entry point", () => {
    const html = homepageHtml();
    expect(html).not.toContain("Admin sign in");
    expect(html.toLowerCase()).not.toContain("admin");
  });

  it("does not link to /login or /dashboard anywhere", () => {
    const html = homepageHtml();
    expect(html).not.toContain("/login");
    expect(html).not.toContain("/dashboard");
    expect(html).not.toContain("<a");
    expect(html.toLowerCase()).not.toContain("dashboard");
  });

  it("does not expose implementation details", () => {
    const html = homepageHtml();
    expect(html).not.toContain("permanent URL");
    expect(html).not.toContain("rewriting the tag");
    expect(html).not.toContain("destination can change");
  });

  it("stays a minimal premium brand page", () => {
    const html = homepageHtml();
    expect(html).toContain("Karti");
    expect(html).toContain("Your smart contact card.");
    expect(html).toContain("Share your contact details");
    expect(html).toContain("NFC");
    expect(html).toContain("QR");
  });

  it("has no login/admin route referenced in its source", () => {
    const source = readFileSync(join(SRC_DIR, "app", "page.tsx"), "utf8");
    expect(source).not.toContain("/login");
    expect(source).not.toContain("/dashboard");
    expect(source).not.toContain("Admin");
  });
});

describe("/login operator access (direct URL)", () => {
  it("still renders the sign-in form", async () => {
    const element = await LoginPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Sign in");
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
  });

  it("still defaults an authorized operator to /dashboard", async () => {
    const element = await LoginPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('name="next"');
    expect(html).toContain('value="/dashboard"');
  });

  it("still honors a safe next parameter", async () => {
    const element = await LoginPage({
      searchParams: Promise.resolve({ next: "/dashboard/clients" }),
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('value="/dashboard/clients"');
  });
});

describe("protected dashboard behavior (unchanged)", () => {
  function claimsClient(claims: Record<string, unknown> | null) {
    return {
      auth: {
        getClaims: vi.fn(async () => ({ data: { claims }, error: null })),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>;
  }

  it("redirects anonymous visitors to /login", async () => {
    vi.mocked(createClient).mockResolvedValue(claimsClient(null));
    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=/dashboard",
    );
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login?next=/dashboard");
  });

  it("redirects to /login with a setup notice when Supabase is missing", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=/dashboard&setup=missing-env",
    );
  });

  it("renders the shell for an authenticated operator", async () => {
    vi.mocked(createClient).mockResolvedValue(
      claimsClient({ sub: "operator-id", email: "admin@karti.app" }),
    );
    const element = (await DashboardLayout({ children: "inner" })) as unknown as {
      props: { children: unknown };
    };
    expect(element.props.children).toBe("inner");
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("keeps the proxy dashboard/login gates intact", () => {
    const proxySource = readFileSync(join(SRC_DIR, "proxy.ts"), "utf8");
    // Unauthenticated /dashboard/** → /login.
    expect(proxySource).toContain('url.pathname = "/login"');
    // Authenticated /login → /dashboard.
    expect(proxySource).toContain('"/dashboard"');
    expect(proxySource).toContain("getClaims()");
  });
});
