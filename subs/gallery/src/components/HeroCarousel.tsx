/**
 * HeroCarousel — featured-photo hero strip on the showcase page (port of
 * js/components/HeroCarousel.js).
 *
 * The vanilla version was a bespoke CSS-animation continuous marquee. This port
 * reproduces that "seamless crawl" feel with embla-carousel-react + the official
 * embla-carousel-auto-scroll plugin (loop + dragFree + continuous auto-advance),
 * pausing on hover. Featured photos only; renders nothing when there are none.
 */
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import type { GalleryPhoto } from '../config/galleryConfig';

interface Props {
  photos: GalleryPhoto[];
}

export function HeroCarousel({ photos }: Props) {
  const featured = photos.filter((p) => p.is_featured);

  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: true, align: 'start', containScroll: false },
    [AutoScroll({ speed: 1, startDelay: 0, stopOnInteraction: false, stopOnMouseEnter: true })],
  );

  if (featured.length === 0) return null;

  return (
    <div className="mb-8 overflow-hidden rounded-large" ref={emblaRef}>
      <div className="flex h-[clamp(220px,40vh,460px)] touch-pan-y">
        {featured.map((photo) => (
          <div
            key={photo.photo_id}
            className="group relative ml-3 h-full flex-[0_0_auto] first:ml-0"
          >
            <img
              src={photo.cloudfront_url}
              alt={photo.display_name || 'Featured display'}
              loading="lazy"
              className="h-full w-auto rounded-large object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-end rounded-large bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-xs font-medium text-white">
                ⭐ Featured Display
              </div>
              <h2 className="text-lg font-semibold text-white drop-shadow">
                {photo.display_name || 'Untitled Display'}
              </h2>
              {photo.location && <div className="text-sm text-white/80">📍 {photo.location}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
