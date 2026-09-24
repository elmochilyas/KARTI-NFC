import type { CSSProperties } from "react";
import {
  KeepProfilePreview,
  KartiAttribution,
  ShareProfilePreview,
} from "@/components/public-profile/ProfilePreview";
import { ProfileSectionRenderer } from "@/components/public-profile/ProfileSections";
import type { PublicLink, PublicProfile, PublicSection } from "@/features/profiles/public";

/**
 * Live builder preview (Phase 33, draft-fed since Phase 34): the same
 * section renderer as the public page, inside a phone frame, with inert
 * stand-ins for the Share/Keep islands (the live buttons would share the
 * dashboard URL). Empty content sections render admin-only guidance
 * placeholders here (never publicly) so freshly added blocks are
 * actionable before they have content.
 */
export function BuilderPreview({
  profile,
  links,
  sections,
  avatarUrl,
  coverUrl,
}: {
  profile: PublicProfile;
  links: PublicLink[];
  sections: PublicSection[];
  avatarUrl: string | null;
  coverUrl: string | null;
}) {
  const dark = profile.theme === "dark";
  const accent = profile.accent_color;
  const mutedClass = dark ? "text-neutral-400" : "text-muted";

  return (
    <div
      aria-label="Mobile preview"
      className={`overflow-hidden rounded-[2rem] ring-1 ${
        dark ? "bg-black ring-white/10" : "bg-[#D8E2EC] ring-black/5"
      }`}
    >
      <div
        className={`relative mx-auto flex min-h-[540px] w-full max-w-[340px] flex-col overflow-hidden ${
          dark ? "bg-neutral-950" : "bg-[#F4F8FC]"
        }`}
        style={{ "--karti-accent": accent ?? "#0e7c5b" } as CSSProperties}
      >
        <ProfileSectionRenderer
          profile={profile}
          links={links}
          avatarUrl={avatarUrl}
          coverUrl={coverUrl}
          sections={sections}
          previewPlaceholders
        >
          <section aria-label="Keep this digital card" className="karti-rise mt-4">
            <h2 className={`px-1 text-xs font-bold tracking-[0.18em] uppercase ${mutedClass}`}>
              Keep this digital card
            </h2>
            <div className="mt-2.5">
              <KeepProfilePreview dark={dark} />
            </div>
          </section>
          <div className="karti-rise mt-4">
            <ShareProfilePreview dark={dark} />
          </div>
          <div className="mt-4 pt-1 text-center">
            <KartiAttribution dark={dark} />
          </div>
        </ProfileSectionRenderer>
      </div>
    </div>
  );
}
