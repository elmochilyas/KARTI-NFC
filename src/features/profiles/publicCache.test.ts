import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Hoisted: vi.mock factories run before top-level consts initialize, so the
// mock state must live in vi.hoisted. Options are captured in plain state
// because beforeEach(clearAllMocks) wipes import-time mock.calls history.
const { updateTag, unstableCacheImpl, lastCacheOptions } = vi.hoisted(() => {
  const state: { options: unknown } = { options: undefined };
  return {
    updateTag: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unstableCacheImpl: vi.fn((...args: any[]) => {
      state.options = args[2];
      return args[0];
    }),
    lastCacheOptions: () => state.options,
  };
});

vi.mock("next/cache", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateTag: (...args: any[]) => updateTag(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (...args: any[]) => (unstableCacheImpl as (...a: any[]) => unknown)(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("./public", () => ({
  getPublicProfileBySlug: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicProfileBySlug } from "./public";
import {
  getCachedPublicProfileBySlug,
  PUBLIC_PROFILES_TAG,
  revalidatePublicProfiles,
} from "./publicCache";

describe("publicCache (zero-stale tap cache)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a stable global tag", () => {
    expect(PUBLIC_PROFILES_TAG).toBe("public-profiles");
  });

  it("delegates to the uncached loader with a privileged client", async () => {
    const db = { from: vi.fn() };
    vi.mocked(createAdminClient).mockReturnValue(db as never);
    vi.mocked(getPublicProfileBySlug).mockResolvedValue("row" as never);
    await expect(getCachedPublicProfileBySlug("Ahmed-Benali")).resolves.toBe("row");
    expect(createAdminClient).toHaveBeenCalledTimes(1);
    expect(getPublicProfileBySlug).toHaveBeenCalledWith("Ahmed-Benali", db);
  });

  it("returns null without querying when the server client is unconfigured", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("not configured");
    });
    await expect(getCachedPublicProfileBySlug("ahmed")).resolves.toBeNull();
    expect(getPublicProfileBySlug).not.toHaveBeenCalled();
  });

  it("purges immediately via updateTag on dashboard writes", () => {
    revalidatePublicProfiles();
    expect(updateTag).toHaveBeenCalledWith(PUBLIC_PROFILES_TAG);
  });

  it("registers the cached loader with no TTL (purge-only freshness)", () => {
    // Registration happens once at import (before beforeEach clears mock
    // history), so assert the captured options rather than mock.calls.
    expect(lastCacheOptions()).toEqual({
      tags: [PUBLIC_PROFILES_TAG],
      revalidate: false,
    });
  });
});
