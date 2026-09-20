import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { title: "Karti", robots: { index: false, follow: false } };
  }
  const data = await getPublicProfileBySlug(slug, supabase);
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
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    notFound();
  }
  const data = await getPublicProfileBySlug(slug, supabase);
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
