/**
 * GalleryPreview — a visual teaser strip linking to the public gallery.
 * Fetches real showcase thumbnails from the gallery API via the stage-resolved
 * `API_ENDPOINT` (demo on demo.spookydecs.com — no hardcoded endpoint). The
 * static CSS-gradient tiles remain as the load / empty / error fallback so the
 * strip is never blank.
 */
import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { ArrowUpRight } from 'lucide-react';
import { useConfig } from '@spookydecs/ui';
import { DEMO_GALLERY_URL, GALLERY_TILES } from '../config/landingConfig';

/** Minimal public-photo shape returned by `GET /gallery/images` (see gallery sub). */
interface ShowcasePhoto {
  photo_id: string;
  cloudfront_url: string;
  thumb_cloudfront_url?: string;
  caption?: string;
  display_name?: string;
}

const PREVIEW_COUNT = 4;

export function GalleryPreview() {
  const { API_ENDPOINT } = useConfig();
  // null = still loading (show gradient fallback); [] = loaded-but-empty / errored.
  const [photos, setPhotos] = useState<ShowcasePhoto[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_ENDPOINT}/gallery/images?section=showcase`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body) => {
        if (active) setPhotos((body.data as ShowcasePhoto[]) ?? []);
      })
      .catch(() => {
        if (active) setPhotos([]); // fall back to the static tiles
      });
    return () => {
      active = false;
    };
  }, [API_ENDPOINT]);

  const livePhotos = photos && photos.length > 0 ? photos.slice(0, PREVIEW_COUNT) : null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">See it in action</h2>
          <p className="text-sm text-default-500">Real displays from the SpookyDecs gallery.</p>
        </div>
        <Button
          as="a"
          href={DEMO_GALLERY_URL}
          target="_blank"
          rel="noreferrer"
          size="lg"
          endContent={<ArrowUpRight size={18} />}
          className="sd-cta font-semibold"
        >
          Open gallery
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {livePhotos
          ? livePhotos.map((photo) => {
              const label = photo.caption || photo.display_name;
              return (
                <a
                  key={photo.photo_id}
                  href={DEMO_GALLERY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-default-100"
                >
                  <img
                    src={photo.thumb_cloudfront_url || photo.cloudfront_url}
                    alt={label || 'SpookyDecs display'}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                  {label && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/40 px-2 py-1 text-xs font-medium text-white">
                      {label}
                    </span>
                  )}
                </a>
              );
            })
          : GALLERY_TILES.map((tile) => (
              <a
                key={tile.label}
                href={DEMO_GALLERY_URL}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-[4/3] overflow-hidden rounded-xl"
                style={{ background: tile.gradient }}
              >
                <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-90 transition-transform group-hover:scale-110">
                  {tile.emoji}
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-black/40 px-2 py-1 text-xs font-medium text-white">
                  {tile.label}
                </span>
              </a>
            ))}
      </div>
    </section>
  );
}
