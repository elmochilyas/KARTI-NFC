import Image from "next/image";
import type { CSSProperties } from "react";
import { LuChevronRight } from "react-icons/lu";
import {
  detectBrand,
  pickQuickActions,
  QuickTileIcon,
  RowBrandIcon,
  type BrandKey,
  type QuickAction,
} from "./brandIcons";
import { KartiAttribution, mailHref, telHref } from "./ProfilePreview";
import { KeepProfileButton } from "./KeepProfileButton";
import { PwaDiagnostics } from "./PwaDiagnostics";
import { ShareProfileButton } from "./ShareProfileButton";
import type { PublicLink, PublicProfile } from "@/features/profiles/public";

/**
 * Premium hero-first public profile view — server-rendered except the tiny
 * Share + Keep islands (plus the dev-only PWA diagnostics island, inert in
 * production). Section order: hero → quick tiles → information →
 * about → more links → keep this card → share → footer. Content-driven:
 * every section omits itself cleanly when its data is absent. No fake data.
 * Keep Profile installs THIS profile as a home-screen app via its
 * profile-specific manifest; Share Profile stays the final CTA.
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
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero({
  profile,
  avatarUrl,
  coverUrl,
  isBusiness,
  dark,
}: {
  profile: PublicProfile;
  avatarUrl: string | null;
  coverUrl: string | null;
  isBusiness: boolean;
  dark: boolean;
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
        {category ? (
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
        {tagline ? (
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
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function PublicProfileView({
  profile,
  links,
  avatarUrl,
  coverUrl,
}: {
  profile: PublicProfile;
  links: PublicLink[];
  avatarUrl: string | null;
  coverUrl: string | null;
}) {
  const dark = profile.theme === "dark";
  const accent = profile.accent_color;
  const isBusiness = profile.profile_type === "BUSINESS";

  const { actions: quickActions, consumedIds } = pickQuickActions({
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    email: profile.email,
    website: profile.website,
    links,
  });

  const moreLinks = links.filter(
    (link) =>
      !consumedIds.has(link.id) &&
      link.label.trim() !== "" &&
      link.url.trim() !== "" &&
      isHttpUrl(link.url),
  );

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

  const cardClass = dark
    ? "border-white/10 bg-neutral-900 text-neutral-50 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.6)]"
    : "border-[#E7EDF4] bg-white text-text shadow-[0_8px_24px_rgba(15,35,60,0.08)]";
  const mutedClass = dark ? "text-neutral-400" : "text-muted";
  const dividerClass = dark ? "divide-white/10" : "divide-[#EEF2F7]";

  return (
    <main
      className={`relative min-h-dvh ${dark ? "bg-black" : "bg-[#D8E2EC]"}`}
      style={{ "--karti-accent": accent ?? "#0e7c5b" } as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in srgb, var(--karti-accent) 22%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        className={`relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden ring-1 sm:my-6 sm:min-h-[calc(100dvh-3rem)] sm:rounded-[32px] ${
          dark
            ? "bg-neutral-950 shadow-[0_40px_100px_-32px_rgba(0,0,0,0.85)] ring-white/10"
            : "bg-[#F4F8FC] shadow-[0_40px_100px_-32px_rgba(15,35,60,0.4)] ring-black/5"
        }`}
      >
        <Hero
          profile={profile}
          avatarUrl={avatarUrl}
          coverUrl={coverUrl}
          isBusiness={isBusiness}
          dark={dark}
        />

        <div className={`relative px-4 pt-5 pb-8 ${dark ? "bg-neutral-950" : "bg-[#F4F8FC]"}`}>
          <QuickTiles actions={quickActions} dark={dark} />

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

            {bio ? (
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

            {moreLinks.length > 0 ? (
              <section
                aria-label="Connect"
                className="karti-rise"
                style={{ animationDelay: "200ms" }}
              >
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
                          <span className={`block truncate text-xs font-medium ${mutedClass}`}>
                            {cta}
                          </span>
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
            ) : null}

            <section
              aria-label="Keep this digital card"
              className="karti-rise"
              style={{ animationDelay: "220ms" }}
            >
              <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
                Keep this digital card
              </h2>
              <p className={`mt-1 px-1 text-[13px] leading-snug font-medium ${mutedClass}`}>
                Add it to your phone for quick access anytime
              </p>
              <div className="mt-2.5">
                <KeepProfileButton dark={dark} accent={accent} />
              </div>
            </section>

            <div className="karti-rise" style={{ animationDelay: "280ms" }}>
              <ShareProfileButton title={profile.display_name} dark={dark} accent={accent} />
            </div>

            <div className="pt-1 text-center">
              <KartiAttribution dark={dark} />
            </div>
            <PwaDiagnostics />
          </div>
        </div>
      </div>
    </main>
  );
}
