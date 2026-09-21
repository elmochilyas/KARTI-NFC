import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { publicProfileDescription, publicProfileTitle } from "@/features/profiles/public";
import { getCachedPublicProfileByCode } from "@/features/profiles/publicCache";
import { publicAssetPathUrl, storageOrigin } from "@/features/profiles/storage";
import { getWalletReadiness } from "@/features/wallet/actions";
import { identityUrlForPublicCode } from "@/domain/publicCode";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";

type IdentityPageProps = {
  params: Promise<{ code: string }>;
};

// Immutable identity URL (/u/{publicCode}, ADR-046): survives slug renames,
// so saved wallet cards and shared links never rot. Same zero-stale dynamic
// posture as the slug page; same global cache tag (one purge covers both).
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
  return {
    title: publicProfileTitle(data.profile),
    description: publicProfileDescription(data.profile),
    robots: { index: false, follow: false },
    alternates: { canonical },
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
  const readiness = getWalletReadiness();

  return (
    <>
      {origin ? (
        <>
          <link rel="preconnect" href={origin} crossOrigin="anonymous" />
          <link rel="dns-prefetch" href={origin} />
        </>
      ) : null}
      <PublicProfileView
        profile={data.profile}
        links={data.links}
        avatarUrl={avatarUrl}
        coverUrl={coverUrl}
        wallet={{
          publicCode: data.profile.public_code,
          appleReady: readiness.appleReady,
          googleReady: readiness.googleReady,
        }}
      />
    </>
  );
}
