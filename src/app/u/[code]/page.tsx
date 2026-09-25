import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { manifestShortName, manifestThemeColor } from "@/features/pwa/manifest";
import { publicProfileDescription, publicProfileTitle } from "@/features/profiles/public";
import { getCachedPublicProfileByCode } from "@/features/profiles/publicCache";
import { publicAssetPathUrl, storageOrigin } from "@/features/profiles/storagePaths";
import { identityUrlForPublicCode } from "@/domain/publicCode";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";

type IdentityPageProps = {
  params: Promise<{ code: string }>;
};

// Immutable identity URL (/u/{publicCode}, ADR-046): survives slug renames,
// so shared identity links never rot — and future integrations such as
// wallet cards can build on it. Same zero-stale dynamic posture as the slug
// page; same global cache tag (one purge covers both).
export const dynamic = "force-dynamic";
export const revalidate = 0;

function publicUrls(paths: { avatar: string | null; cover: string | null }) {
  return {
    avatarUrl: publicAssetPathUrl(paths.avatar),
    coverUrl: publicAssetPathUrl(paths.cover),
  };
}

const loadIdentityProfile = cache(async (code: string) => {
  if (!isSupabaseConfigured()) return null;
  return getCachedPublicProfileByCode(code);
});

export async function generateMetadata({ params }: IdentityPageProps): Promise<Metadata> {
  const { code } = await params;
  if (!isSupabaseConfigured()) {
    return { title: "Karti", robots: { index: false, follow: false } };
  }
  const data = await loadIdentityProfile(code);
  if (!data) {
    return { title: "Profile unavailable | Karti", robots: { index: false, follow: false } };
  }
  const { avatarUrl } = publicUrls({ avatar: data.profile.avatar_path, cover: null });
  const canonical = identityUrlForPublicCode(getAppUrl(), data.profile.public_code);
  // Per-profile PWA identity: the installed shortcut belongs to THIS
  // profile (name + icon + /u/{code} start_url), never a generic app.
  const manifestPath = `/u/${data.profile.public_code}/manifest.webmanifest`;
  return {
    title: publicProfileTitle(data.profile),
    description: publicProfileDescription(data.profile),
    robots: { index: false, follow: false },
    alternates: { canonical },
    manifest: manifestPath,
    themeColor: manifestThemeColor(data.profile.accent_color),
    icons: { apple: `/u/${data.profile.public_code}/apple-touch-icon.png` },
    // Apple home-screen web-app support: fullscreen-capable launch from
    // the installed icon, default status bar, profile short name. The
    // modern unprefixed equivalent rides along via `other`.
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: manifestShortName(data.profile.display_name),
    },
    other: { "mobile-web-app-capable": "yes" },
    openGraph: {
      title: publicProfileTitle(data.profile),
      description: publicProfileDescription(data.profile),
      url: canonical,
      ...(avatarUrl ? { images: [{ url: avatarUrl }] } : {}),
    },
  };
}

export default async function IdentityProfilePage({ params }: IdentityPageProps) {
  const { code } = await params;
  const data = await loadIdentityProfile(code);
  if (!data) notFound();

  const { avatarUrl, coverUrl } = publicUrls({
    avatar: data.profile.avatar_path,
    cover: data.profile.cover_path,
  });
  const origin = storageOrigin();

  return (
    <>
      {origin ? <link rel="preconnect" href={origin} crossOrigin="anonymous" /> : null}
      <PublicProfileView
        profile={data.profile}
        links={data.links}
        avatarUrl={avatarUrl}
        coverUrl={coverUrl}
        sections={data.sections}
      />
    </>
  );
}
