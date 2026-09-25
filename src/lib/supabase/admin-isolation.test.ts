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
  });
});
