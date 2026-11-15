/**
 * PhotoGrid — masonry grid with infinite-scroll batching (port of
 * js/components/PhotoGrid.js), now backed by the shared @spookydecs/ui
 * PhotoLightbox (#376) for the full-screen viewer instead of raw PhotoSwipe.
 *
 * The grid reveals photos in BATCH_SIZE chunks as an IntersectionObserver
 * sentinel scrolls into view; the lightbox navigates the currently-revealed set.
 * Each rich caption (name, location, tags, season/year) is carried onto
 * LightboxPhoto.caption.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PhotoLightbox, type LightboxPhoto } from '@spookydecs/ui';
import { GALLERY_CONFIG, capitalize, getSeasonEmoji, type GalleryPhoto } from '../config/galleryConfig';
import { groupOf, sortIntoGroups } from '../lib/groupPhotos';
import { PhotoCard } from './PhotoCard';

/** Build a readable caption line from a photo's metadata. */
function buildCaption(photo: GalleryPhoto): string {
  const parts: string[] = [];
  if (photo.display_name) parts.push(photo.display_name);
  if (photo.location) parts.push(`📍 ${photo.location}`);
  if (photo.caption) parts.push(photo.caption);
  if (photo.tags && photo.tags.length) parts.push(photo.tags.map((t) => `#${t}`).join(' '));
  const meta: string[] = [];
  if (photo.season) meta.push(`${getSeasonEmoji(photo.season)} ${capitalize(photo.season)}`);
  if (photo.year) meta.push(`📅 ${photo.year}`);
  if (meta.length) parts.push(meta.join(' • '));
  return parts.join('  •  ');
}

type Dims = { width: number; height: number };

const NOMINAL_LONG_SIDE = 2400;

/**
 * The lightbox sizes each slide from width/height and the image records don't store
 * them, so without dimensions it renders photos skewed (worst on mobile). Thumbnails
 * share the original's aspect ratio: probe the small thumbnail and scale to a nominal
 * size instead of downloading every multi-MB original just to measure it.
 */
function probeRatio(src: string): Promise<Dims> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = NOMINAL_LONG_SIDE / Math.max(w, h);
      resolve({ width: Math.round(w * scale), height: Math.round(h * scale) });
    };
    img.onerror = () => resolve({ width: NOMINAL_LONG_SIDE, height: NOMINAL_LONG_SIDE });
    img.src = src;
  });
}

/** Probed dimensions for the given photos, keyed by photo_id, filled in as they resolve. */
function useProbedDims(photos: GalleryPhoto[]): Record<string, Dims> {
  const [dims, setDims] = useState<Record<string, Dims>>({});
  const requested = useRef<Set<string>>(new Set());
  useEffect(() => {
    photos.forEach((p) => {
      if (requested.current.has(p.photo_id)) return;
      requested.current.add(p.photo_id);
      probeRatio(p.thumb_cloudfront_url ?? p.cloudfront_url).then((d) =>
        setDims((prev) => ({ ...prev, [p.photo_id]: d })),
      );
    });
  }, [photos]);
  return dims;
}

function toLightboxPhoto(photo: GalleryPhoto, dims?: Dims): LightboxPhoto {
  return {
    ...dims,
    key: photo.photo_id,
    url: photo.cloudfront_url,
    thumbUrl: photo.thumb_cloudfront_url ?? photo.cloudfront_url,
    alt: photo.display_name ?? 'Display photo',
    caption: buildCaption(photo),
  };
}

interface Props {
  photos: GalleryPhoto[];
}

export function PhotoGrid({ photos: apiPhotos }: Props) {
  // Break into season/year groups (newest period first); newest upload first within each.
  const photos = useMemo(() => sortIntoGroups(apiPhotos), [apiPhotos]);
  const [visible, setVisible] = useState<number>(GALLERY_CONFIG.BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the reveal window whenever the photo set changes (e.g. filter change).
  useEffect(() => {
    setVisible(GALLERY_CONFIG.BATCH_SIZE);
  }, [photos]);

  // Reveal the next batch as the sentinel approaches the viewport.
  useEffect(() => {
    if (visible >= photos.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((v) => Math.min(v + GALLERY_CONFIG.BATCH_SIZE, photos.length));
        }
      },
      { rootMargin: `${GALLERY_CONFIG.SCROLL_THRESHOLD}px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-default-500">
        <div className="text-5xl">🖼️</div>
        <div className="text-lg font-semibold text-foreground">No photos found</div>
        <div className="text-sm">Try adjusting your filters or check back later</div>
      </div>
    );
  }

  const shown = photos.slice(0, visible);
  const dims = useProbedDims(shown);
  const lightboxPhotos = shown.map((p) => toLightboxPhoto(p, dims[p.photo_id]));

  return (
    <div>
      <div className="mb-4 text-sm text-default-500">
        <strong className="text-foreground">{photos.length}</strong>{' '}
        {photos.length === 1 ? 'photo' : 'photos'}
      </div>

      <PhotoLightbox
        photos={lightboxPhotos}
        className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
        showCaptions
        // Keep the close/zoom/counter controls always visible: the default tap action hides
        // them, and on mobile that left no obvious way to leave the viewer.
        options={{ tapAction: false }}
        renderThumbnail={({ index, ref, open }) => {
          const group = groupOf(shown[index]);
          const startsGroup = index === 0 || groupOf(shown[index - 1]).key !== group.key;
          return (
            <>
              {startsGroup && (
                // column-span spans the header across the masonry columns, breaking the grid.
                <h2 className="mb-4 mt-2 border-b border-default-200 pb-2 text-xl font-semibold text-foreground [column-span:all]">
                  {group.emoji} {group.label}
                </h2>
              )}
              <PhotoCard ref={ref as React.Ref<HTMLImageElement>} photo={shown[index]} onOpen={open} />
            </>
          );
        }}
      />

      {visible < photos.length ? (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-default-300 border-t-primary" />
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-default-500">You've reached the end! 🎉</div>
      )}
    </div>
  );
}
