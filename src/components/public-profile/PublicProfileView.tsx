import type { CSSProperties } from "react";
import { KartiAttribution } from "./ProfilePreview";
import { KeepProfileButton } from "./KeepProfileButton";
import { PwaDiagnostics } from "./PwaDiagnostics";
import { ShareProfileButton } from "./ShareProfileButton";
import { ProfileSectionRenderer } from "./ProfileSections";
import type { PublicLink, PublicProfile, PublicSection } from "@/features/profiles/public";

/**
 * Premium hero-first public profile view — server-rendered except the tiny
 * Share + Keep islands (plus the dev-only PWA diagnostics island, inert in
 * production). Phase 25: the hero/actions/links blocks render through
 * `ProfileSectionRenderer` (data-driven order, same markup as before —
 * components live in `ProfileSections.tsx`). Keep this Card, Share Profile,
 * and attribution stay fixed after the sections, by product decision.
 */

export function PublicProfileView({
  profile,
  links,
  avatarUrl,
  coverUrl,
  sections,
}: {
  profile: PublicProfile;
  links: PublicLink[];
  avatarUrl: string | null;
  coverUrl: string | null;
  /** Data-driven order; omitted/empty falls back to hero → actions → links. */
  sections?: PublicSection[];
}) {
  const dark = profile.theme === "dark";
  const accent = profile.accent_color;

  const mutedClass = dark ? "text-neutral-400" : "text-muted";

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
        <ProfileSectionRenderer
          profile={profile}
          links={links}
          avatarUrl={avatarUrl}
          coverUrl={coverUrl}
          sections={sections}
        >
          <section
            aria-label="Keep this digital card"
            className="karti-rise mt-4"
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

          <div className="karti-rise mt-4" style={{ animationDelay: "280ms" }}>
            <ShareProfileButton title={profile.display_name} dark={dark} accent={accent} />
          </div>

          <div className="mt-4 pt-1 text-center">
            <KartiAttribution dark={dark} />
          </div>
          <PwaDiagnostics />
        </ProfileSectionRenderer>
      </div>
    </main>
  );
}
