import Image from "next/image";
import type { CSSProperties } from "react";
import { LuChevronRight, LuUserPlus } from "react-icons/lu";
import {
  detectBrand,
  pickQuickActions,
  QuickTileIcon,
  RowBrandIcon,
  type QuickAction,
} from "./brandIcons";
import { foregroundOnAccent, KartiAttribution, mailHref, telHref } from "./ProfilePreview";
import { ShareProfileButton } from "./ShareProfileButton";
import type { PublicLink, PublicProfile } from "@/features/profiles/public";

/**
 * Premium hero-first public profile view — 100% server-rendered except the
 * tiny Share island. Section order: hero → quick tiles → Save Contact →
 * information → about → more links → share → footer. Content-driven: every
 * section omits itself cleanly when its data is absent. No fake data.
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
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(130% 80% at 50% -10%, color-mix(in srgb, var(--karti-accent) 60%, transparent) 0%, transparent 55%), linear-gradient(165deg, #0b1c33 0%, #060d18 70%)",
          }}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/75"
      />
      <div className="relative flex min-h-[220px] flex-col items-center justify-end px-6 pt-14 pb-16 text-center">
        {isBusiness ? (
          avatarUrl ? (
            <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white p-1 shadow-[0_14px_36px_rgba(0,0,0,0.45)] ring-1 ring-white/40">
              <Image
                src={avatarUrl}
                alt={`${profile.display_name} logo`}
                width={160}
                height={160}
                sizes="80px"
                loading="eager"
                className="h-full w-full rounded-[19px] object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="flex h-20 w-20 items-center justify-center rounded-[24px] text-2xl font-extrabold text-white shadow-[0_14px_36px_rgba(0,0,0,0.45)] ring-1 ring-white/40"
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
            width={160}
            height={160}
            sizes="80px"
            loading="eager"
            className="h-20 w-20 rounded-full object-cover shadow-[0_14px_36px_rgba(0,0,0,0.45)] ring-[3px] ring-white"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-extrabold text-white shadow-[0_14px_36px_rgba(0,0,0,0.45)] ring-[3px] ring-white"
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
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.55)" }}
        >
          {profile.display_name}
        </h1>
        {category ? (
          <p className="mt-2 inline-flex max-w-full items-center truncate rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-white uppercase backdrop-blur-sm">
            {category}
          </p>
        ) : null}
        {tagline ? (
          <p
            className="mt-2 max-w-[26rem] truncate text-[14px] leading-snug break-words text-white/90"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}
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
      return "Chat instantly";
    case "instagram":
      return "View profile";
    case "website":
      return prettyWebsite(action.href);
    default:
      return "Open";
  }
}

function QuickTiles({ actions, dark }: { actions: QuickAction[]; dark: boolean }) {
  if (actions.length === 0) return null;
  const tileClass = dark
    ? "border-white/15 bg-[#0e2238]/95 text-white shadow-[0_12px_32px_rgba(7,20,35,0.5)] backdrop-blur hover:bg-[#14304f]"
    : "border-[#E7EDF4] bg-white text-text shadow-[0_12px_32px_rgba(15,35,60,0.14)] hover:bg-[#F8FAFD]";
  const subClass = dark ? "text-white/60" : "text-muted";
  return (
    <nav
      aria-label="Quick actions"
      className="karti-rise relative z-10 -mt-10 grid gap-2.5"
      style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
    >
      {actions.map((action) => {
        const sub = tileSublabel(action);
        const body = (
          <>
            <QuickTileIcon brand={action.brand} dark={dark} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-left text-[14px] leading-tight font-bold">
                {action.label}
              </span>
              {sub ? (
                <span className={`block truncate text-left text-[11px] font-medium ${subClass}`}>
                  {sub}
                </span>
              ) : null}
            </span>
          </>
        );
        const classes = `flex min-h-[76px] items-center gap-2.5 rounded-[18px] border px-3 py-2.5 transition hover:-translate-y-0.5 active:scale-[0.97] ${tileClass}`;
        return action.external ? (
          <a
            key={action.id}
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes}
            title={sub ? `${action.label} — ${sub}` : action.label}
          >
            {body}
          </a>
        ) : (
          <a key={action.id} href={action.href} className={classes} title={action.label}>
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
  const vcardHref = `/api/vcard/${profile.slug}`;

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
            <a
              href={vcardHref}
              className="karti-rise flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[18px] px-6 text-[16px] font-extrabold transition hover:brightness-110 active:scale-[0.99]"
              style={{
                animationDelay: "60ms",
                backgroundImage:
                  "linear-gradient(135deg, var(--karti-accent), color-mix(in srgb, var(--karti-accent) 58%, black))",
                color: foregroundOnAccent(accent),
                boxShadow:
                  "0 14px 28px -12px color-mix(in srgb, var(--karti-accent) 65%, transparent)",
              }}
            >
              <LuUserPlus size={22} aria-hidden="true" className="shrink-0" />
              Save Contact
            </a>

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
                  {moreLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex min-h-[60px] items-center gap-3 rounded-[18px] border px-3.5 py-2 transition hover:-translate-y-px active:scale-[0.99] ${cardClass}`}
                    >
                      <RowBrandIcon brand={detectBrand(link)} dark={dark} />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[15px] font-bold">{link.label}</span>
                        <span className={`block truncate text-xs font-medium ${mutedClass}`}>
                          {prettyWebsite(link.url)}
                        </span>
                      </span>
                      <LuChevronRight
                        size={18}
                        aria-hidden="true"
                        className={`shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
                      />
                    </a>
                  ))}
                </nav>
              </section>
            ) : null}

            <div className="karti-rise" style={{ animationDelay: "240ms" }}>
              <ShareProfileButton title={profile.display_name} dark={dark} />
            </div>

            <div className="pt-1 text-center">
              <KartiAttribution dark={dark} />
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none sticky bottom-0 z-20 mx-auto w-full max-w-[480px] px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <a
          href={vcardHref}
          aria-label="Save contact"
          className="pointer-events-auto flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl px-6 text-[16px] font-extrabold shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] transition hover:brightness-110 active:scale-[0.99]"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--karti-accent), color-mix(in srgb, var(--karti-accent) 58%, black))",
            color: foregroundOnAccent(accent),
          }}
        >
          <LuUserPlus size={22} aria-hidden="true" className="shrink-0" />
          Save Contact
        </a>
      </div>
    </main>
  );
}
