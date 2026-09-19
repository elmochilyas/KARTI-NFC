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
  links: (LinkLike & { id: string })[];
};

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Pick up to 3 primary quick actions: Instagram link first, then WhatsApp,
 * Call, Email, Website, then remaining links in order. Returns the link ids
 * consumed so the "more links" section can exclude them.
 */
export function pickQuickActions(input: QuickActionInput): {
  actions: QuickAction[];
  consumedIds: Set<string>;
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
  if (input.whatsapp?.trim()) {
    candidates.push({
      id: "field:whatsapp",
      label: "WhatsApp",
      href: whatsappHref(input.whatsapp),
      external: false,
      brand: "whatsapp",
    });
  }
  if (input.phone?.trim()) {
    candidates.push({
      id: "field:phone",
      label: "Call",
      href: telHref(input.phone),
      external: false,
      brand: "call",
    });
  }
  if (input.email?.trim()) {
    candidates.push({
      id: "field:email",
      label: "Email",
      href: mailHref(input.email),
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
    if (candidates.length >= 3) break;
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
  return { actions: candidates.slice(0, 3), consumedIds };
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
 * App-style brand mark for quick-action tiles (~44px).
 * Instagram = gradient tile, WhatsApp = green circle, others = brand glyph.
 * `dark` adapts monochrome marks (X/TikTok) to the tile surface.
 */
export function QuickTileIcon({ brand, dark = true }: { brand: BrandKey; dark?: boolean }) {
  if (brand === "instagram") {
    return (
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-[14px] text-white shadow-md"
        style={{ background: INSTAGRAM_GRADIENT }}
      >
        <Glyph brand={brand} size={24} />
      </span>
    );
  }
  if (brand === "whatsapp") {
    return (
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md"
      >
        <Glyph brand={brand} size={23} />
      </span>
    );
  }
  if (brand === "snapchat") {
    return (
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#FFFC00] text-black shadow-md"
      >
        <Glyph brand={brand} size={24} />
      </span>
    );
  }
  const mono = brand === "x" || brand === "tiktok";
  return (
    <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center">
      <Glyph brand={brand} size={29} color={mono ? (dark ? "#ffffff" : "#111418") : undefined} />
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
