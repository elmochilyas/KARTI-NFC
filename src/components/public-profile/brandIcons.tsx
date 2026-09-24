import { FaLinkedinIn } from "react-icons/fa";
import {
  SiFacebook,
  SiGoogle,
  SiGooglemaps,
  SiInstagram,
  SiSnapchat,
  SiTelegram,
  SiTiktok,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { LuCalendarCheck, LuGlobe, LuLink2, LuMail, LuPhone } from "react-icons/lu";
import { mailHref, telHref, whatsappHref } from "./ProfilePreview";

/**
 * Brand detection + real brand marks for the public profile.
 * Social brands keep their official colors; system actions (call, email,
 * website, maps, booking, generic links) use one Lucide outline set.
 * Pure logic + server-safe SVG — zero client JS.
 */

export type BrandKey =
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "x"
  | "telegram"
  | "snapchat"
  | "google"
  | "maps"
  | "call"
  | "email"
  | "website"
  | "booking"
  | "link";

export type LinkLike = { type: string; label: string; url: string };

const HOST_BRANDS: [RegExp, BrandKey][] = [
  [/instagram\.com/i, "instagram"],
  [/wa\.me|whatsapp\.com/i, "whatsapp"],
  [/facebook\.com|fb\.com/i, "facebook"],
  [/linkedin\.com/i, "linkedin"],
  [/tiktok\.com/i, "tiktok"],
  [/youtube\.com|youtu\.be/i, "youtube"],
  [/(^|\.)x\.com|twitter\.com/i, "x"],
  [/t\.me|telegram\.me/i, "telegram"],
  [/snapchat\.com/i, "snapchat"],
  [/maps\.google|google\.[^/]*\/maps/i, "maps"],
];

const LABEL_BRANDS: [RegExp, BrandKey][] = [
  [/insta/i, "instagram"],
  [/whatsapp/i, "whatsapp"],
  [/facebook|\bfb\b/i, "facebook"],
  [/linkedin/i, "linkedin"],
  [/tiktok/i, "tiktok"],
  [/youtube/i, "youtube"],
  [/twitter|\bx\b/i, "x"],
  [/telegram/i, "telegram"],
  [/snap/i, "snapchat"],
  [/maps|directions/i, "maps"],
  [/google.*review|reviews/i, "google"],
  [/book/i, "booking"],
  [/site|web/i, "website"],
];

const TYPE_BRANDS: Record<string, BrandKey> = {
  instagram: "instagram",
  facebook: "facebook",
  linkedin: "linkedin",
  tiktok: "tiktok",
  youtube: "youtube",
  x: "x",
  snapchat: "snapchat",
  maps: "maps",
  google_review: "google",
  website: "website",
  booking: "booking",
};

/** Best-effort brand for a profile link (type → URL host → label → generic). */
export function detectBrand(link: LinkLike): BrandKey {
  const fromType = TYPE_BRANDS[link.type.trim().toLowerCase()];
  if (fromType) return fromType;
  try {
    const host = new URL(link.url).hostname;
    for (const [pattern, brand] of HOST_BRANDS) {
      if (pattern.test(host) || pattern.test(link.url)) return brand;
    }
  } catch {
    /* unparsable URL — fall through to label matching */
  }
  const haystack = `${link.label} ${link.url}`;
  for (const [pattern, brand] of LABEL_BRANDS) {
    if (pattern.test(haystack)) return brand;
  }
  return "link";
}

export type QuickAction = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  brand: BrandKey;
};

export type QuickActionInput = {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  links: (LinkLike & { id: string; enabled?: boolean })[];
  /**
   * Max quick actions to return (Phase 34: `maxQuickActions` actions-section
   * setting, Contact-step stepper). Clamped to 1–4; defaults to 3 so every
   * existing caller renders exactly as before.
   */
  limit?: number;
};

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Hard cap for the top-action area (Phase 34.1: segmented 1–4 control). */
export const MAX_PRIMARY_ACTIONS = 4;

export function clampPrimaryLimit(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_PRIMARY_ACTIONS, Math.max(1, Math.floor(value)))
    : 3;
}

/* ------------------------------------------------------------------ */
/* Explicit primary actions (Phase 34.1)                               */
/* ------------------------------------------------------------------ */

/**
 * Stable typed refs stored in `actions.primaryActions` (settings JSONB, no
 * new table). Built-ins address profile columns; links address enabled
 * profile-link rows. Anything else is shape-invalid and ignored.
 */
export const BUILTIN_ACTION_IDS = ["call", "whatsapp", "email", "website"] as const;

export type BuiltinActionId = (typeof BUILTIN_ACTION_IDS)[number];

export type PrimaryRef = { kind: "builtin"; id: BuiltinActionId } | { kind: "link"; id: string };

/** Parse one stored ref; null = shape-invalid (strip/ignore). */
export function parsePrimaryRef(ref: unknown): PrimaryRef | null {
  if (typeof ref !== "string") return null;
  const value = ref.trim();
  if (value === "call" || value === "whatsapp" || value === "email" || value === "website") {
    return { kind: "builtin", id: value };
  }
  const match = /^link:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
    value,
  );
  if (match?.[1]) return { kind: "link", id: match[1].toLowerCase() };
  return null;
}

/**
 * Shape-valid stored refs, deduped, order preserved. Draft-temp link refs
 * (`link:draft-…`, for links added but not yet saved) are optionally kept
 * verbatim — the unified save remaps them to real ids; the renderer keeps
 * ignoring them until then.
 */
export function readPrimaryRefs(raw: unknown, allowTempIds = false): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    const parsed = parsePrimaryRef(trimmed);
    if (parsed) {
      const canonical = parsed.kind === "builtin" ? parsed.id : `link:${parsed.id}`;
      if (seen.has(canonical)) continue;
      seen.add(canonical);
      out.push(canonical);
      continue;
    }
    if (allowTempIds && /^link:draft-.+/.test(trimmed) && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

export type PrimaryAvailability = {
  call: boolean;
  whatsapp: boolean;
  email: boolean;
  website: boolean;
  /** Lowercased ids of enabled, renderable links. */
  linkIds: Set<string>;
};

/**
 * Which refs can currently resolve. A built-in is available only while its
 * column holds a valid value; a link only while it is enabled and has a
 * renderable label + http(s) URL. Stale refs (value removed, link disabled
 * or deleted) resolve to nothing — rendering fails safe immediately.
 */
export function primaryAvailability(input: {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  links: (LinkLike & { id: string; enabled?: boolean })[];
}): PrimaryAvailability {
  const website = input.website?.trim() ?? "";
  return {
    call: input.phone?.trim() ? telHref(input.phone) !== null : false,
    whatsapp: input.whatsapp?.trim() ? whatsappHref(input.whatsapp) !== null : false,
    email: input.email?.trim() ? mailHref(input.email) !== null : false,
    website: website !== "" && isHttpUrl(website),
    linkIds: new Set(
      input.links
        .filter(
          (link) =>
            link.enabled !== false &&
            link.label.trim() !== "" &&
            link.url.trim() !== "" &&
            isHttpUrl(link.url),
        )
        .map((link) => link.id.toLowerCase()),
    ),
  };
}

export function isPrimaryRefAvailable(ref: PrimaryRef, availability: PrimaryAvailability): boolean {
  if (ref.kind === "builtin") return availability[ref.id];
  return availability.linkIds.has(ref.id);
}

/**
 * Clean stored refs against live data (save-time hygiene, Phase 34.1).
 * Shape-valid refs that can no longer resolve (deleted/disabled links,
 * removed contact values) are dropped; the renderer already ignores them,
 * so this only keeps the stored JSON honest for the next load.
 */
export function sanitizePrimaryRefs(
  raw: unknown,
  input: {
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    links: (LinkLike & { id: string; enabled?: boolean })[];
  },
): string[] {
  const refs = readPrimaryRefs(raw);
  if (refs.length === 0) return [];
  const availability = primaryAvailability(input);
  return refs.filter((ref) => {
    const parsed = parsePrimaryRef(ref);
    return parsed !== null && isPrimaryRefAvailable(parsed, availability);
  });
}

/**
 * Canonical candidate pool in legacy order: Instagram link first, then
 * WhatsApp, Call, Email, Website, then remaining links in order. Shared by
 * the legacy picker and the explicit resolver so the default order is
 * defined exactly once.
 */
function buildActionPool(input: QuickActionInput): {
  pool: QuickAction[];
  visibleLinks: (LinkLike & { id: string; enabled?: boolean })[];
} {
  const candidates: QuickAction[] = [];
  const consumedIds = new Set<string>();

  const visibleLinks = input.links.filter(
    (link) => link.label.trim() !== "" && link.url.trim() !== "" && isHttpUrl(link.url),
  );
  const instagramLink = visibleLinks.find((link) => detectBrand(link) === "instagram");
  if (instagramLink) {
    candidates.push({
      id: instagramLink.id,
      label: instagramLink.label,
      href: instagramLink.url,
      external: true,
      brand: "instagram",
    });
    consumedIds.add(instagramLink.id);
  }
  const whatsappHrefValue = input.whatsapp?.trim() ? whatsappHref(input.whatsapp) : null;
  if (whatsappHrefValue) {
    candidates.push({
      id: "field:whatsapp",
      label: "WhatsApp",
      href: whatsappHrefValue,
      external: false,
      brand: "whatsapp",
    });
  }
  const telHrefValue = input.phone?.trim() ? telHref(input.phone) : null;
  if (telHrefValue) {
    candidates.push({
      id: "field:phone",
      label: "Call",
      href: telHrefValue,
      external: false,
      brand: "call",
    });
  }
  const mailHrefValue = input.email?.trim() ? mailHref(input.email) : null;
  if (mailHrefValue) {
    candidates.push({
      id: "field:email",
      label: "Email",
      href: mailHrefValue,
      external: false,
      brand: "email",
    });
  }
  const website = input.website?.trim() ?? "";
  if (website !== "" && isHttpUrl(website)) {
    candidates.push({
      id: "field:website",
      label: "Website",
      href: website,
      external: true,
      brand: "website",
    });
  }
  for (const link of visibleLinks) {
    if (consumedIds.has(link.id)) continue;
    candidates.push({
      id: link.id,
      label: link.label,
      href: link.url,
      external: true,
      brand: detectBrand(link),
    });
    consumedIds.add(link.id);
  }
  return { pool: candidates, visibleLinks };
}

function consumedLinkIds(actions: QuickAction[]): Set<string> {
  const ids = new Set<string>();
  for (const action of actions) {
    if (!action.id.startsWith("field:")) ids.add(action.id);
  }
  return ids;
}

/**
 * Legacy picker (default order + cap). Behavior preserved exactly: Instagram
 * link first, then WhatsApp, Call, Email, Website, then remaining links in
 * order, capped at `limit`. Profiles without `primaryActions` customization
 * render byte-identically to before Phase 34.1.
 */
export function pickQuickActions(input: QuickActionInput): {
  actions: QuickAction[];
  consumedIds: Set<string>;
} {
  const limit = clampPrimaryLimit(input.limit);
  const { pool } = buildActionPool(input);
  const actions = pool.slice(0, limit);
  return { actions, consumedIds: consumedLinkIds(actions) };
}

/**
 * Single primary-action resolution for the public renderer AND the admin
 * preview (one implementation, no drift). Explicit `primaryActions` refs
 * win in stored order (stale/missing refs skipped fail-safe); empty or
 * absent refs fall back to the legacy default order. The result is always
 * capped at `limit`.
 */
export function resolvePrimaryActions(input: QuickActionInput & { primaryActions?: unknown }): {
  actions: QuickAction[];
  consumedIds: Set<string>;
} {
  const limit = clampPrimaryLimit(input.limit);
  const refs = readPrimaryRefs(input.primaryActions);
  if (refs.length === 0) return pickQuickActions(input);

  const { pool } = buildActionPool(input);
  const availability = primaryAvailability(input);
  const byKey = new Map<string, QuickAction>();
  for (const action of pool) {
    if (action.id.startsWith("field:")) {
      const key = action.id === "field:phone" ? "call" : action.id.slice("field:".length);
      if (!byKey.has(key)) byKey.set(key, action);
    } else {
      const key = `link:${action.id.toLowerCase()}`;
      if (!byKey.has(key)) byKey.set(key, action);
    }
  }
  const actions: QuickAction[] = [];
  for (const ref of refs) {
    if (actions.length >= limit) break;
    const parsed = parsePrimaryRef(ref);
    if (!parsed || !isPrimaryRefAvailable(parsed, availability)) continue;
    const key = parsed.kind === "builtin" ? parsed.id : `link:${parsed.id}`;
    const action = byKey.get(key);
    if (!action || actions.some((a) => a.id === action.id)) continue;
    actions.push(action);
  }
  return { actions, consumedIds: consumedLinkIds(actions) };
}

/* ------------------------------------------------------------------ */
/* Brand marks                                                         */
/* ------------------------------------------------------------------ */

const INSTAGRAM_GRADIENT = "linear-gradient(45deg, #f9ce34, #ee2a7b 55%, #6228d7)";

function Glyph({ brand, size, color }: { brand: BrandKey; size: number; color?: string }) {
  const props = { size, color, "aria-hidden": true as const };
  switch (brand) {
    case "instagram":
      return <SiInstagram {...props} />;
    case "whatsapp":
      return <SiWhatsapp {...props} />;
    case "facebook":
      return <SiFacebook {...props} />;
    case "linkedin":
      // NOTE: simple-icons dropped the LinkedIn glyph; Font Awesome's mark
      // is the visually equivalent "in" tile glyph.
      return <FaLinkedinIn {...props} />;
    case "tiktok":
      return <SiTiktok {...props} />;
    case "youtube":
      return <SiYoutube {...props} />;
    case "x":
      return <SiX {...props} />;
    case "telegram":
      return <SiTelegram {...props} />;
    case "snapchat":
      return <SiSnapchat {...props} />;
    case "google":
      return <SiGoogle {...props} />;
    case "maps":
      return <SiGooglemaps {...props} />;
    case "call":
      return <LuPhone {...props} />;
    case "email":
      return <LuMail {...props} />;
    case "website":
      return <LuGlobe {...props} />;
    case "booking":
      return <LuCalendarCheck {...props} />;
    default:
      return <LuLink2 {...props} />;
  }
}

const ROW_GLYPH_COLOR: Partial<Record<BrandKey, string>> = {
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
  telegram: "#229ED9",
  google: "#4285F4",
  maps: "#EA4335",
};

/**
 * App-style brand mark for quick-action tiles (48px, centered).
 * Instagram = official gradient tile, WhatsApp = official green circle,
 * Snapchat = yellow tile, Call/system = accent-tinted circle with phone
 * glyph, other social brands keep their official glyph colors.
 * `dark` adapts monochrome marks (X/TikTok) to the tile surface.
 */
export function QuickTileIcon({ brand, dark = true }: { brand: BrandKey; dark?: boolean }) {
  if (brand === "instagram") {
    return (
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-[16px] text-white shadow-md"
        style={{ background: INSTAGRAM_GRADIENT }}
      >
        <Glyph brand={brand} size={25} />
      </span>
    );
  }
  if (brand === "whatsapp") {
    return (
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md"
      >
        <Glyph brand={brand} size={24} />
      </span>
    );
  }
  if (brand === "snapchat") {
    return (
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FFFC00] text-black shadow-md"
      >
        <Glyph brand={brand} size={25} />
      </span>
    );
  }
  if (brand === "x" || brand === "tiktok") {
    const fg = dark ? "#ffffff" : "#111418";
    return (
      <span
        aria-hidden="true"
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          dark ? "bg-white/10" : "bg-black/[0.06]"
        }`}
      >
        <Glyph brand={brand} size={22} color={fg} />
      </span>
    );
  }
  const color = ROW_GLYPH_COLOR[brand];
  if (color) {
    return (
      <span
        aria-hidden="true"
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          dark ? "bg-white/10" : "bg-black/[0.05]"
        }`}
      >
        <Glyph brand={brand} size={23} color={color} />
      </span>
    );
  }
  // System brands (call/email/website/booking/generic): accent-tinted
  // circle with the Lucide phone/mail/globe glyph in the accent color.
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 items-center justify-center rounded-full"
      style={{
        backgroundColor: "color-mix(in srgb, var(--karti-accent) 14%, transparent)",
        color: "var(--karti-accent)",
      }}
    >
      <Glyph brand={brand} size={23} />
    </span>
  );
}

/**
 * 44px brand mark for light link/info rows: pale tint circle + brand glyph
 * (Instagram gradient tile, WhatsApp green circle, Snapchat yellow tile).
 */
export function RowBrandIcon({ brand, dark }: { brand: BrandKey; dark: boolean }) {
  if (brand === "instagram") {
    return (
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
        style={{ background: INSTAGRAM_GRADIENT }}
      >
        <Glyph brand={brand} size={23} />
      </span>
    );
  }
  if (brand === "whatsapp") {
    return (
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"
      >
        <Glyph brand={brand} size={22} />
      </span>
    );
  }
  if (brand === "snapchat") {
    return (
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FFFC00] text-black"
      >
        <Glyph brand={brand} size={23} />
      </span>
    );
  }
  if (brand === "x" || brand === "tiktok") {
    const fg = dark ? "#ffffff" : "#111418";
    return (
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          dark ? "bg-white/10" : "bg-black/[0.06]"
        }`}
      >
        <Glyph brand={brand} size={21} color={fg} />
      </span>
    );
  }
  const color = ROW_GLYPH_COLOR[brand];
  if (color) {
    return (
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          dark ? "bg-white/10" : "bg-black/[0.05]"
        }`}
      >
        <Glyph brand={brand} size={22} color={color} />
      </span>
    );
  }
  // System brands (call/email/website/booking/generic): accent-tinted circle.
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      style={{
        backgroundColor: "color-mix(in srgb, var(--karti-accent) 12%, transparent)",
        color: "var(--karti-accent)",
      }}
    >
      <Glyph brand={brand} size={22} />
    </span>
  );
}
