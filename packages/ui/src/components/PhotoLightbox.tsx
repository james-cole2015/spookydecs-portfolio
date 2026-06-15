/**
 * PhotoLightbox — the shared full-screen photo viewer for SpookyDecs React subs.
 *
 * The single wrapper around `react-photoswipe-gallery` (`photoswipe`) so the
 * photo subs consume **one** lightbox implementation instead of each bolting on
 * their own. Renders a grid of thumbnails; clicking one opens the full-screen
 * PhotoSwipe viewer with zoom, swipe, keyboard nav (arrows/Esc), pinch, and an
 * optional auto-advance slideshow.
 *
 * Distinct from `PhotoGallery` (#328): that component is the entity
 * primary/secondary gallery (fetches `/admin/images` for one record, owns
 * "set primary" + upload). PhotoLightbox is the lower-level viewer over an
 * arbitrary *collection* of photos — used by gallery (#337, public showcase
 * grid) and images (#336, admin photo-browser), which supply their own photo
 * lists and grid styling. See the photo-primitive table in
 * `react_migration_playbook.md` §8.
 *
 * PhotoSwipe's stylesheet is injected at runtime (bundled as a string) so the
 * primitive is drop-in: consumers import `PhotoLightbox` and get a working
 * lightbox with no extra CSS import or build wiring.
 */
import { useEffect, type ReactNode, type Ref } from 'react';
import { Gallery, Item } from 'react-photoswipe-gallery';
import type PhotoSwipe from 'photoswipe';
import type { PhotoSwipeOptions } from 'photoswipe';
import pswpStyles from 'photoswipe/style.css?inline';

/** Inject PhotoSwipe's CSS once, lazily, the first time a lightbox mounts. */
let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.dataset.spookyPswp = '';
  style.textContent = pswpStyles;
  document.head.appendChild(style);
  stylesInjected = true;
}

/** A single photo in the lightbox collection. */
export interface LightboxPhoto {
  /** Full-resolution image URL (what the lightbox displays). */
  url: string;
  /** Grid thumbnail URL. Falls back to {@link url} when omitted. */
  thumbUrl?: string;
  /** Caption shown under the photo in the lightbox (needs `showCaptions`). */
  caption?: string;
  /** Alt text for the thumbnail/full image. Defaults to `caption`. */
  alt?: string;
  /**
   * Intrinsic dimensions of the full image. Strongly recommended — PhotoSwipe
   * uses them to size the zoom box. When omitted they are auto-detected from the
   * loaded image (see the contentLoad backfill below), which works but flashes
   * the wrong size for one frame.
   */
  width?: number;
  height?: number;
  /** Stable React key. Defaults to `url`. */
  key?: string;
}

/** Render-prop args for a custom grid cell. */
export interface LightboxThumbnailProps {
  photo: LightboxPhoto;
  index: number;
  /** Attach to the thumbnail node so PhotoSwipe can animate from it. */
  ref: Ref<HTMLElement>;
  /** Open the lightbox at this photo. */
  open: (e: React.MouseEvent) => void;
}

export interface PhotoLightboxProps {
  /** The photo collection, in display order. */
  photos: LightboxPhoto[];
  /** className for the grid container. Consumers own the grid layout. */
  className?: string;
  /** className applied to each default `<img>` thumbnail. */
  thumbnailClassName?: string;
  /**
   * Auto-advance interval in ms while the lightbox is open. Omit (or 0) to
   * disable. The images photo-browser (#336) runs a ~4000 ms slideshow.
   */
  slideshowInterval?: number;
  /**
   * Show captions in the lightbox. Defaults to true when any photo has a
   * caption.
   */
  showCaptions?: boolean;
  /** Custom thumbnail renderer for full control over each grid cell. */
  renderThumbnail?: (props: LightboxThumbnailProps) => ReactNode;
  /** Extra PhotoSwipe options, merged over the defaults. */
  options?: PhotoSwipeOptions;
}

/**
 * PhotoSwipe needs each slide's pixel dimensions to size its zoom box. When a
 * photo ships without them, probe the natural size on load and patch the slide
 * so zoom still behaves.
 */
function backfillDimensions(pswp: PhotoSwipe) {
  pswp.on('contentLoad', (e: { content?: any }) => {
    const content = e.content;
    if (!content || content.type !== 'image') return;
    if (content.data?.width && content.data?.height) return;
    const probe = new window.Image();
    probe.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = probe;
      content.data.width = w;
      content.data.height = h;
      content.width = w;
      content.height = h;
      content.slide?.updateContentSize?.(true);
    };
    probe.src = content.data?.src;
  });
}

export function PhotoLightbox({
  photos,
  className,
  thumbnailClassName,
  slideshowInterval,
  showCaptions,
  renderThumbnail,
  options,
}: PhotoLightboxProps) {
  useEffect(() => {
    ensureStyles();
  }, []);

  const captionsEnabled = showCaptions ?? photos.some((p) => p.caption);

  // Fires before each PhotoSwipe.init() with the new instance — wire up the
  // dimension backfill and (optionally) the slideshow timer per open.
  const onBeforeOpen = (pswp: PhotoSwipe) => {
    backfillDimensions(pswp);
    if (slideshowInterval && slideshowInterval > 0) {
      let timer: ReturnType<typeof setInterval> | undefined = setInterval(
        () => pswp.next(),
        slideshowInterval,
      );
      const stop = () => {
        if (timer) {
          clearInterval(timer);
          timer = undefined;
        }
      };
      pswp.on('close', stop);
      pswp.on('destroy', stop);
    }
  };

  return (
    <Gallery
      withCaption={captionsEnabled}
      onBeforeOpen={onBeforeOpen}
      options={{ showHideAnimationType: 'fade', ...options }}
    >
      <div className={className}>
        {photos.map((photo, index) => (
          <Item
            key={photo.key ?? photo.url ?? index}
            original={photo.url}
            thumbnail={photo.thumbUrl ?? photo.url}
            width={photo.width}
            height={photo.height}
            caption={photo.caption}
            alt={photo.alt ?? photo.caption}
          >
            {({ ref, open }) =>
              renderThumbnail ? (
                <>{renderThumbnail({ photo, index, ref, open })}</>
              ) : (
                <img
                  ref={ref as Ref<HTMLImageElement>}
                  onClick={open}
                  src={photo.thumbUrl ?? photo.url}
                  alt={photo.alt ?? photo.caption ?? ''}
                  loading="lazy"
                  className={thumbnailClassName}
                  style={{ cursor: 'zoom-in' }}
                />
              )
            }
          </Item>
        ))}
      </div>
    </Gallery>
  );
}
