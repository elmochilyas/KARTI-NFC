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
import { ShareProfileButton } from "./ShareProfileButton";
import { WalletCtaCard, type WalletCtaProps } from "./WalletCtaCard";
import type { PublicLink, PublicProfile } from "@/features/profiles/public";

/**
 * Premium hero-first public profile view — server-rendered except two tiny
 * islands (Add to Wallet, Share). Section order: hero → quick tiles →
 * information → about → more links → wallet → share → footer.
 * Content-driven: every section omits itself cleanly when its data is
 * absent. No fake data. The wallet card renders only when the page passes
 * identity + backend readiness (credential-gated, ADR-046).
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
}: {
  profile: PublicProfile;
  avatarUrl: string | null;
  coverUrl: string | null;
  isBusiness: boolean;
}) {
  const categoryParts = [profile.job_title?.trim(), profile.company_name?.trim()].filter(
    (part): part is string => !!part && part !== profile.display_name.trim(),
  );
  const category = categoryParts.join(" • ").toUpperCase() || null;
  const tagline = profile.bio?.trim() || null;

  return (
    <section aria-label="Profile cover" className="relative overflow-hidden">
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt=""
          aria-hidden="true"
          fill
          priority
          fetchPriority="high"
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover brightness-[0.8]"
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
      {/* Layered legibility scrim: softens the photo so the avatar + name
          stay the focus, and lifts body-text contrast on any cover. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/85"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent"
      />
      <div className="relative flex min-h-[220px] flex-col items-center justify-end px-6 pt-14 pb-16 text-center">
        {isBusiness ? (
          avatarUrl ? (
            <span className="flex h-24 w-24 items-center justify-center rounded-[26px] bg-white p-1 shadow-[0_18px_44px_rgba(0,0,0,0.55)] ring-2 ring-white/70">
              <Image
                src={avatarUrl}
                alt={`${profile.display_name} logo`}
                width={192}
                height={192}
                sizes="96px"
                // LCP discipline: exactly one preloaded image per view. Cover
                // owns priority when present; otherwise the avatar is the LCP
                // and takes it. Never two `priority` images on one tap.
                priority={!coverUrl}
                fetchPriority={coverUrl ? "auto" : "high"}
                loading={coverUrl ? "eager" : undefined}
                className="h-full w-full rounded-[21px] object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="flex h-24 w-24 items-center justify-center rounded-[26px] text-3xl font-extrabold text-white shadow-[0_18px_44px_rgba(0,0,0,0.55)] ring-2 ring-white/70"
              style={{
                background:
                  "linear-gradient(135deg, var(--karti-accent), color-mix(in srgb, var(--karti-accent) 55%, black))",
              }}
            >
              {initialsOf(profile.display_name)}
            </span>
          )
        ) : avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${profile.display_name} profile photo`}
            width={192}
            height={192}
            sizes="96px"
            priority={!coverUrl}
            fetchPriority={coverUrl ? "auto" : "high"}
            loading={coverUrl ? "eager" : undefined}
            className="h-24 w-24 rounded-full object-cover shadow-[0_18px_44px_rgba(0,0,0,0.55)] ring-4 ring-white"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full text-4xl font-extrabold text-white shadow-[0_18px_44px_rgba(0,0,0,0.55)] ring-4 ring-white"
            style={{
              background:
                "linear-gradient(135deg, var(--karti-accent), color-mix(in srgb, var(--karti-accent) 55%, black))",
            }}
          >
            {initialsOf(profile.display_name)}
          </span>
        )}
        <h1
          className="mt-3 max-w-full text-[28px] leading-[1.05] font-extrabold tracking-tight break-words text-white"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.65)" }}
        >
          {profile.display_name}
        </h1>
        {category ? (
          <p className="mt-2 inline-flex max-w-full items-center justify-center rounded-full border border-white/30 bg-white/20 px-3 py-1 text-center text-[10px] font-bold tracking-[0.14em] break-words text-white uppercase backdrop-blur-sm">
            {category}
          </p>
        ) : null}
        {tagline ? (
          <p
            className="mt-2 line-clamp-3 max-w-[26rem] text-[14px] leading-snug break-words text-white/95"
            style={{ textShadow: "0 1px 14px rgba(0,0,0,0.65)" }}
            title={tagline}
          >
            {tagline}
          </p>
        ) : null}
      </div>
    </section>
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
      className="karti-rise relative z-10 -mt-10 grid w-full gap-2"
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
  wallet = null,
}: {
  profile: PublicProfile;
  links: PublicLink[];
  avatarUrl: string | null;
  coverUrl: string | null;
  /** Wallet identity + backend readiness; null omits the card entirely. */
  wallet?: Omit<WalletCtaProps, "displayName" | "dark" | "accent"> | null;
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
        <Hero profile={profile} avatarUrl={avatarUrl} coverUrl={coverUrl} isBusiness={isBusiness} />

        <div
          className={`relative rounded-t-[28px] px-4 pt-4 pb-8 ${
            dark ? "bg-neutral-950" : "bg-[#F4F8FC]"
          }`}
        >
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

            <div className="karti-rise" style={{ animationDelay: "240ms" }}>
              {wallet ? (
                <WalletCtaCard
                  publicCode={wallet.publicCode}
                  displayName={profile.display_name}
                  appleReady={wallet.appleReady}
                  googleReady={wallet.googleReady}
                  dark={dark}
                  accent={accent}
                />
              ) : null}
            </div>

            <div className="karti-rise" style={{ animationDelay: "280ms" }}>
              <ShareProfileButton title={profile.display_name} dark={dark} accent={accent} />
            </div>

            <div className="pt-1 text-center">
              <KartiAttribution dark={dark} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
