import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { adminMock } = vi.hoisted(() => ({ adminMock: { from: vi.fn() } }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => adminMock }));

import { getPublicReceipt } from "./receiptLookup";

describe("getPublicReceipt gates", () => {
  it("refuses order-number-only lookups without touching the database", async () => {
    expect(await getPublicReceipt("KARTI-000124", null)).toBeNull();
    expect(await getPublicReceipt("KARTI-000124", undefined)).toBeNull();
    expect(await getPublicReceipt("KARTI-000124", "")).toBeNull();
    expect(await getPublicReceipt("KARTI-000124", "not-a-token")).toBeNull();
    expect(adminMock.from).not.toHaveBeenCalled();
  });

  it("refuses malformed order numbers without touching the database", async () => {
    expect(
      await getPublicReceipt("00000000-0000-4000-8000-000000000000", "a".repeat(64)),
    ).toBeNull();
    expect(await getPublicReceipt("KARTI-1", "a".repeat(64))).toBeNull();
    expect(await getPublicReceipt(null, "a".repeat(64))).toBeNull();
    expect(adminMock.from).not.toHaveBeenCalled();
  });
});
