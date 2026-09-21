import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import {
  publicProfileDescription,
  publicProfileTitle,
} from "@/features/profiles/public";
import { getCachedPublicProfileBySlug } from "@/features/profiles/publicCache";
import { publicAssetPathUrl, storageOrigin } from "@/features/profiles/storage";
import { isSupabaseConfigured } from "@/lib/env";

type SlugPageProps = {
  params: Promise<{ slug: string }>;
};

// Explicit: public profiles are per-request dynamic (dashboard edits are
// immediately visible — zero stale). Cross-request memoization arrives via
// tagged unstable_cache in publicCache.ts, not via route static/ISR.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function publicUrls(paths: { avatar: string | null; cover: string | null }) {
  // Pure string-building (no Supabase client, no network) — see
  // publicAssetPathUrl. Previously two throwaway createAdminClient() calls
  // ran here on top of the data loader's own client.
  return {
    avatarUrl: publicAssetPathUrl(paths.avatar),
    coverUrl: publicAssetPathUrl(paths.cover),
  };
}

/**
 * Per-request deduped public-profile loader.
 * generateMetadata + page run in the same request; React `cache()` keys on
 * the slug string only. Cross-request memoization lives one layer deeper in
 * getCachedPublicProfileBySlug (tagged unstable_cache, purged on every
 * dashboard write — zero stale). No long-term TTL caching of profile data.
 */
const loadPublicProfile = cache(async (slug: string) => {
  if (!isSupabaseConfigured()) return null;
  return getCachedPublicProfileBySlug(slug);
});

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  // Probe only (no query, no client construction): preserves the distinct
  // "Karti" fallback for misconfigured server reads; the loader below is
  // the single query path.
  if (!isSupabaseConfigured()) {
    return { title: "Karti", robots: { index: false, follow: false } };
  }
  const data = await loadPublicProfile(slug);
  if (!data) {
    return { title: "Profile unavailable | Karti", robots: { index: false, follow: false } };
  }
  const { avatarUrl } = publicUrls({ avatar: data.profile.avatar_path, cover: null });
  return {
    title: publicProfileTitle(data.profile),
    description: publicProfileDescription(data.profile),
    robots: { index: false, follow: false },
    openGraph: {
      title: publicProfileTitle(data.profile),
      description: publicProfileDescription(data.profile),
      ...(avatarUrl ? { images: [{ url: avatarUrl }] } : {}),
    },
  };
}

export default async function PublicProfilePage({ params }: SlugPageProps) {
  const { slug } = await params;
  const data = await loadPublicProfile(slug);
  if (!data) notFound();

  const { avatarUrl, coverUrl } = publicUrls({
    avatar: data.profile.avatar_path,
    cover: data.profile.cover_path,
  });
  // Preconnect to the Supabase storage origin so the LCP image (avatar or
  // cover) skips DNS+TLS setup on the critical path. Rendered as hoisted
  // <link> tags (React 19); zero JS cost.
  const origin = storageOrigin();

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
      />
    </>
  );
}
