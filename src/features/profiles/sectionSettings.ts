import { z } from "zod";
import type { Json } from "@/types/database";

/**
 * Phase 27 settings engine — per-type settings schemas.
 *
 * Every live section declares exactly the display keys the public renderer
 * honors. Zod strips unknown keys by default (unknown settings ignored),
 * and wrong value types fail validation (invalid settings rejected).
 * Planned types accept only `{}` until they ship their schema.
 *
 * Public-safety architecture (ADR-053): the schema IS the public allowlist.
 * The public loader sanitizes stored settings through these schemas, so
 * only declared display keys can ever reach the public projection —
 * smuggled admin-only or unknown keys are structurally stripped.
 */

export const heroSettingsSchema = z.object({
  showTagline: z.boolean().default(true),
  showCategory: z.boolean().default(true),
});

export const actionsSettingsSchema = z.object({
  showQuickTiles: z.boolean().default(true),
  showAbout: z.boolean().default(true),
  display: z.enum(["tiles", "buttons"]).default("tiles"),
  /**
   * How many quick-action tiles/buttons the public profile shows (Phase 34
   * unified editor: Contact step segmented control, 1–4, default 3 =
   * current look). Out-of-range stored values fail validation and fall back
   * to defaults on the public path; the admin save path rejects them.
   */
  maxQuickActions: z.number().int().min(1).max(4).default(3),
  /**
   * Explicit primary-action order (Phase 34.1, Contact step). Entries are
   * built-in ids (`call` | `whatsapp` | `email` | `website`) or
   * `link:<profile-link-uuid>` refs. Shape-validated here; each ref is
   * resolved against live data by `resolvePrimaryActions`, so stale refs
   * (deleted/disabled links, removed values) are ignored fail-safe.
   * Empty/absent = legacy default order (existing profiles unchanged).
   */
  primaryActions: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
});

export const linksSettingsSchema = z.object({
  showSubtitles: z.boolean().default(true),
});

const emptyToNull = (v: unknown) => {
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : v;
  }
  return v as number | null;
};

/**
 * A user-supplied maps link is safe only when it is an http(s) URL on a
 * known map host (Google or Apple). Anything else — javascript:, data:,
 * custom schemes, non-map hosts — is rejected so it can never reach an
 * href or an embed.
 */
function isSupportedMapsLink(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return (
    /(^|\.)google\.[a-z.]+$/.test(host) ||
    /(^|\.)maps\.google\.[a-z.]+$/.test(host) ||
    host === "goo.gl" ||
    host === "maps.app.goo.gl" ||
    host === "maps.apple.com" ||
    host === "openstreetmap.org" ||
    host === "www.openstreetmap.org"
  );
}

/** Hosts whose links are short/redirecting and need server-side resolution. */
export function isShortMapsHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "goo.gl" || host === "maps.app.goo.gl";
}

export const locationSettingsSchema = z.object({
  title: z.string().trim().max(80, "Title must be 80 characters or fewer.").default(""),
  address: z.string().trim().max(500, "Address must be 500 characters or fewer.").default(""),
  latitude: z.preprocess(
    emptyToNull,
    z.number().min(-90, "Latitude must be between -90 and 90.").max(90).nullable().default(null),
  ),
  longitude: z.preprocess(
    emptyToNull,
    z
      .number()
      .min(-180, "Longitude must be between -180 and 180.")
      .max(180)
      .nullable()
      .default(null),
  ),
  /**
   * Optional vendor maps link (Phase 34.2 navigation fallback). Host
   * allowlist only — Google/Apple http(s). Anything else fails validation.
   * Null/missing coerce to null (persisted rows carry explicit nulls).
   */
  mapsUrl: z.preprocess(
    (v) => (typeof v === "string" ? v : ""),
    z
      .string()
      .trim()
      .max(2048, "Maps link must be 2048 characters or fewer.")
      .refine((v) => v === "" || isSupportedMapsLink(v), {
        message: "Enter a valid Google Maps or Apple Maps link.",
      })
      .transform((v) => (v === "" ? null : v)),
  ),
  /** OSM embed zoom (Phase 34.2 map card). Blank clears to the default. */
  mapZoom: z.preprocess(emptyToNull, z.number().int().min(1).max(19).nullable().default(15)),
  showMap: z.boolean().default(true),
  buttonLabel: z
    .string()
    .trim()
    .max(40, "Button label must be 40 characters or fewer.")
    .default("Get Directions"),
});

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM format.")
  .nullable();

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const openingHoursSettingsSchema = z.object({
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(60, "Timezone must be 60 characters or fewer.")
    .refine(isValidTimeZone, { message: "Enter a valid IANA timezone (e.g. Africa/Casablanca)." })
    .default("UTC"),
  days: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        closed: z.boolean().default(false),
        open: timeString.default(null),
        close: timeString.default(null),
      }),
    )
    .length(7, "Provide all 7 days.")
    .default([
      { day: 0, closed: false, open: null, close: null },
      { day: 1, closed: false, open: null, close: null },
      { day: 2, closed: false, open: null, close: null },
      { day: 3, closed: false, open: null, close: null },
      { day: 4, closed: false, open: null, close: null },
      { day: 5, closed: false, open: null, close: null },
      { day: 6, closed: false, open: null, close: null },
    ]),
});

export type HeroSettings = z.infer<typeof heroSettingsSchema>;
export type ActionsSettings = z.infer<typeof actionsSettingsSchema>;
export type LinksSettings = z.infer<typeof linksSettingsSchema>;
export type LocationSettings = z.infer<typeof locationSettingsSchema>;
export type OpeningHoursSettings = z.infer<typeof openingHoursSettingsSchema>;

/* ------------------------------------------------------------------ */
/* Shared collection engine (Phase 29: menu + catalog)                 */
/* ------------------------------------------------------------------ */

const MAX_CATEGORIES = 20;
const MAX_ITEMS_PER_CATEGORY = 50;

export const collectionItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  image: z.string().trim().max(500, "Image reference is too long.").default(""),
  name: z.string().trim().min(1, "Item name is required.").max(80),
  description: z
    .string()
    .trim()
    .max(300, "Description must be 300 characters or fewer.")
    .default(""),
  price: z.preprocess(
    emptyToNull,
    z.number().min(0, "Price cannot be negative.").max(999999).nullable().default(null),
  ),
  available: z.boolean().default(true),
});

export const collectionCategorySchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1, "Category name is required.").max(60),
  items: z.array(collectionItemSchema).max(MAX_ITEMS_PER_CATEGORY).default([]),
});

function collectionSettingsSchema(titleDefault: string) {
  return z.object({
    title: z.string().trim().max(80, "Title must be 80 characters or fewer.").default(titleDefault),
    currency: z.string().trim().max(10, "Currency must be 10 characters or fewer.").default("MAD"),
    categories: z.array(collectionCategorySchema).max(MAX_CATEGORIES).default([]),
  });
}

export const menuSettingsSchema = collectionSettingsSchema("Our Menu").extend({
  layout: z.enum(["cards", "list"]).default("cards"),
});
export const catalogSettingsSchema = collectionSettingsSchema("Products");

export type CollectionItem = z.infer<typeof collectionItemSchema>;
export type CollectionCategory = z.infer<typeof collectionCategorySchema>;
export type MenuSettings = z.infer<typeof menuSettingsSchema>;
export type CatalogSettings = z.infer<typeof catalogSettingsSchema>;

/* ------------------------------------------------------------------ */
/* Personal sections (Phase 31: about, experience, cv)                 */
/* ------------------------------------------------------------------ */

export const aboutSettingsSchema = z.object({
  title: z.string().trim().max(80, "Title must be 80 characters or fewer.").default("About"),
  content: z.string().trim().max(2000, "Content must be 2000 characters or fewer.").default(""),
});

const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM format.");

export const experienceJobSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    company: z.string().trim().min(1, "Company is required.").max(80),
    role: z.string().trim().min(1, "Role is required.").max(80),
    startDate: monthString,
    endDate: monthString.nullable().default(null),
    description: z
      .string()
      .trim()
      .max(500, "Description must be 500 characters or fewer.")
      .default(""),
  })
  .refine((job) => !job.endDate || job.endDate >= job.startDate, {
    message: "End date must not precede start date.",
    path: ["endDate"],
  });

export const experienceSettingsSchema = z.object({
  title: z.string().trim().max(80, "Title must be 80 characters or fewer.").default("Experience"),
  jobs: z.array(experienceJobSchema).max(20).default([]),
});

export const cvSettingsSchema = z.object({
  title: z
    .string()
    .trim()
    .max(80, "Title must be 80 characters or fewer.")
    .default("Curriculum Vitae"),
  label: z.string().trim().max(40, "Label must be 40 characters or fewer.").default("Download CV"),
  file: z.string().trim().max(500).default(""),
});

export type AboutSettings = z.infer<typeof aboutSettingsSchema>;
export type ExperienceJob = z.infer<typeof experienceJobSchema>;
export type ExperienceSettings = z.infer<typeof experienceSettingsSchema>;
export type CvSettings = z.infer<typeof cvSettingsSchema>;

/* ------------------------------------------------------------------ */
/* Gallery (Phase 32)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Storage-path shape for gallery images (mirrors isManagedSectionImagePath
 * in storage.ts, kept local so this module stays client-bundle safe).
 * The delete gate remains authoritative; this only rejects obvious junk
 * at the settings boundary.
 */
const SECTION_IMAGE_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sections\/[a-z_]{1,32}\/[0-9a-f]{16}\.(jpg|png|webp)$/;

export const galleryImageSchema = z.object({
  id: z.string().trim().min(1).max(64),
  image: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || SECTION_IMAGE_PATH_PATTERN.test(v), {
      message: "Invalid image reference.",
    })
    .default(""),
  alt: z.string().trim().max(120, "Alt text must be 120 characters or fewer.").default(""),
});

export const gallerySettingsSchema = z.object({
  title: z.string().trim().max(80, "Title must be 80 characters or fewer.").default("Gallery"),
  layout: z.enum(["grid", "masonry"]).default("grid"),
  images: z.array(galleryImageSchema).max(24).default([]),
});

export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type GallerySettings = z.infer<typeof gallerySettingsSchema>;

/** Display price (`40 MAD`) or null when the item has no price. */
export function formatPrice(price: number | null, currency: string): string | null {
  if (price === null) return null;
  const amount = Number.isInteger(price) ? String(price) : price.toFixed(2);
  const suffix = typeof currency === "string" ? currency.trim() : "";
  return suffix === "" ? amount : `${amount} ${suffix}`;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** `2024-01` → `Jan 2024`; malformed input passes through untouched. */
export function formatMonth(yearMonth: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(yearMonth);
  if (!match) return yearMonth;
  return `${MONTH_LABELS[Number(match[2]) - 1]} ${match[1]}`;
}

const LIVE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  hero: heroSettingsSchema,
  actions: actionsSettingsSchema,
  links: linksSettingsSchema,
  location: locationSettingsSchema,
  opening_hours: openingHoursSettingsSchema,
  menu: menuSettingsSchema,
  catalog: catalogSettingsSchema,
  about: aboutSettingsSchema,
  experience: experienceSettingsSchema,
  cv: cvSettingsSchema,
  gallery: gallerySettingsSchema,
};

/**
 * Keys stripped from the PUBLIC projection per type. The CV file reference
 * is the owned private-bucket path: the public renderer links the
 * slug-based download endpoint instead, so the raw path never leaves the
 * server ("no direct storage exposure", ADR-057).
 */
const PUBLIC_OMIT_SETTINGS: Record<string, string[]> = {
  cv: ["file"],
};

/** Defaults for a type (live schemas; everything else → `{}`). */
export function defaultSectionSettings(type: string): Record<string, unknown> {
  const schema = LIVE_SCHEMAS[type];
  if (!schema) return {};
  return schema.parse({}) as Record<string, unknown>;
}

/**
 * Sanitize stored settings for the PUBLIC projection. Never fails: invalid
 * or foreign shapes fall back to the type defaults, unknown types to `{}`.
 */
export function sanitizePublicSettings(type: string, raw: unknown): Record<string, unknown> {
  const schema = LIVE_SCHEMAS[type];
  if (!schema) return {};
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) return defaultSectionSettings(type);
  const settings = { ...(parsed.data as Record<string, unknown>) };
  for (const key of PUBLIC_OMIT_SETTINGS[type] ?? []) delete settings[key];
  // CV presence flag: the renderer needs to know a file exists, but the
  // private-bucket path itself (which embeds the client UUID) never leaves
  // the server — the download endpoint re-resolves it from the slug.
  if (type === "cv") {
    const file = (raw as { file?: unknown } | null)?.file;
    settings.hasFile = typeof file === "string" && file.trim() !== "";
  }
  return settings;
}

export type SanitizeResult = { ok: true; settings: Json } | { ok: false; message: string };

/**
 * Validate admin-submitted settings for persistence. Planned/unknown types
 * accept only an empty object (they have no declared settings yet);
 * live types must satisfy their schema (unknown keys stripped, bad values
 * rejected).
 */
export function sanitizeAdminSettings(type: string, raw: unknown): SanitizeResult {
  const schema = LIVE_SCHEMAS[type];
  if (!schema) {
    if (
      raw !== null &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      Object.keys(raw).length === 0
    ) {
      return { ok: true, settings: {} };
    }
    return {
      ok: false,
      message: "This section has no configurable settings yet.",
    };
  }
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some settings values are invalid. Check the highlighted fields.",
    };
  }
  return { ok: true, settings: { ...(parsed.data as Record<string, unknown>) } as Json };
}

/* ------------------------------------------------------------------ */
/* Location helpers (pure, no keys, no iframes)                        */
/* ------------------------------------------------------------------ */

/** Preferred navigation query: coordinates when set, else the address. */
export function locationQuery(settings: {
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}): string | null {
  const lat = typeof settings.latitude === "number" ? settings.latitude : null;
  const lng = typeof settings.longitude === "number" ? settings.longitude : null;
  if (lat !== null && lng !== null) return `${lat},${lng}`;
  const address = typeof settings.address === "string" ? settings.address.trim() : "";
  return address === "" ? null : address;
}

/** Vendor navigation URLs for one encoded query (Google + Apple Maps). */
export function navigationUrls(query: string): { google: string; apple: string } {
  const q = encodeURIComponent(query);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    apple: `https://maps.apple.com/?q=${q}`,
  };
}

/**
 * Normalized Google Directions URL for saved coordinates:
 * `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`.
 * Built ONLY from validated numbers — returns null for out-of-range
 * input. Keeps the directions button working even if the original short
 * link expires or changes.
 */
export function googleDirectionsUrl(latitude: number, longitude: number): string | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

/**
 * Validate a user-supplied vendor maps link. Returns the trimmed URL when
 * it is an http(s) link on a supported map host, else null. Never throws.
 */
export function sanitizeMapsLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > 2048) return null;
  return isSupportedMapsLink(trimmed) ? trimmed : null;
}

export type LocationTarget = {
  /** Best navigation query (coords > maps link > address) or null. */
  query: string | null;
  /** Direct vendor link when the operator supplied one (navigation-first). */
  directLink: string | null;
  /** Coordinates for the embedded map, or null when unavailable. */
  coords: { latitude: number; longitude: number } | null;
};

/**
 * Resolve the best location target. Priority: valid coordinates, then a
 * supported vendor maps link, then the address. Never throws; never
 * returns an arbitrary user URL (directLink is allowlisted or null).
 */
export function resolveLocationTarget(settings: {
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  mapsUrl?: unknown;
}): LocationTarget {
  const lat = typeof settings.latitude === "number" ? settings.latitude : null;
  const lng = typeof settings.longitude === "number" ? settings.longitude : null;
  const coords = lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null;
  const directLink = sanitizeMapsLink(settings.mapsUrl);
  const query = locationQuery(settings);
  return { query: coords ? `${lat},${lng}` : (directLink ?? query), directLink, coords };
}

/**
 * Half-height of the OSM embed bounding box in degrees for a zoom level.
 * Zoom 15 ≈ street level; each level halves the span.
 */
export function osmBboxDelta(zoom: number): number {
  const z = Number.isFinite(zoom) ? Math.min(19, Math.max(1, Math.floor(zoom))) : 15;
  return 0.01 * Math.pow(2, 15 - z);
}

/**
 * Keyless OpenStreetMap embed URL, constructed ONLY from sanitized numbers.
 * Returns null for out-of-range coordinates. The caller renders it in an
 * `<iframe loading="lazy">`; user URLs/HTML never reach an embed src.
 */
export function osmEmbedUrl(latitude: number, longitude: number, zoom: number): string | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  const z = Number.isFinite(zoom) ? Math.min(19, Math.max(1, Math.floor(zoom))) : 15;
  const delta = osmBboxDelta(z);
  const fmt = (n: number): string => n.toFixed(5);
  const bbox = `${fmt(longitude - delta)},${fmt(latitude - delta)},${fmt(longitude + delta)},${fmt(latitude + delta)}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

/* ------------------------------------------------------------------ */
/* Opening-hours helpers (pure)                                        */
/* ------------------------------------------------------------------ */

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type DayHours = { day: number; closed: boolean; open: string | null; close: string | null };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Open-now status for a schedule at `now` (default: current time), resolved
 * in the schedule's timezone. Returns null when it cannot be determined
 * (bad timezone, today's hours unset) — callers render no badge then.
 */
export function openNowStatus(
  settings: { timezone?: unknown; days?: unknown },
  now: Date = new Date(),
): "open" | "closed" | null {
  try {
    const timezone = typeof settings.timezone === "string" ? settings.timezone : "";
    const days = Array.isArray(settings.days) ? (settings.days as DayHours[]) : [];
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    if (weekdayIndex < 0) return null;
    const entry = days.find((d) => d.day === weekdayIndex);
    if (!entry || entry.closed) return entry ? "closed" : null;
    if (!entry.open || !entry.close) return null;
    const current = toMinutes(`${get("hour")}:${get("minute")}`);
    const opens = toMinutes(entry.open);
    const closes = toMinutes(entry.close);
    if (closes <= opens) return current >= opens || current < closes ? "open" : "closed";
    return current >= opens && current < closes ? "open" : "closed";
  } catch {
    return null;
  }
}
