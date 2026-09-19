/**
 * Reserved public-profile slugs. A profile slug may never collide with an
 * application route (specs/DATA_MODEL.md). All entries are lowercase;
 * lookups must normalize first via normalizeSlug().
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
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
]);

/**
 * Normalize a candidate profile slug:
 * trim → lowercase → transliterate diacritics → spaces/underscores to
 * hyphens → drop unsupported chars → collapse repeated hyphens →
 * strip leading/trailing hyphens.
 *
 * Returns "" when nothing usable remains; callers must reject it.
 */
export function normalizeSlug(input: string): string {
  const ascii = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const hyphenated = ascii.replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "");
  return hyphenated.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
}

/** True when the (normalized) slug is reserved by the application. */
export function isReservedSlug(input: string): boolean {
  const slug = normalizeSlug(input);
  if (!slug) return true;
  return RESERVED_SLUGS.has(slug);
}
