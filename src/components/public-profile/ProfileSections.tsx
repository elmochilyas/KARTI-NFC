import Image from "next/image";
import type { ComponentType, ReactNode } from "react";
import { LuChevronRight, LuDownload } from "react-icons/lu";
import {
  detectBrand,
  resolvePrimaryActions,
  QuickTileIcon,
  RowBrandIcon,
  type BrandKey,
  type QuickAction,
} from "./brandIcons";
import { mailHref, telHref } from "./ProfilePreview";
import {
  DEFAULT_PUBLIC_SECTIONS,
  type PublicLink,
  type PublicProfile,
  type PublicSection,
} from "@/features/profiles/public";
import { getCatalogEntry, type SectionCatalogEntry } from "@/features/profiles/sectionCatalog";
import type {
  AboutSettings,
  ActionsSettings,
  CatalogSettings,
  CollectionCategory,
  CvSettings,
  ExperienceSettings,
  GallerySettings,
  HeroSettings,
  LinksSettings,
  LocationSettings,
  MenuSettings,
  OpeningHoursSettings,
} from "@/features/profiles/sectionSettings";
import {
  formatMonth,
  formatPrice,
  googleDirectionsUrl,
  navigationUrls,
  openNowStatus,
  osmEmbedUrl,
  resolveLocationTarget,
  WEEKDAY_LABELS,
} from "@/features/profiles/sectionSettings";
import { publicAssetPathUrl } from "@/features/profiles/storagePaths";

/**
 * Phase 25 section foundation. The three foundation section components below
 * are verbatim extractions of the blocks PublicProfileView used to render
 * inline (no visual changes — same markup, classes, copy, animation delays).
 * `ProfileSectionRenderer` orders them from data instead of hardcoding the
 * order. Keep/Share/attribution stay fixed in PublicProfileView (outside the
 * renderer) by product decision.
 */

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function prettyWebsite(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || url;
  } catch {
    return url;
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Hero section                                                        */
/* ------------------------------------------------------------------ */

function Hero({
  profile,
  avatarUrl,
  coverUrl,
  isBusiness,
  dark,
  showTagline,
  showCategory,
}: {
  profile: PublicProfile;
  avatarUrl: string | null;
  coverUrl: string | null;
  isBusiness: boolean;
  dark: boolean;
  showTagline: boolean;
  showCategory: boolean;
}) {
  const categoryParts = [profile.job_title?.trim(), profile.company_name?.trim()].filter(
    (part): part is string => !!part && part !== profile.display_name.trim(),
  );
  const category = categoryParts.join(" • ").toUpperCase() || null;
  const tagline = profile.bio?.trim() || null;
  // Premium avatar treatment: crisp white ring (reads on any cover color)
  // + soft accent halo + deep soft shadow. Same in both themes so the
  // avatar anchors the cover/sheet seam instead of melting into it.
  const avatarHalo = {
    boxShadow:
      "0 18px 44px rgba(2,12,27,0.35), 0 0 0 6px color-mix(in srgb, var(--karti-accent) 16%, transparent)",
  } as const;
  const nameClass = dark ? "text-neutral-50" : "text-[#0F172A]";
  const taglineClass = dark ? "text-neutral-300" : "text-[#475569]";

  return (
    <>
      <section
        aria-label="Profile cover"
        className={`relative h-52 w-full overflow-hidden border-b sm:h-60 ${
          dark
            ? "border-white/10 shadow-[0_16px_28px_-20px_rgba(0,0,0,0.9)]"
            : "border-[#E2E8F0] shadow-[0_1px_0_rgba(15,35,60,0.04),0_16px_28px_-20px_rgba(15,35,60,0.35)]"
        }`}
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            aria-hidden="true"
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 480px) 100vw, 480px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(130% 80% at 50% -10%, color-mix(in srgb, var(--karti-accent) 45%, transparent) 0%, transparent 55%), linear-gradient(165deg, #0b1c33 0%, #060d18 70%)",
            }}
          />
        )}
      </section>
      <section
        aria-label="Profile identity"
        className="relative flex flex-col items-center px-6 pt-0 pb-3 text-center"
      >
        {isBusiness ? (
          avatarUrl ? (
            <span
              className="-mt-14 flex h-28 w-28 items-center justify-center rounded-[28px] bg-white p-1.5 ring-4 ring-white"
              style={avatarHalo}
            >
              <Image
                src={avatarUrl}
                alt={`${profile.display_name} logo`}
                width={224}
                height={224}
                sizes="112px"
                // LCP discipline: exactly one preloaded image per view. Cover
                // owns priority when present; otherwise the avatar is the LCP
                // and takes it. Never two `priority` images on one tap.
                priority={!coverUrl}
                fetchPriority={coverUrl ? "auto" : "high"}
                loading={coverUrl ? "eager" : undefined}
                className="h-full w-full rounded-[22px] object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="-mt-14 flex h-28 w-28 items-center justify-center rounded-[28px] text-4xl font-extrabold text-white ring-4 ring-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--karti-accent), color-mix(in srgb, var(--karti-accent) 55%, black))",
                boxShadow:
                  "0 18px 44px rgba(2,12,27,0.35), 0 0 0 6px color-mix(in srgb, var(--karti-accent) 16%, transparent)",
              }}
            >
              {initialsOf(profile.display_name)}
            </span>
          )
        ) : avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${profile.display_name} profile photo`}
            width={224}
            height={224}
            sizes="112px"
            priority={!coverUrl}
            fetchPriority={coverUrl ? "auto" : "high"}
            loading={coverUrl ? "eager" : undefined}
            className="-mt-14 h-28 w-28 rounded-full object-cover ring-4 ring-white"
            style={avatarHalo}
          />
        ) : (
          <span
            aria-hidden="true"
            className="-mt-14 flex h-28 w-28 items-center justify-center rounded-full text-5xl font-extrabold text-white ring-4 ring-white"
            style={{
              background:
                "linear-gradient(135deg, var(--karti-accent), color-mix(in srgb, var(--karti-accent) 55%, black))",
              boxShadow:
                "0 18px 44px rgba(2,12,27,0.35), 0 0 0 6px color-mix(in srgb, var(--karti-accent) 16%, transparent)",
            }}
          >
            {initialsOf(profile.display_name)}
          </span>
        )}
        <h1
          className={`mt-4 max-w-full text-[30px] leading-[1.05] font-extrabold tracking-tight break-words text-balance ${nameClass}`}
        >
          {profile.display_name}
        </h1>
        {category && showCategory ? (
          <p
            className="mt-2.5 inline-flex max-w-full items-center justify-center rounded-full px-3.5 py-1.5 text-center text-[10px] font-bold tracking-[0.14em] break-words uppercase"
            style={{
              backgroundColor: "color-mix(in srgb, var(--karti-accent) 12%, transparent)",
              color: "var(--karti-accent)",
            }}
          >
            {category}
          </p>
        ) : null}
        {tagline && showTagline ? (
          <p
            className={`mt-2.5 max-w-[26rem] text-[14px] leading-relaxed break-words ${taglineClass}`}
            title={tagline}
          >
            {tagline}
          </p>
        ) : null}
      </section>
    </>
  );
}

export function HeroSection({
  profile,
  avatarUrl,
  coverUrl,
  settings,
}: {
  profile: PublicProfile;
  avatarUrl: string | null;
  coverUrl: string | null;
  settings?: HeroSettings;
}) {
  const dark = profile.theme === "dark";
  const isBusiness = profile.profile_type === "BUSINESS";
  const showTagline = settings?.showTagline !== false;
  const showCategory = settings?.showCategory !== false;
  return (
    <Hero
      profile={profile}
      avatarUrl={avatarUrl}
      coverUrl={coverUrl}
      isBusiness={isBusiness}
      dark={dark}
      showTagline={showTagline}
      showCategory={showCategory}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Quick action tiles                                                  */
/* ------------------------------------------------------------------ */

function tileSublabel(action: QuickAction): string | null {
  switch (action.brand) {
    case "call":
      return "Tap to call";
    case "email":
      return "Send mail";
    case "whatsapp":
      return "Chat now";
    case "instagram":
      return "View profile";
    case "website":
      return "Visit website";
    default:
      return "Tap to open";
  }
}

/**
 * Human call-to-action subtitles for the Connect rows. Social brands get
 * a friendly CTA ("Connect with me") instead of a technical hostname;
 * generic links fall back to "Tap to open".
 */
function connectSublabel(brand: BrandKey, url: string): string {
  switch (brand) {
    case "linkedin":
      return "Connect with me";
    case "instagram":
      return "View profile";
    case "whatsapp":
      return "Chat now";
    case "facebook":
      return "Follow me";
    case "tiktok":
      return "Watch videos";
    case "youtube":
      return "Watch channel";
    case "x":
      return "Follow me";
    case "telegram":
      return "Message me";
    case "snapchat":
      return "Add me";
    case "google":
      return "Leave a review";
    case "maps":
      return "Get directions";
    case "booking":
      return "Book now";
    case "call":
      return "Tap to call";
    case "email":
      return "Send mail";
    case "website":
      return "Visit website";
    default:
      try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        return host ? `Open ${host}` : "Tap to open";
      } catch {
        return "Tap to open";
      }
  }
}

function QuickTiles({ actions, dark }: { actions: QuickAction[]; dark: boolean }) {
  if (actions.length === 0) return null;
  const tileClass = dark
    ? "border-white/15 bg-[#0e2238]/95 text-white shadow-[0_12px_32px_rgba(7,20,35,0.5)] backdrop-blur hover:bg-[#14304f] hover:shadow-[0_16px_40px_rgba(7,20,35,0.6)]"
    : "border-[#E7EDF4] bg-white text-text shadow-[0_12px_32px_rgba(15,35,60,0.14)] hover:bg-[#F8FAFD] hover:shadow-[0_16px_40px_rgba(15,35,60,0.2)]";
  const subClass = dark ? "text-white/65" : "text-muted";
  return (
    <nav
      aria-label="Quick actions"
      className="karti-rise grid w-full gap-2"
      style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
    >
      {actions.map((action) => {
        const sub = tileSublabel(action);
        const accessibleName = sub ? `${action.label} — ${sub}` : action.label;
        const body = (
          <>
            <QuickTileIcon brand={action.brand} dark={dark} />
            <span className="flex w-full min-w-0 flex-col items-center">
              <span className="block w-full text-center text-[13px] leading-tight font-bold break-words">
                {action.label}
              </span>
              {sub ? (
                <span
                  className={`mt-0.5 block w-full text-center text-[11px] leading-snug font-medium break-words ${subClass}`}
                >
                  {sub}
                </span>
              ) : null}
            </span>
          </>
        );
        const classes = `flex min-h-[110px] w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-[20px] border px-2 py-3 text-center transition duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current active:scale-[0.96] ${tileClass}`;
        return action.external ? (
          <a
            key={action.id}
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes}
            aria-label={accessibleName}
            title={accessibleName}
          >
            {body}
          </a>
        ) : (
          <a
            key={action.id}
            href={action.href}
            className={classes}
            aria-label={accessibleName}
            title={accessibleName}
          >
            {body}
          </a>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Actions section (quick tiles + information + about)                 */
/* ------------------------------------------------------------------ */

function QuickButtons({ actions, dark }: { actions: QuickAction[]; dark: boolean }) {
  if (actions.length === 0) return null;
  const rowClass = dark
    ? "border-white/10 bg-neutral-900 text-neutral-50"
    : "border-[#E7EDF4] bg-white text-text";
  return (
    <nav aria-label="Quick actions" className="karti-rise flex w-full flex-col gap-2">
      {actions.map((action) => {
        const sub = tileSublabel(action);
        const accessibleName = sub ? `${action.label} — ${sub}` : action.label;
        return (
          <a
            key={action.id}
            href={action.href}
            {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            aria-label={accessibleName}
            title={accessibleName}
            className={`flex min-h-[56px] items-center gap-3 rounded-[18px] border px-3.5 py-2 transition hover:-translate-y-px active:scale-[0.99] ${rowClass}`}
          >
            <QuickTileIcon brand={action.brand} dark={dark} />
            <span className="min-w-0 flex-1 truncate text-left text-[15px] font-bold">
              {action.label}
            </span>
            <LuChevronRight
              size={18}
              aria-hidden="true"
              className={`shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
            />
          </a>
        );
      })}
    </nav>
  );
}

export function ActionsSection({
  profile,
  quickActions,
  dark,
  isBusiness,
  cardClass,
  mutedClass,
  dividerClass,
  settings,
}: {
  profile: PublicProfile;
  quickActions: QuickAction[];
  dark: boolean;
  isBusiness: boolean;
  cardClass: string;
  mutedClass: string;
  dividerClass: string;
  settings?: ActionsSettings;
}) {
  const showQuickTiles = settings?.showQuickTiles !== false;
  const showAbout = settings?.showAbout !== false;
  const display = settings?.display === "buttons" ? "buttons" : "tiles";
  const phone = profile.phone?.trim() || null;
  const email = profile.email?.trim() || null;
  const phoneHref = phone ? telHref(phone) : null;
  const emailHref = email ? mailHref(email) : null;
  const website = profile.website?.trim() || null;
  const websiteHref = website && isHttpUrl(website) ? website : null;
  const address = profile.address?.trim() || null;
  const mapsHref =
    profile.maps_url?.trim() && isHttpUrl(profile.maps_url.trim()) ? profile.maps_url.trim() : null;
  const hasInfo = phone !== null || email !== null || websiteHref !== null || address !== null;

  const bio = profile.bio?.trim() || null;
  const aboutTitle = isBusiness
    ? `About ${profile.display_name}`
    : `About ${profile.display_name.trim().split(/\s+/)[0]}`;

  return (
    <>
      {showQuickTiles ? (
        display === "buttons" ? (
          <QuickButtons actions={quickActions} dark={dark} />
        ) : (
          <QuickTiles actions={quickActions} dark={dark} />
        )
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        {hasInfo ? (
          <section
            aria-label={isBusiness ? "Business information" : "Contact information"}
            className={`karti-rise rounded-[20px] border px-4 py-3 ${cardClass}`}
            style={{ animationDelay: "120ms" }}
          >
            <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
              {isBusiness ? "Business Information" : "Contact Information"}
            </h2>
            <div className={`mt-1 divide-y ${dividerClass}`}>
              {phone && phoneHref ? (
                <a
                  href={phoneHref}
                  aria-label={`Call ${phone}`}
                  className="flex min-h-[60px] items-center gap-3.5 rounded-xl py-2 transition hover:opacity-80 active:scale-[0.99]"
                >
                  <RowBrandIcon brand="call" dark={dark} />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{phone}</span>
                  <LuChevronRight
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
                  />
                </a>
              ) : null}
              {email && emailHref ? (
                <a
                  href={emailHref}
                  aria-label={`Email ${email}`}
                  className="flex min-h-[60px] items-center gap-3.5 rounded-xl py-2 transition hover:opacity-80 active:scale-[0.99]"
                >
                  <RowBrandIcon brand="email" dark={dark} />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold" title={email}>
                    {email}
                  </span>
                  <LuChevronRight
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
                  />
                </a>
              ) : null}
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open website ${prettyWebsite(websiteHref)}`}
                  className="flex min-h-[60px] items-center gap-3.5 rounded-xl py-2 transition hover:opacity-80 active:scale-[0.99]"
                >
                  <RowBrandIcon brand="website" dark={dark} />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                    {prettyWebsite(websiteHref)}
                  </span>
                  <LuChevronRight
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
                  />
                </a>
              ) : null}
              {address ? (
                <div className="flex min-h-[60px] items-center gap-3.5 py-2">
                  <RowBrandIcon brand="maps" dark={dark} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug font-bold break-words">{address}</p>
                    {mapsHref ? (
                      <p className="mt-1.5">
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 rounded-full px-3.5 text-[13px] font-bold"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--karti-accent) 12%, transparent)",
                            color: "var(--karti-accent)",
                          }}
                        >
                          Get Directions
                          <LuChevronRight size={15} aria-hidden="true" />
                        </a>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {bio && showAbout ? (
          <section
            aria-label={aboutTitle}
            className={`karti-rise rounded-[20px] border p-4 ${cardClass}`}
            style={{ animationDelay: "160ms" }}
          >
            <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
              {aboutTitle}
            </h2>
            <p
              className={`mt-2 border-l-[3px] pl-3 text-[15px] leading-[1.65] break-words ${
                dark ? "text-neutral-200" : "text-[#334155]"
              }`}
              style={{ borderColor: "var(--karti-accent)" }}
            >
              {bio}
            </p>
          </section>
        ) : null}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Links section (connect rows)                                        */
/* ------------------------------------------------------------------ */

export function LinksSection({
  links,
  consumedIds,
  dark,
  mutedClass,
  cardClass,
  settings,
}: {
  links: (PublicLink & { enabled?: boolean })[];
  consumedIds: Set<string>;
  dark: boolean;
  mutedClass: string;
  cardClass: string;
  settings?: LinksSettings;
}) {
  const showSubtitles = settings?.showSubtitles !== false;
  // Phase 34.1: skip disabled rows when the caller carries the flag (draft
  // preview). The public loader pre-filters, so `enabled` is absent there
  // and everything renders — one rule, no drift.
  const moreLinks = links.filter(
    (link) =>
      link.enabled !== false &&
      !consumedIds.has(link.id) &&
      link.label.trim() !== "" &&
      link.url.trim() !== "" &&
      isHttpUrl(link.url),
  );
  if (moreLinks.length === 0) return null;
  // No outer top margin: the renderer wraps every non-first section in an
  // mt-4 block, and the sheet's pt-5 covers the first. (Previously this
  // spacing came from the parent flex gap-4 — same 1rem.)
  return (
    <section aria-label="Connect" className="karti-rise" style={{ animationDelay: "200ms" }}>
      <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
        Connect
      </h2>
      <nav aria-label="More links" className="mt-2.5 flex flex-col gap-2">
        {moreLinks.map((link) => {
          const brand = detectBrand(link);
          const cta = connectSublabel(brand, link.url);
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.label} — ${cta}`}
              title={`${link.label} — ${cta}`}
              className={`flex min-h-[60px] items-center gap-3 rounded-[18px] border px-3.5 py-2 transition hover:-translate-y-px active:scale-[0.99] ${cardClass}`}
            >
              <RowBrandIcon brand={brand} dark={dark} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[15px] font-bold">{link.label}</span>
                {showSubtitles ? (
                  <span className={`block truncate text-xs font-medium ${mutedClass}`}>{cta}</span>
                ) : null}
              </span>
              <LuChevronRight
                size={18}
                aria-hidden="true"
                className={`shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
              />
            </a>
          );
        })}
      </nav>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Location section (no iframe, no API keys — vendor links only)      */
/* ------------------------------------------------------------------ */

/**
 * Admin-preview-only empty guidance (Phase 34.2). Public rendering keeps
 * collapsing empty sections; the dashboard preview shows these hints so a
 * freshly added block is actionable before it has content.
 */
export function SectionPlaceholder({
  title,
  hint,
  mutedClass,
  cardClass,
}: {
  title: string;
  hint: string;
  mutedClass: string;
  cardClass: string;
}) {
  return (
    <section
      aria-label={title}
      className={`karti-rise rounded-[20px] border border-dashed p-4 ${cardClass}`}
      style={{ animationDelay: "200ms" }}
    >
      <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
        {title}
      </h2>
      <p className="mt-2 flex items-center gap-2 px-1 text-sm font-medium break-words">
        <LuChevronRight size={15} aria-hidden="true" className={`shrink-0 ${mutedClass}`} />
        {hint}
      </p>
    </section>
  );
}

export function LocationSection({
  settings,
  dark,
  mutedClass,
  cardClass,
  previewPlaceholders,
}: {
  settings?: LocationSettings;
  dark: boolean;
  mutedClass: string;
  cardClass: string;
  previewPlaceholders?: boolean;
}) {
  const title = typeof settings?.title === "string" ? settings.title.trim() : "";
  const address = typeof settings?.address === "string" ? settings.address.trim() : "";
  const showMap = settings?.showMap !== false;
  const buttonLabel =
    typeof settings?.buttonLabel === "string" && settings.buttonLabel.trim() !== ""
      ? settings.buttonLabel.trim()
      : "Get Directions";
  const heading = title === "" ? "Location" : title;
  // Best target: coordinates, then a supported vendor maps link, then the
  // address. Nothing usable → collapse publicly, guide in admin preview.
  const target = resolveLocationTarget({
    address,
    latitude: settings?.latitude ?? null,
    longitude: settings?.longitude ?? null,
    mapsUrl: settings?.mapsUrl ?? null,
    pinSource: settings?.pinSource ?? null,
  });
  if (!target.query) {
    return previewPlaceholders ? (
      <SectionPlaceholder
        title={heading}
        hint="Add an address to preview"
        mutedClass={mutedClass}
        cardClass={cardClass}
      />
    ) : null;
  }
  const query = target.query;
  // Keyless OSM embed needs coordinates; address-only renders the card +
  // vendor directions without an iframe.
  const zoom = typeof settings?.mapZoom === "number" ? settings.mapZoom : 15;
  const embedUrl =
    showMap && target.coords
      ? osmEmbedUrl(target.coords.latitude, target.coords.longitude, zoom)
      : null;
  const urls = navigationUrls(query);
  // Saved trusted coordinates are the normalized location source of
  // truth: whenever they exist, directions use them — regardless of pin
  // provenance — so the button never depends on the original (possibly
  // expiring) short link. The stored vendor link is kept for reference
  // and editing, and remains the fallback only when no coordinates exist.
  const coordsHref =
    target.coords !== null
      ? (googleDirectionsUrl(target.coords.latitude, target.coords.longitude) ?? urls.google)
      : urls.google;
  const googleHref =
    target.coords === null && typeof target.directLink === "string"
      ? target.directLink
      : coordsHref;
  const useDirectLink = target.coords === null && target.directLink !== null;

  return (
    <section
      aria-label={heading}
      className={`karti-rise rounded-[20px] border p-4 ${cardClass}`}
      style={{ animationDelay: "200ms" }}
    >
      <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
        {heading}
      </h2>
      {embedUrl ? (
        <div className="mt-2.5">
          <div className="overflow-hidden rounded-2xl border border-black/5">
            <iframe
              src={embedUrl}
              title={`Map of ${address === "" ? query : address}`}
              loading="lazy"
              className="h-44 w-full border-0"
            />
          </div>
          <p className={`mt-1 px-1 text-right text-[11px] ${mutedClass}`}>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              © OpenStreetMap contributors
            </a>
          </p>
        </div>
      ) : showMap ? (
        <div className="mt-2 flex items-center gap-3.5 py-2">
          <RowBrandIcon brand="maps" dark={dark} />
          <p className="min-w-0 flex-1 text-[15px] leading-snug font-bold break-words">
            {address === "" ? query : address}
          </p>
        </div>
      ) : address !== "" ? (
        <p className="mt-2 px-1 text-[15px] leading-snug font-bold break-words">{address}</p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 px-1 pb-1">
        <a
          href={googleHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={useDirectLink ? buttonLabel : `${buttonLabel} (Google Maps)`}
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-3.5 text-[13px] font-bold"
          style={{
            backgroundColor: "color-mix(in srgb, var(--karti-accent) 12%, transparent)",
            color: "var(--karti-accent)",
          }}
        >
          {buttonLabel}
          <LuChevronRight size={15} aria-hidden="true" />
        </a>
        {!target.isManualPin && target.directLink ? null : (
          <a
            href={urls.apple}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in Apple Maps"
            className={`text-[13px] font-semibold underline underline-offset-4 ${mutedClass}`}
          >
            Apple Maps
          </a>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Opening hours section                                               */
/* ------------------------------------------------------------------ */

function todayIndex(timezone: string, now: Date = new Date()): number {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(now);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  } catch {
    return -1;
  }
}

export function OpeningHoursSection({
  settings,
  mutedClass,
  cardClass,
  previewPlaceholders,
}: {
  settings?: OpeningHoursSettings;
  mutedClass: string;
  cardClass: string;
  previewPlaceholders?: boolean;
}) {
  const timezone = typeof settings?.timezone === "string" ? settings.timezone : "";
  const days = Array.isArray(settings?.days) ? settings.days : [];
  if (days.length === 0) {
    return previewPlaceholders ? (
      <SectionPlaceholder
        title="Opening Hours"
        hint="Add your business hours"
        mutedClass={mutedClass}
        cardClass={cardClass}
      />
    ) : null;
  }
  const status = openNowStatus({ timezone, days });
  const today = todayIndex(timezone);

  return (
    <section
      aria-label="Opening hours"
      className={`karti-rise rounded-[20px] border px-4 py-3 ${cardClass}`}
      style={{ animationDelay: "200ms" }}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className={`text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
          Opening Hours
        </h2>
        {status === "open" ? (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--karti-accent) 12%, transparent)",
              color: "var(--karti-accent)",
            }}
          >
            Open now
          </span>
        ) : status === "closed" ? (
          <span
            className={`rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-bold ${mutedClass}`}
          >
            Closed
          </span>
        ) : null}
      </div>
      <ul className="mt-1">
        {days.map((d) => {
          const label = WEEKDAY_LABELS[d.day] ?? `Day ${d.day}`;
          const hours = d.closed ? "Closed" : d.open && d.close ? `${d.open} – ${d.close}` : "Open";
          const isToday = d.day === today;
          return (
            <li
              key={d.day}
              aria-current={isToday ? "date" : undefined}
              className="flex min-h-9 items-center justify-between gap-3 py-1"
            >
              <span className={`text-sm ${isToday ? "font-extrabold" : "font-medium"}`}>
                {label}
              </span>
              <span className={`text-sm ${isToday ? "font-bold" : mutedClass}`}>{hours}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Shared collection view (Phase 29: menu + catalog)                  */
/* ------------------------------------------------------------------ */

function CollectionView({
  title,
  fallbackLabel,
  currency,
  categories,
  variant,
  mutedClass,
  cardClass,
  previewPlaceholders,
  emptyHint,
}: {
  title: string;
  fallbackLabel: string;
  currency: string;
  categories: CollectionCategory[];
  /** cards: photo tiles; list: compact rows without photos. */
  variant: "cards" | "list";
  mutedClass: string;
  cardClass: string;
  previewPlaceholders?: boolean;
  emptyHint: string;
}) {
  // Unavailable and nameless items never render; emptied categories drop
  // out; a collection with nothing visible collapses entirely.
  const visible = categories
    .map((category) => ({
      name: category.name,
      items: category.items.filter((item) => item.available && item.name.trim() !== ""),
    }))
    .filter((category) => category.items.length > 0);
  const heading = title === "" ? fallbackLabel : title;
  if (visible.length === 0) {
    return previewPlaceholders ? (
      <SectionPlaceholder
        title={heading}
        hint={emptyHint}
        mutedClass={mutedClass}
        cardClass={cardClass}
      />
    ) : null;
  }

  return (
    <section
      aria-label={heading}
      className={`karti-rise rounded-[20px] border p-4 ${cardClass}`}
      style={{ animationDelay: "200ms" }}
    >
      <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
        {heading}
      </h2>
      <div className="mt-2 flex flex-col gap-4">
        {visible.map((category) => (
          <div key={category.name}>
            <h3 className="px-1 text-[15px] font-extrabold">{category.name}</h3>
            <ul className="mt-1.5 flex flex-col gap-2">
              {category.items.map((item) => {
                const imageUrl =
                  variant === "list" || item.image.trim() === ""
                    ? null
                    : publicAssetPathUrl(item.image);
                const price = formatPrice(item.price, currency);
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-[18px] border border-transparent px-1 py-1.5"
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold">
                        {item.name}
                        {price ? (
                          <span className={`font-semibold ${mutedClass}`}> · {price}</span>
                        ) : null}
                      </p>
                      {item.description.trim() !== "" ? (
                        <p
                          className={`mt-0.5 line-clamp-2 text-[13px] leading-snug break-words ${mutedClass}`}
                        >
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MenuSection({
  settings,
  mutedClass,
  cardClass,
  previewPlaceholders,
}: {
  settings?: MenuSettings;
  mutedClass: string;
  cardClass: string;
  previewPlaceholders?: boolean;
}) {
  const title = typeof settings?.title === "string" ? settings.title.trim() : "";
  const currency = typeof settings?.currency === "string" ? settings.currency : "MAD";
  const categories = Array.isArray(settings?.categories) ? settings.categories : [];
  const variant = settings?.layout === "list" ? "list" : "cards";
  return (
    <CollectionView
      title={title}
      fallbackLabel="Menu"
      currency={currency}
      categories={categories}
      variant={variant}
      mutedClass={mutedClass}
      cardClass={cardClass}
      previewPlaceholders={previewPlaceholders}
      emptyHint="Add your first menu item"
    />
  );
}

export function CatalogSection({
  settings,
  mutedClass,
  cardClass,
  previewPlaceholders,
}: {
  settings?: CatalogSettings;
  mutedClass: string;
  cardClass: string;
  previewPlaceholders?: boolean;
}) {
  const title = typeof settings?.title === "string" ? settings.title.trim() : "";
  const currency = typeof settings?.currency === "string" ? settings.currency : "MAD";
  const categories = Array.isArray(settings?.categories) ? settings.categories : [];
  return (
    <CollectionView
      title={title}
      fallbackLabel="Catalog"
      currency={currency}
      categories={categories}
      variant="cards"
      mutedClass={mutedClass}
      cardClass={cardClass}
      previewPlaceholders={previewPlaceholders}
      emptyHint="Add your first product"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Personal sections (Phase 31: about, experience, cv)                */
/* ------------------------------------------------------------------ */

export function AboutSection({
  settings,
  mutedClass,
  cardClass,
  previewPlaceholders,
}: {
  settings?: AboutSettings;
  mutedClass: string;
  cardClass: string;
  previewPlaceholders?: boolean;
}) {
  const title =
    typeof settings?.title === "string" && settings.title.trim() !== ""
      ? settings.title.trim()
      : "About";
  const content = typeof settings?.content === "string" ? settings.content.trim() : "";
  // Content-driven collapse: no biography, no section.
  if (content === "") {
    return previewPlaceholders ? (
      <SectionPlaceholder
        title={title}
        hint="Write your introduction"
        mutedClass={mutedClass}
        cardClass={cardClass}
      />
    ) : null;
  }
  return (
    <section
      aria-label={title}
      className={`karti-rise rounded-[20px] border p-4 ${cardClass}`}
      style={{ animationDelay: "200ms" }}
    >
      <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
        {title}
      </h2>
      <p className="mt-2 px-1 text-[15px] leading-[1.65] break-words whitespace-pre-line">
        {content}
      </p>
    </section>
  );
}

export function ExperienceSection({
  settings,
  dark,
  mutedClass,
  cardClass,
  previewPlaceholders,
}: {
  settings?: ExperienceSettings;
  dark: boolean;
  mutedClass: string;
  cardClass: string;
  previewPlaceholders?: boolean;
}) {
  const title =
    typeof settings?.title === "string" && settings.title.trim() !== ""
      ? settings.title.trim()
      : "Experience";
  const jobs = Array.isArray(settings?.jobs)
    ? settings.jobs.filter(
        (j) => j.company.trim() !== "" && j.role.trim() !== "" && j.startDate.trim() !== "",
      )
    : [];
  if (jobs.length === 0) {
    return previewPlaceholders ? (
      <SectionPlaceholder
        title={title}
        hint="Add your first experience"
        mutedClass={mutedClass}
        cardClass={cardClass}
      />
    ) : null;
  }
  return (
    <section
      aria-label={title}
      className={`karti-rise rounded-[20px] border px-4 py-3 ${cardClass}`}
      style={{ animationDelay: "200ms" }}
    >
      <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
        {title}
      </h2>
      <ul className={`mt-1 divide-y ${dark ? "divide-white/10" : "divide-[#EEF2F7]"}`}>
        {jobs.map((job) => (
          <li key={job.id} className="flex flex-col gap-0.5 py-2.5">
            <p className="text-[15px] font-bold break-words">{job.role}</p>
            <p className={`text-sm font-medium ${mutedClass}`}>
              {job.company} · {formatMonth(job.startDate)} –{" "}
              {job.endDate ? formatMonth(job.endDate) : "Present"}
            </p>
            {job.description.trim() !== "" ? (
              <p
                className={`mt-1 text-sm leading-relaxed break-words ${dark ? "text-neutral-200" : "text-[#334155]"}`}
              >
                {job.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CvSection({
  settings,
  slug,
  mutedClass,
  cardClass,
  previewPlaceholders,
}: {
  settings?: CvSettings & { hasFile?: unknown };
  slug: string;
  mutedClass: string;
  cardClass: string;
  previewPlaceholders?: boolean;
}) {
  const title =
    typeof settings?.title === "string" && settings.title.trim() !== ""
      ? settings.title.trim()
      : "Curriculum Vitae";
  const label =
    typeof settings?.label === "string" && settings.label.trim() !== ""
      ? settings.label.trim()
      : "Download CV";
  // Presence flag only: the raw file path never reaches the client.
  // Downloads go through the slug-based endpoint, which re-resolves the
  // ACTIVE profile server-side. No file, no section (content collapse).
  if (settings?.hasFile !== true) {
    return previewPlaceholders ? (
      <SectionPlaceholder
        title={title}
        hint="Upload your CV"
        mutedClass={mutedClass}
        cardClass={cardClass}
      />
    ) : null;
  }
  return (
    <section
      aria-label={title}
      className={`karti-rise rounded-[20px] border p-4 ${cardClass}`}
      style={{ animationDelay: "200ms" }}
    >
      <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
        {title}
      </h2>
      <div className="mt-2.5">
        <a
          href={`/api/cv/${slug}`}
          aria-label={`${label} (PDF)`}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-bold"
          style={{
            backgroundColor: "color-mix(in srgb, var(--karti-accent) 12%, transparent)",
            color: "var(--karti-accent)",
          }}
        >
          <LuDownload size={18} aria-hidden="true" />
          {label}
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery section (Phase 32)                                        */
/* ------------------------------------------------------------------ */

export function GallerySection({
  settings,
  mutedClass,
  cardClass,
  previewPlaceholders,
}: {
  settings?: GallerySettings;
  mutedClass: string;
  cardClass: string;
  previewPlaceholders?: boolean;
}) {
  const title =
    typeof settings?.title === "string" && settings.title.trim() !== ""
      ? settings.title.trim()
      : "Gallery";
  const masonry = settings?.layout === "masonry";
  // Sanitized images only: blank references never render; an empty gallery
  // collapses the whole section.
  const photos = Array.isArray(settings?.images)
    ? settings.images.filter((g) => g.image.trim() !== "")
    : [];
  if (photos.length === 0) {
    return previewPlaceholders ? (
      <SectionPlaceholder
        title={title}
        hint="Add your first photo"
        mutedClass={mutedClass}
        cardClass={cardClass}
      />
    ) : null;
  }

  return (
    <section
      aria-label={title}
      className={`karti-rise rounded-[20px] border p-4 ${cardClass}`}
      style={{ animationDelay: "200ms" }}
    >
      <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
        {title}
      </h2>
      {masonry ? (
        <div className="mt-2.5 columns-2 gap-2 [&>figure]:mb-2">
          {photos.map((photo) => {
            const url = publicAssetPathUrl(photo.image);
            if (!url) return null;
            return (
              <figure key={photo.id} className="break-inside-avoid overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={photo.alt} loading="lazy" className="w-full object-cover" />
              </figure>
            );
          })}
        </div>
      ) : (
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo) => {
            const url = publicAssetPathUrl(photo.image);
            if (!url) return null;
            return (
              <figure key={photo.id} className="aspect-square overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={photo.alt}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </figure>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Registry component half                                           */
/* ------------------------------------------------------------------ */
/**
 * Uniform props every section component receives. The foundation components
 * below keep their heterogeneous signatures; thin adapters map them onto
 * this shape so the renderer can resolve any catalog type uniformly.
 */
export type SectionRenderProps = {
  profile: PublicProfile;
  links: PublicLink[];
  avatarUrl: string | null;
  coverUrl: string | null;
  quickActions: QuickAction[];
  consumedIds: Set<string>;
  dark: boolean;
  isBusiness: boolean;
  cardClass: string;
  mutedClass: string;
  dividerClass: string;
  settings: Record<string, unknown>;
  /**
   * Admin-preview empty guidance (Phase 34.2). When true, content sections
   * with nothing to show render a helpful placeholder instead of
   * collapsing. Public pages never set this — empty sections collapse.
   */
  previewPlaceholders?: boolean;
};

export type SectionComponent = ComponentType<SectionRenderProps>;

export type ResolvedSectionDefinition = {
  definition: SectionCatalogEntry;
  /** Null until the section ships its implementation (planned types). */
  component: SectionComponent | null;
};

function HeroSectionAdapter(props: SectionRenderProps) {
  return (
    <HeroSection
      profile={props.profile}
      avatarUrl={props.avatarUrl}
      coverUrl={props.coverUrl}
      settings={props.settings as HeroSettings}
    />
  );
}

function ActionsSectionAdapter(props: SectionRenderProps) {
  return (
    <ActionsSection
      profile={props.profile}
      quickActions={props.quickActions}
      dark={props.dark}
      isBusiness={props.isBusiness}
      cardClass={props.cardClass}
      mutedClass={props.mutedClass}
      dividerClass={props.dividerClass}
      settings={props.settings as ActionsSettings}
    />
  );
}

function LinksSectionAdapter(props: SectionRenderProps) {
  return (
    <LinksSection
      links={props.links}
      consumedIds={props.consumedIds}
      dark={props.dark}
      mutedClass={props.mutedClass}
      cardClass={props.cardClass}
      settings={props.settings as LinksSettings}
    />
  );
}

function LocationSectionAdapter(props: SectionRenderProps) {
  return (
    <LocationSection
      settings={props.settings as LocationSettings}
      dark={props.dark}
      mutedClass={props.mutedClass}
      cardClass={props.cardClass}
      previewPlaceholders={props.previewPlaceholders}
    />
  );
}

function OpeningHoursSectionAdapter(props: SectionRenderProps) {
  return (
    <OpeningHoursSection
      settings={props.settings as OpeningHoursSettings}
      mutedClass={props.mutedClass}
      cardClass={props.cardClass}
      previewPlaceholders={props.previewPlaceholders}
    />
  );
}

function MenuSectionAdapter(props: SectionRenderProps) {
  return (
    <MenuSection
      settings={props.settings as MenuSettings}
      mutedClass={props.mutedClass}
      cardClass={props.cardClass}
      previewPlaceholders={props.previewPlaceholders}
    />
  );
}

function CatalogSectionAdapter(props: SectionRenderProps) {
  return (
    <CatalogSection
      settings={props.settings as CatalogSettings}
      mutedClass={props.mutedClass}
      cardClass={props.cardClass}
      previewPlaceholders={props.previewPlaceholders}
    />
  );
}

function AboutSectionAdapter(props: SectionRenderProps) {
  return (
    <AboutSection
      settings={props.settings as AboutSettings}
      mutedClass={props.mutedClass}
      cardClass={props.cardClass}
      previewPlaceholders={props.previewPlaceholders}
    />
  );
}

function ExperienceSectionAdapter(props: SectionRenderProps) {
  return (
    <ExperienceSection
      settings={props.settings as ExperienceSettings}
      dark={props.dark}
      mutedClass={props.mutedClass}
      cardClass={props.cardClass}
      previewPlaceholders={props.previewPlaceholders}
    />
  );
}

function CvSectionAdapter(props: SectionRenderProps) {
  return (
    <CvSection
      settings={props.settings as CvSettings}
      slug={props.profile.slug}
      mutedClass={props.mutedClass}
      cardClass={props.cardClass}
      previewPlaceholders={props.previewPlaceholders}
    />
  );
}

function GallerySectionAdapter(props: SectionRenderProps) {
  return (
    <GallerySection
      settings={props.settings as GallerySettings}
      mutedClass={props.mutedClass}
      cardClass={props.cardClass}
      previewPlaceholders={props.previewPlaceholders}
    />
  );
}

const LIVE_COMPONENTS: Record<string, SectionComponent> = {
  hero: HeroSectionAdapter,
  actions: ActionsSectionAdapter,
  links: LinksSectionAdapter,
  location: LocationSectionAdapter,
  opening_hours: OpeningHoursSectionAdapter,
  menu: MenuSectionAdapter,
  catalog: CatalogSectionAdapter,
  about: AboutSectionAdapter,
  experience: ExperienceSectionAdapter,
  cv: CvSectionAdapter,
  gallery: GallerySectionAdapter,
};

/**
 * Pair a catalog entry with its renderer. Unknown types and planned types
 * (no implementation yet) resolve to a null component — the renderer skips
 * them without crashing. New sections ship by flipping the catalog status
 * and adding one map entry here.
 */
export function resolveSection(type: string): ResolvedSectionDefinition | null {
  const definition = getCatalogEntry(type);
  if (!definition) return null;
  if (definition.status !== "live") return { definition, component: null };
  const component = LIVE_COMPONENTS[definition.type] ?? null;
  return component ? { definition, component } : null;
}

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

/**
 * Data-driven section order via the section registry. Unknown or planned
 * types resolve to no component and render nothing (forward-compatible).
 * Disabled sections are dropped defensively — the public loader already
 * filters them, this is the second gate. Empty/missing input falls back to
 * the canonical foundation order so pre-backfill profiles render exactly
 * as before.
 *
 * Layout contract (matches the pre-foundation DOM spacing exactly):
 * hero sections render full-bleed at the top level; every other section
 * renders inside one sheet div. The first sheet section has no top margin
 * (sheet pt-5 provides it); later sections are wrapped in mt-4 — the same
 * 1rem the old parent flex gap-4 produced. `children` (Keep/Share/
 * attribution, owned by PublicProfileView) render last inside the sheet.
 */
export function ProfileSectionRenderer({
  profile,
  links,
  avatarUrl,
  coverUrl,
  sections,
  previewPlaceholders,
  children,
}: {
  profile: PublicProfile;
  links: PublicLink[];
  avatarUrl: string | null;
  coverUrl: string | null;
  sections?: PublicSection[];
  /**
   * Admin-preview empty guidance (Phase 34.2). When true, content sections
   * with nothing to show render a helpful placeholder instead of
   * collapsing. Public pages omit this — empty sections collapse.
   */
  previewPlaceholders?: boolean;
  children?: ReactNode;
}) {
  const dark = profile.theme === "dark";
  const isBusiness = profile.profile_type === "BUSINESS";

  // Phase 34.1: the actions section's `maxQuickActions` (1–4, default 3)
  // and explicit `primaryActions` order drive the quick tiles through ONE
  // shared resolver (public page and admin preview cannot drift). Read from
  // the data order (not the filtered render order) so a disabled actions
  // section still yields the default instead of crashing the lookup.
  const actionsSettings =
    sections && sections.length > 0
      ? (sections.find((s) => s.type === "actions")?.settings as
          { maxQuickActions?: unknown; primaryActions?: unknown } | undefined)
      : undefined;
  const { actions: quickActions, consumedIds } = resolvePrimaryActions({
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    email: profile.email,
    website: profile.website,
    links,
    limit:
      typeof actionsSettings?.maxQuickActions === "number"
        ? actionsSettings.maxQuickActions
        : undefined,
    primaryActions: actionsSettings?.primaryActions,
  });

  const cardClass = dark
    ? "border-white/10 bg-neutral-900 text-neutral-50 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.6)]"
    : "border-[#E7EDF4] bg-white text-text shadow-[0_8px_24px_rgba(15,35,60,0.08)]";
  const mutedClass = dark ? "text-neutral-400" : "text-muted";
  const dividerClass = dark ? "divide-white/10" : "divide-[#EEF2F7]";

  const ordered =
    sections && sections.length > 0
      ? [...sections].filter((s) => s.enabled !== false).sort((a, b) => a.position - b.position)
      : [...DEFAULT_PUBLIC_SECTIONS];

  const heroes = ordered.filter((s) => s.type === "hero");
  const rest = ordered.filter((s) => s.type !== "hero");

  const renderProps: Omit<SectionRenderProps, "settings"> = {
    profile,
    links,
    avatarUrl,
    coverUrl,
    quickActions,
    consumedIds,
    dark,
    isBusiness,
    cardClass,
    mutedClass,
    dividerClass,
    previewPlaceholders: previewPlaceholders ?? false,
  };

  // Drop unresolvable types before layout so they leave no empty wrappers.
  const rendered: { section: PublicSection; node: ReactNode }[] = [];
  for (const section of rest) {
    const resolved = resolveSection(section.type);
    if (!resolved || !resolved.component) continue;
    const Component = resolved.component;
    rendered.push({
      section,
      node: <Component key={section.id} {...renderProps} settings={section.settings} />,
    });
  }

  return (
    <>
      {heroes.map((section) => (
        <HeroSection
          key={section.id}
          profile={profile}
          avatarUrl={avatarUrl}
          coverUrl={coverUrl}
          settings={section.settings as HeroSettings}
        />
      ))}
      <div className={`relative px-4 pt-5 pb-8 ${dark ? "bg-neutral-950" : "bg-[#F4F8FC]"}`}>
        {rendered.map(({ section, node }, i) =>
          i === 0 ? (
            <div key={section.id}>{node}</div>
          ) : (
            <div key={section.id} className="mt-4">
              {node}
            </div>
          ),
        )}
        {children}
      </div>
    </>
  );
}
