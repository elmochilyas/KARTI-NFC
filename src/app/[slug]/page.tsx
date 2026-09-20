import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import {
  getPublicProfileBySlug,
  publicProfileDescription,
  publicProfileTitle,
} from "@/features/profiles/public";
import { publicAssetUrl } from "@/features/profiles/storage";
import { createAdminClient } from "@/lib/supabase/admin";

type SlugPageProps = {
  params: Promise<{ slug: string }>;
};

function publicUrls(paths: { avatar: string | null; cover: string | null }) {
  // getPublicUrl is pure string-building (no network); a throwaway client suffices.
  try {
    const supabase = createAdminClient();
    return {
      avatarUrl: publicAssetUrl(supabase, paths.avatar),
      coverUrl: publicAssetUrl(supabase, paths.cover),
    };
  } catch {
    return { avatarUrl: null, coverUrl: null };
  }
}

/**
 * Per-request deduped public-profile loader.
 * generateMetadata + page run in the same request and previously issued 2
 * identical DB round-trips (profile + links each). React `cache()` keys on
 * the slug string only — the admin client is created inside so both callers
 * share one fetch. Per-request memoization only; no long-term caching of
 * profile data (dashboard edits stay immediately visible).
 */
const loadPublicProfile = cache(async (slug: string) => {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return null;
  }
  return getPublicProfileBySlug(slug, supabase);
});

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    // Probe only (no query): preserves the distinct "Karti" fallback for
    // misconfigured server reads; the loader below is the single query path.
    createAdminClient();
  } catch {
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

  return (
    <PublicProfileView
      profile={data.profile}
      links={data.links}
      avatarUrl={avatarUrl}
      coverUrl={coverUrl}
    />
  );
}
