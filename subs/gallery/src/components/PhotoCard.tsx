/**
 * PhotoCard — a single masonry grid cell (port of js/components/PhotoCard.js).
 *
 * Rendered as the lightbox thumbnail via PhotoLightbox's `renderThumbnail`, so it
 * receives the PhotoSwipe `ref` (for the open animation) and `open` handler.
 * Larger image, hover overlay with name + location, corner badge for featured.
 */
import { forwardRef } from 'react';
import { Chip } from '@heroui/react';
import type { GalleryPhoto } from '../config/galleryConfig';

interface Props {
  photo: GalleryPhoto;
  onOpen: (e: React.MouseEvent) => void;
}

export const PhotoCard = forwardRef<HTMLImageElement, Props>(function PhotoCard(
  { photo, onOpen },
  ref,
) {
  return (
    <div
      className="group relative mb-4 block w-full cursor-zoom-in overflow-hidden rounded-large bg-content2 shadow-sm break-inside-avoid"
      onClick={onOpen}
    >
      <img
        ref={ref}
        src={photo.thumb_cloudfront_url || photo.cloudfront_url}
        alt={photo.display_name || 'Display photo'}
        loading="lazy"
        className="w-full transition-transform duration-300 group-hover:scale-105"
      />

      {photo.is_featured && (
        <Chip
          size="sm"
          color="primary"
          variant="solid"
          className="absolute right-2 top-2 shadow"
          title="Featured Display"
        >
          ⭐ Featured
        </Chip>
      )}

      {(photo.display_name || photo.location) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {photo.display_name && (
            <div className="text-sm font-semibold text-white">{photo.display_name}</div>
          )}
          {photo.location && (
            <div className="text-xs text-white/80">📍 {photo.location}</div>
          )}
        </div>
      )}
    </div>
  );
});
