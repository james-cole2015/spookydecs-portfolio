/**
 * GalleryPreview — a visual teaser strip linking to the public demo gallery.
 * v1 uses static CSS-gradient tiles (asset-free); a live gallery-API fetch is
 * deferred (see #364 plan).
 */
import { Button } from '@heroui/react';
import { ArrowUpRight } from 'lucide-react';
import { DEMO_GALLERY_URL, GALLERY_TILES } from '../config/landingConfig';

export function GalleryPreview() {
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
        {GALLERY_TILES.map((tile) => (
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
