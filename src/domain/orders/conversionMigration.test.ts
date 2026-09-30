/**
 * Static migration gate for the Phase 4 conversion/provisioning RPCs.
 * Pins the deliberately mirrored constants (short-code alphabet, reserved
 * slugs, product mapping) so SQL and TypeScript cannot drift silently.
 * Live behavior is proven against the dev database in the Phase 4 report.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CARD_SHORT_CODE_ALPHABET } from "@/domain/cards";
import { MARKETING_PRODUCT_CATALOG } from "./catalog";
import { isReservedSlug } from "@/domain/slugs";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20261004000000_order_conversion_provisioning.sql",
);

function migrationSql(): string {
  return readFileSync(MIGRATION_PATH, "utf8");
}

describe("conversion migration contract", () => {
  it("mirrors the card short-code alphabet exactly", () => {
    expect(migrationSql()).toContain(`^[${CARD_SHORT_CODE_ALPHABET}]{8}$`);
  });

  it("mirrors every reserved slug", () => {
    const sql = migrationSql();
    const slugs = [
      "admin",
      "api",
      "auth",
      "cards",
      "clients",
      "dashboard",
      "login",
      "logout",
      "new",
      "profiles",
      "settings",
      "t",
      "u",
      "fr",
      "ar",
      "en",
      "products",
      "solutions",
      "pricing",
      "examples",
      "resources",
      "guides",
      "faq",
      "contact",
      "order",
      "orders",
      "about",
      "delivery",
      "returns",
      "privacy",
      "terms",
      "how-it-works",
    ];
    for (const slug of slugs) {
      expect(isReservedSlug(slug)).toBe(true);
      expect(sql).toContain(`'${slug}'`);
    }
  });

  it("mirrors the catalog profile mapping for all eight products", () => {
    const sql = migrationSql();
    for (const [product, definition] of Object.entries(MARKETING_PRODUCT_CATALOG)) {
      expect(sql).toContain(`when '${product}' then ${definition.requiresProfile}`);
      if (definition.requiresProfile) {
        expect(sql).toContain(`when '${product}' then '${definition.profileType}'`);
      }
    }
  });

  it("shape-enforces external destinations including userinfo rejection", () => {
    const sql = migrationSql();
    expect(sql).toContain("v_url !~ '^https?://'");
    expect(sql).toContain("substring(v_url from '^https?://([^/]*)') like '%@%'");
  });

  it("keeps SECURITY DEFINER hygiene and explicit ACLs on all three RPCs", () => {
    const sql = migrationSql();
    for (const fn of [
      "admin_convert_order",
      "admin_provision_order_cards",
      "admin_resolve_order_destination",
    ]) {
      expect(sql).toContain(`function public.${fn}(`);
      expect(sql).toContain(`revoke all on function public.${fn}(`);
    }
    expect(sql.match(/security definer/g)?.length).toBeGreaterThanOrEqual(3);
    expect(sql.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(4);
  });
});
