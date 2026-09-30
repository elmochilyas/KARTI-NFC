import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC_ROOT = path.resolve(__dirname, "..", "..");

/** Collect every .ts/.tsx file under src (excluding tests and generated types). */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...sourceFiles(full));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx") &&
      full !== path.join(SRC_ROOT, "types", "database.ts")
    ) {
      out.push(full);
    }
  }
  return out;
}

describe("service-role isolation", () => {
  it("no client component imports the privileged admin client or server secrets", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC_ROOT)) {
      const content = fs.readFileSync(file, "utf8");
      if (!content.includes('"use client"')) continue;
      if (
        content.includes("lib/supabase/admin") ||
        content.includes("lib/env-server") ||
        content.includes("SUPABASE_SERVICE_ROLE_KEY")
      ) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the browser-safe env module has no server-only import and no secret reads", () => {
    const env = fs.readFileSync(path.join(SRC_ROOT, "lib", "env.ts"), "utf8");
    expect(env).not.toMatch(/from ["']server-only["']|import ["']server-only["']/);
    expect(env).not.toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    expect(env).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
  });

  it("public-profile rendering never touches the maps resolver or server actions", () => {
    const offenders: string[] = [];
    const queue: string[] = [path.join(SRC_ROOT, "components", "public-profile")];
    while (queue.length > 0) {
      const dir = queue.pop() as string;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          queue.push(full);
        } else if (
          /\.(ts|tsx)$/.test(entry.name) &&
          !entry.name.endsWith(".test.ts") &&
          !entry.name.endsWith(".test.tsx")
        ) {
          const content = fs.readFileSync(full, "utf8");
          if (
            content.includes("features/profiles/mapLinks") ||
            content.includes("resolveMapLink") ||
            content.includes("clients/[id]/profile/actions") ||
            content.includes("leaflet")
          ) {
            offenders.push(path.relative(SRC_ROOT, full));
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("server secrets live only behind the server-only guard", () => {
    const envServer = fs.readFileSync(path.join(SRC_ROOT, "lib", "env-server.ts"), "utf8");
    expect(envServer).toContain('import "server-only"');
    const admin = fs.readFileSync(path.join(SRC_ROOT, "lib", "supabase", "admin.ts"), "utf8");
    expect(admin).toContain('import "server-only"');
    const writer = fs.readFileSync(
      path.join(SRC_ROOT, "lib", "supabase", "orderWriter.ts"),
      "utf8",
    );
    expect(writer).toContain('import "server-only"');
    const rateLimit = fs.readFileSync(
      path.join(SRC_ROOT, "features", "vitrine", "rateLimitServer.ts"),
      "utf8",
    );
    expect(rateLimit).toContain('import "server-only"');
    // The rate-limit secret is server-only: never NEXT_PUBLIC_, never logged.
    expect(envServer).toContain("RATE_LIMIT_SECRET");
    expect(envServer).not.toContain("NEXT_PUBLIC_RATE_LIMIT");
    expect(rateLimit).not.toContain("console.");
  });

  it("no client component imports the rate-limit server module or receipt internals", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC_ROOT)) {
      const content = fs.readFileSync(file, "utf8");
      if (!content.includes('"use client"')) continue;
      if (
        content.includes("rateLimitServer") ||
        content.includes("vitrine/order/receipt") ||
        content.includes("RATE_LIMIT_SECRET") ||
        content.includes("RECEIPT_TOKEN_SECRET")
      ) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("marketing GTM loads only in the public vitrine shell, never in dashboard/admin", () => {
    const gtmMarkers = [
      "googletagmanager.com",
      "GtmBootstrap",
      "gtmTransport",
      "ConsentBanner",
      "PageViewTracker",
      "window.dataLayer",
    ];
    const dashboardOffenders: string[] = [];
    const queue: string[] = [path.join(SRC_ROOT, "app", "dashboard")];
    while (queue.length > 0) {
      const dir = queue.pop() as string;
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          queue.push(full);
        } else if (
          /\.(ts|tsx)$/.test(entry.name) &&
          !entry.name.endsWith(".test.ts") &&
          !entry.name.endsWith(".test.tsx")
        ) {
          const content = fs.readFileSync(full, "utf8");
          if (gtmMarkers.some((marker) => content.includes(marker))) {
            dashboardOffenders.push(path.relative(SRC_ROOT, full));
          }
        }
      }
    }
    expect(dashboardOffenders).toEqual([]);
    // Root layout stays GTM-free too (GTM mounts in VitrineShell only).
    const rootLayout = fs.readFileSync(path.join(SRC_ROOT, "app", "layout.tsx"), "utf8");
    for (const marker of gtmMarkers) {
      expect(rootLayout).not.toContain(marker);
    }
    // Public shell owns the integration exactly once.
    const shell = fs.readFileSync(
      path.join(SRC_ROOT, "features", "vitrine", "VitrineShell.tsx"),
      "utf8",
    );
    expect(shell).toContain("GtmBootstrap");
    expect(shell).toContain("PageViewTracker");
    expect(shell).toContain("ConsentBanner");
  });

  it("exactly one module wires the analytics transport (no scattered vendor calls)", () => {
    const wirers: string[] = [];
    for (const file of sourceFiles(SRC_ROOT)) {
      const content = fs.readFileSync(file, "utf8");
      if (content.includes("setAnalyticsTransport(gtmTransport)")) {
        wirers.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(wirers).toEqual([path.join("features", "vitrine", "GtmBootstrap.tsx")]);
  });
});
