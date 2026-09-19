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
              "linear-gradient(155deg, #0a1a30 0%, color-mix(in srgb, var(--karti-accent) 45%, #0a1a30) 100%)",
          }}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/65"
      />
      <div className="relative flex flex-col items-center px-6 pt-20 pb-22 text-center">
        {isBusiness ? (
          avatarUrl ? (
            <span className="flex h-24 w-24 items-center justify-center rounded-[26px] bg-white p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              <Image
                src={avatarUrl}
                alt={`${profile.display_name} logo`}
                width={192}
                height={192}
                sizes="96px"
                priority
                className="h-full w-full rounded-[20px] object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="flex h-24 w-24 items-center justify-center rounded-[26px] text-2xl font-extrabold text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
              style={{ backgroundColor: "var(--karti-accent)" }}
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
            priority
            className="h-24 w-24 rounded-full object-cover shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-4 ring-white/90"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-extrabold text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-4 ring-white/90"
            style={{ backgroundColor: "var(--karti-accent)" }}
          >
            {initialsOf(profile.display_name)}
          </span>
        )}
        <h1 className="mt-4 max-w-full text-[32px] leading-[1.1] font-extrabold tracking-tight break-words text-white">
          {profile.display_name}
        </h1>
        {category ? (
          <p className="mt-2 max-w-full text-xs font-bold tracking-[0.18em] break-words text-white/80 uppercase">
            {category}
          </p>
        ) : null}
        {tagline ? (
          <p className="mt-2 max-w-[26rem] text-[16px] leading-relaxed break-words text-white/90 line-clamp-2">
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

function QuickTiles({ actions, dark }: { actions: QuickAction[]; dark: boolean }) {
  if (actions.length === 0) return null;
  const tileClass = dark
    ? "border-white/15 bg-[#0e2238]/95 text-white shadow-[0_8px_24px_rgba(7,20,35,0.4)] backdrop-blur hover:bg-[#14304f]"
    : "border-[#E7EDF4] bg-white text-text shadow-[0_8px_24px_rgba(15,35,60,0.1)] hover:bg-[#F8FAFD]";
  return (
    <nav
      aria-label="Quick actions"
      className="relative z-10 -mt-10 grid gap-3"
      style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
    >
      {actions.map((action) =>
        action.external ? (
          <a
            key={action.id}
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-[20px] border px-2 py-4 transition active:scale-[0.97] ${tileClass}`}
          >
            <QuickTileIcon brand={action.brand} dark={dark} />
            <span className="max-w-full text-center text-sm leading-tight font-semibold break-words">
              {action.label}
            </span>
          </a>
        ) : (
          <a
            key={action.id}
            href={action.href}
            className={`flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-[20px] border px-2 py-4 transition active:scale-[0.97] ${tileClass}`}
          >
            <QuickTileIcon brand={action.brand} dark={dark} />
            <span className="max-w-full text-center text-sm leading-tight font-semibold break-words">
              {action.label}
            </span>
          </a>
        ),
      )}
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
    <main className={dark ? "min-h-dvh bg-black" : "min-h-dvh bg-[#D8E2EC]"}>
      <div
        className={`mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden ring-1 sm:my-6 sm:min-h-[calc(100dvh-3rem)] sm:rounded-[32px] ${
          dark
            ? "bg-neutral-950 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.8)] ring-white/10"
            : "bg-[#F4F8FC] shadow-[0_32px_80px_-32px_rgba(15,35,60,0.35)] ring-black/5"
        }`}
        style={{ "--karti-accent": accent ?? "#0e7c5b" } as CSSProperties}
      >
        <Hero profile={profile} avatarUrl={avatarUrl} coverUrl={coverUrl} isBusiness={isBusiness} />

        <div
          className={`relative rounded-t-[30px] px-5 pt-5 pb-12 ${
            dark ? "bg-neutral-950" : "bg-[#F4F8FC]"
          }`}
        >
          <QuickTiles actions={quickActions} dark={dark} />

          <div className="mt-5 flex flex-col gap-5">
            <a
              href={vcardHref}
              className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[20px] px-6 text-[17px] font-bold transition hover:brightness-110 active:scale-[0.99]"
              style={{
                backgroundColor: accent ?? "#0e7c5b",
                color: foregroundOnAccent(accent),
                boxShadow:
                  "0 14px 30px -12px color-mix(in srgb, var(--karti-accent) 55%, transparent)",
              }}
            >
              <LuUserPlus size={24} aria-hidden="true" className="shrink-0" />
              Save Contact
            </a>

            {hasInfo ? (
              <section
                aria-label={isBusiness ? "Business information" : "Contact information"}
                className={`rounded-[20px] border p-5 ${cardClass}`}
              >
                <h2 className="px-1 text-[20px] font-extrabold tracking-tight">
                  {isBusiness ? "Business Information" : "Contact Information"}
                </h2>
                <div className={`mt-2 divide-y ${dividerClass}`}>
                  {phone ? (
                    <a
                      href={telHref(phone)}
                      className="flex min-h-[68px] items-center gap-4 rounded-xl py-3 transition hover:opacity-80 active:scale-[0.99]"
                    >
                      <RowBrandIcon brand="call" dark={dark} />
                      <span className="min-w-0 flex-1 text-[15px] font-semibold break-words">
                        {phone}
                      </span>
                    </a>
                  ) : null}
                  {email ? (
                    <a
                      href={mailHref(email)}
                      className="flex min-h-[68px] items-center gap-4 rounded-xl py-3 transition hover:opacity-80 active:scale-[0.99]"
                    >
                      <RowBrandIcon brand="email" dark={dark} />
                      <span className="min-w-0 flex-1 text-[15px] font-semibold break-all">
                        {email}
                      </span>
                    </a>
                  ) : null}
                  {websiteHref ? (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[68px] items-center gap-4 rounded-xl py-3 transition hover:opacity-80 active:scale-[0.99]"
                    >
                      <RowBrandIcon brand="website" dark={dark} />
                      <span className="min-w-0 flex-1 text-[15px] font-semibold break-words">
                        {prettyWebsite(websiteHref)}
                      </span>
                    </a>
                  ) : null}
                  {address ? (
                    <div className="flex min-h-[68px] items-center gap-4 py-3">
                      <RowBrandIcon brand="maps" dark={dark} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-snug font-semibold break-words">
                          {address}
                        </p>
                        {mapsHref ? (
                          <p className="mt-1">
                            <a
                              href={mapsHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-9 items-center gap-1 text-[13px] font-bold underline underline-offset-2"
                              style={{ color: "var(--karti-accent)" }}
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
                className={`rounded-[20px] border p-5 sm:p-6 ${cardClass}`}
              >
                <h2 className="px-1 text-[20px] font-extrabold tracking-tight">{aboutTitle}</h2>
                <p className={`mt-2 px-1 text-[15px] leading-relaxed break-words ${mutedClass}`}>
                  {bio}
                </p>
              </section>
            ) : null}

            {moreLinks.length > 0 ? (
              <nav aria-label="More links" className="flex flex-col gap-2.5">
                {moreLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 rounded-[20px] border px-4 py-3.5 transition hover:-translate-y-px active:scale-[0.99] ${cardClass}`}
                  >
                    <RowBrandIcon brand={detectBrand(link)} dark={dark} />
                    <span className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold">
                      {link.label}
                    </span>
                    <LuChevronRight
                      size={18}
                      aria-hidden="true"
                      className={`shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
                    />
                  </a>
                ))}
              </nav>
            ) : null}

            <ShareProfileButton title={profile.display_name} dark={dark} />

            <div className="pt-1 text-center">
              <KartiAttribution dark={dark} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
