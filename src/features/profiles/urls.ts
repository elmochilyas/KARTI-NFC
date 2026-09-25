import { normalizeSlug } from "@/domain/slugs";
import { getAppUrl } from "@/lib/env";

/**
 * Canonical public profile URL (single source; mirrors card permanent URLs).
 * Derived fresh from the CURRENT slug every render — never stored, so slug
 * edits take effect immediately after save. No card is created by this.
 */
export function publicProfileUrl(slug: string, appUrl: string = getAppUrl()): string {
  const clean = normalizeSlug(slug) || "profile";
  return `${appUrl.replace(/\/+$/, "")}/${clean}`;
}

/** Human display form without protocol: karti.pro/ahmed-benali. */
export function displayProfileUrl(fullUrl: string): string {
  return fullUrl.replace(/^https?:\/\//i, "");
}

/** Whether the link is publicly reachable (only ACTIVE profiles render). */
export function isProfileLinkPublic(status: string): boolean {
  return status === "ACTIVE";
}
