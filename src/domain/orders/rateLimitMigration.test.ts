/**
 * Static migration gate for the Phase 6 durable rate limiter
 * (supabase/migrations/20261005000000_rate_limit.sql).
 *
 * Pins in CI what live verification proves on the dev project:
 * hash-only abuse keys, RLS-closed table, owner+service_role RPC,
 * atomic increment/check, bounded cleanup, typed verdict.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20261005000000_rate_limit.sql",
);

function migrationSql(): string {
  return readFileSync(MIGRATION_PATH, "utf8");
}

describe("durable rate-limit migration contract", () => {
  it("stores transient counters keyed by hash + action + bucket", () => {
    const sql = migrationSql();
    expect(sql).toContain("create table if not exists public.rate_limits");
    expect(sql).toContain("primary key (key_hash, action, bucket_start)");
    expect(sql).toContain("check (count >= 0)");
    expect(sql).toContain("expires_at timestamptz not null");
  });

  it("never stores raw IPs or PII columns", () => {
    // Strip line comments so the documenting header cannot trip the gate;
    // the executable SQL must carry no PII column or marker.
    const executable = migrationSql()
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .toLowerCase();
    for (const forbidden of [
      "raw_ip",
      "ip_address",
      "user_agent",
      "user-agent",
      "email",
      "phone",
    ]) {
      expect(executable).not.toContain(forbidden);
    }
  });

  it("keeps the table RLS-closed with no browser policies", () => {
    const sql = migrationSql();
    expect(sql).toContain("alter table public.rate_limits enable row level security");
    expect(sql.toLowerCase()).not.toContain("create policy");
    expect(sql).toContain("revoke all on table public.rate_limits from public, anon, authenticated");
  });

  it("checks limits atomically in a locked-down SECURITY DEFINER function", () => {
    const sql = migrationSql();
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("on conflict (key_hash, action, bucket_start)");
    expect(sql).toContain("do update set count = public.rate_limits.count + 1");
    expect(sql).toContain("revoke all on function public.check_rate_limit(text, text, integer, integer)");
    expect(sql).toContain("from public, anon, authenticated");
  });

  it("bounds growth with opportunistic expired-bucket cleanup", () => {
    const sql = migrationSql();
    expect(sql).toContain("rate_limits_expires_at_idx");
    expect(sql).toContain("limit 100");
  });

  it("returns a typed verdict with retry guidance", () => {
    const sql = migrationSql();
    expect(sql).toContain("jsonb_build_object('allowed'");
    expect(sql).toContain("retry_after_secs");
  });
});
