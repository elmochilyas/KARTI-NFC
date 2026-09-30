/**
 * Static migration gate for Phase 1 corrections:
 * - jsonb object checks on configuration / metadata;
 * - non-negative item price checks;
 * - concurrency-safe order-number sequence (no MAX()+1);
 * - RLS enabled with admin-only policies and zero anon policies.
 *
 * Live behavior (anon denied, admin allowed, idempotency unique,
 * concurrent numbers) is verified against a Supabase branch in Phase 6;
 * this test pins the migration contract in CI.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260929000000_orders_foundation.sql",
);

function migrationSql(): string {
  return readFileSync(MIGRATION_PATH, "utf8");
}

describe("orders foundation migration contract", () => {
  it("rejects non-object configuration JSON", () => {
    expect(migrationSql()).toContain("jsonb_typeof(configuration) = 'object'");
  });

  it("rejects non-object event metadata JSON", () => {
    expect(migrationSql()).toContain("jsonb_typeof(metadata) = 'object'");
  });

  it("enforces non-negative item prices when non-null", () => {
    const sql = migrationSql();
    expect(sql).toContain("unit_price_minor is null or unit_price_minor >= 0");
    expect(sql).toContain("line_total_minor is null or line_total_minor >= 0");
  });

  it("generates order numbers from an atomic sequence, never MAX()+1", () => {
    const sql = migrationSql();
    expect(sql).toContain("create sequence if not exists public.order_number_seq");
    expect(sql).toContain("nextval('public.order_number_seq')");
    // Strip SQL line comments so the documenting comment mentioning the
    // forbidden pattern does not trip the gate; the executable SQL must
    // never derive numbers from MAX().
    const executable = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .toUpperCase();
    expect(executable).not.toContain("SELECT MAX");
    expect(executable).not.toContain("MAX(EXISTING");
  });

  it("enables RLS on all five commercial tables with admin-only policies", () => {
    const sql = migrationSql();
    for (const table of [
      "public.orders",
      "public.order_items",
      "public.order_item_cards",
      "public.order_events",
      "public.inquiries",
    ]) {
      expect(sql).toContain(`alter table ${table} enable row level security`);
    }
    expect(sql).toContain('"Admins manage orders"');
    expect(sql).toContain('"Admins manage order items"');
    expect(sql).toContain('"Admins manage order item cards"');
    expect(sql).toContain('"Admins manage order events"');
    expect(sql).toContain('"Admins manage inquiries"');
    expect(sql).toContain("(select private.is_admin())");
  });

  it("grants no direct access to anon", () => {
    expect(migrationSql().toLowerCase()).not.toContain("to anon");
  });

  it("keeps money in integer minor units with quote/priced discipline", () => {
    const sql = migrationSql();
    expect(sql).toContain("subtotal_minor bigint");
    expect(sql).toContain("total_minor bigint");
    expect(sql).toContain("orders_priced_totals_present");
  });
});
