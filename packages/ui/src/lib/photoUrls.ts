/**
 * photoUrls — resolve the URL to display for a photo at a given size tier (#704).
 *
 * The server thumbnail (800px, key derived from the full image key) is canonical;
 * it is written asynchronously after upload, so the thumb can 404 for a second or
 * two. `fallbackSrc` is the full-size image, which `SpookyImage` swaps to on error.
 *
 * Accepts either the API record shape (`thumb_cloudfront_url` / `cloudfront_url`)
 * or the lightbox shape (`thumbUrl` / `url`).
 */
export interface PhotoUrlSource {
  cloudfront_url?: string | null;
  thumb_cloudfront_url?: string | null;
  url?: string | null;
  thumbUrl?: string | null;
}

export type PhotoTier = 'thumb' | 'full';

export interface PhotoUrls {
  /** URL to render. */
  src: string;
  /** URL to fall back to if `src` fails. Undefined when there is nothing better.
   *  Named to match `SpookyImage`'s prop so `<SpookyImage {...photoUrls(p)} />` just works. */
  fallbackSrc?: string;
}

export function photoUrls(photo: PhotoUrlSource | null | undefined, tier: PhotoTier = 'thumb'): PhotoUrls {
  const full = photo?.cloudfront_url || photo?.url || '';
  const thumb = photo?.thumb_cloudfront_url || photo?.thumbUrl || '';
  if (tier === 'full') return { src: full || thumb };
  if (thumb && full && thumb !== full) return { src: thumb, fallbackSrc: full };
  return { src: thumb || full };
}
