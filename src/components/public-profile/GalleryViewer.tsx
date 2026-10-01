"use client";

import { useState } from "react";
import Image from "next/image";

export type GalleryViewerPhoto = { id: string; url: string; alt: string };

/** How many photos show before the visitor expands the gallery. */
export const GALLERY_INITIAL_VISIBLE = 4;

/**
 * Gallery photos with show-more collapse — a tiny client island so the
 * rest of the public page stays server-rendered with zero JS.
 * Thumbs show the WHOLE photo (contain on a subtle tile fill, never
 * cropped); long galleries render the first few with a Show-all toggle.
 */
export function GalleryViewer({
  photos,
  masonry,
  dark,
}: {
  photos: GalleryViewerPhoto[];
  masonry: boolean;
  dark: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = photos.length > GALLERY_INITIAL_VISIBLE;
  const visible = expanded || !collapsible ? photos : photos.slice(0, GALLERY_INITIAL_VISIBLE);
  const tileClass = dark ? "bg-white/10" : "bg-black/5";
  const toggleClass = dark
    ? "border-white/15 text-neutral-200 hover:bg-white/5"
    : "border-[#E7EDF4] text-text hover:bg-[#F4F8FC]";

  return (
    <div>
      {masonry ? (
        <div className="mt-2.5 columns-2 gap-2 [&>figure]:mb-2">
          {visible.map((photo) => (
            <figure key={photo.id} className="break-inside-avoid overflow-hidden rounded-2xl">
              {/* Masonry keeps natural aspect (unknown at render time), so a
                  plain img preserves it exactly; sizes + async decoding keep
                  the download off the LCP path. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
                sizes="(max-width: 480px) 50vw, 240px"
                className="w-full"
              />
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visible.map((photo) => (
            <figure
              key={photo.id}
              className={`aspect-square overflow-hidden rounded-2xl ${tileClass}`}
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                width={480}
                height={480}
                sizes="(max-width: 480px) 50vw, 240px"
                loading="lazy"
                className="h-full w-full object-contain"
              />
            </figure>
          ))}
        </div>
      )}
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={`mt-2.5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-4 text-sm font-semibold ${toggleClass}`}
        >
          {expanded ? "Show less" : `Show all ${photos.length} photos`}
        </button>
      ) : null}
    </div>
  );
}
