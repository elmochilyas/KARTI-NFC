import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Static repository guard: the fixed-price-only model must not regress.
 *
 * Active application code (src/) must not reintroduce product-pricing
 * concepts: alternate pricing modes, quote-required states, or
 * request-quote customer copy. Intentionally excluded:
 * - supabase/migrations/* (applied history is never rewritten);
 * - specs/* (historical ADRs are superseded in place, not deleted);
 * - this guard file itself.
 */
const REPO_ROOT = join(__dirname, "..");

const SCOPED_DIRS = ["src/app", "src/components", "src/domain", "src/features", "src/lib"];

const EXCLUDED_PATHS = new Set(["src/pricing-guard.test.ts"]);

// Tokens that imply an ACTIVE alternate product-pricing model or
// quote-based purchase flow. Each entry is a plain substring matched
// case-sensitively against non-test and test sources alike.
//
// A line may carry `pricing-guard-allow: <token>` to document an
// intentional NEGATIVE assertion (a test proving the concept is gone).
// Anything else is a violation.
const FORBIDDEN_TOKENS = [
  "pricing_mode",
  "pricingMode",
  "PricingMode",
  "CatalogPricingMode",
  "pricing_status",
  "PricingStatus",
  "isPricingStatus",
  "QUOTE_REQUIRED",
  "SET_PRICE",
  "PRICE_SET",
  "requestPrice",
  "quoteNote",
  "quotePending",
  "stickyRequest",
  "FROM_PREFIX",
  "Request a price",
  "Demander un prix",
  "Demander un devis",
  "اطلب سعرا",
  "اطلب عرضا",
];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "node_modules") continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        out.push(full);
      }
    }
  };
  for (const dir of SCOPED_DIRS) walk(join(REPO_ROOT, dir));
  return out.sort();
}

describe("fixed-price-only repository guard", () => {
  it("contains no active alternate-pricing concepts in src/", () => {
    const violations: string[] = [];
    for (const file of sourceFiles()) {
      const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
      if (EXCLUDED_PATHS.has(rel)) continue;
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        for (const token of FORBIDDEN_TOKENS) {
          if (line.includes(token) && !line.includes(`pricing-guard-allow: ${token}`)) {
            violations.push(`${rel}:${index + 1} :: ${token}`);
          }
        }
      });
    }
    expect(violations, "reintroduced pricing concepts:\n" + violations.join("\n")).toEqual([]);
  });
});
