/**
 * SpookyImage — the shared photo <img> for SpookyDecs React subs (#704).
 *
 * One primitive for every photo grid/detail so thumbnails behave the same
 * everywhere: lazy loading, a HeroUI Skeleton until the image decodes, a fixed
 * aspect-ratio box (no layout shift), and a resilient error path.
 *
 * Error path (the server thumb is generated asynchronously after upload, so it can
 * 404 briefly): `src` fails -> show `fallbackSrc` (the full image) -> after
 * `retryDelayMs` retry `src` ONCE with a cache-busting param (CloudFront may have
 * negative-cached the 404) -> settle. A second failure keeps the fallback.
 *
 * Portrait-friendly by default: `fit="contain"` on a neutral background so a 9:16
 * phone shot is never centre-cropped. Pass `fit="cover"` where cropping is wanted.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Skeleton } from '@heroui/react';

export interface SpookyImageProps {
  /** Preferred URL (usually the thumbnail). */
  src: string;
  /** Used if `src` fails to load (usually the full image). */
  fallbackSrc?: string;
  alt: string;
  /** CSS aspect-ratio of the box, e.g. `'1/1'`, `'4/5'`. `'auto'` sizes to the image. Default `'4/5'`. */
  ratio?: string;
  /** `contain` (default, no cropping) or `cover`. */
  fit?: 'contain' | 'cover';
  /** className on the wrapper box. */
  className?: string;
  /** className on the <img>. */
  imgClassName?: string;
  /** Delay before the single retry of `src` after a failure. Default 3000ms. */
  retryDelayMs?: number;
  /** Eager-load (above-the-fold / lightbox). Default lazy. */
  eager?: boolean;
  /** Called once the displayed image has loaded, with its natural size. */
  onImageLoad?: (dims: { width: number; height: number; src: string }) => void;
}

type Stage = 'primary' | 'fallback' | 'retry' | 'failed';

function bust(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}r=${Date.now()}`;
}

export function SpookyImage({
  src,
  fallbackSrc,
  alt,
  ratio = '4/5',
  fit = 'contain',
  className,
  imgClassName,
  retryDelayMs = 3000,
  eager = false,
  onImageLoad,
}: SpookyImageProps) {
  const [stage, setStage] = useState<Stage>('primary');
  const [loaded, setLoaded] = useState(false);
  const [retrySrc, setRetrySrc] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // New source -> start over.
  useEffect(() => {
    setStage('primary');
    setLoaded(false);
    setRetrySrc(null);
    return () => clearTimeout(timer.current);
  }, [src, fallbackSrc]);

  const canFallback = !!fallbackSrc && fallbackSrc !== src;

  let shown = src;
  if (stage === 'fallback' || stage === 'failed') shown = canFallback ? (fallbackSrc as string) : src;
  if (stage === 'retry') shown = retrySrc ?? src;

  function handleError() {
    if (stage === 'primary') {
      if (!canFallback) {
        setStage('failed');
        setLoaded(true);
        return;
      }
      setLoaded(false);
      setStage('fallback');
      timer.current = setTimeout(() => {
        setRetrySrc(bust(src));
        setStage('retry');
      }, retryDelayMs);
    } else if (stage === 'retry') {
      // The retry failed too: settle on the fallback.
      setLoaded(false);
      setStage('failed');
    } else {
      setLoaded(true); // nothing left to try; stop showing the skeleton
    }
  }

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    setLoaded(true);
    const img = e.currentTarget;
    onImageLoad?.({ width: img.naturalWidth, height: img.naturalHeight, src: shown });
  }

  const boxStyle: CSSProperties = ratio === 'auto' ? {} : { aspectRatio: ratio };

  return (
    <div className={`relative overflow-hidden bg-content2 ${className ?? ''}`} style={boxStyle}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      <img
        key={shown}
        src={shown}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity ${imgClassName ?? ''}`}
        style={ratio === 'auto' ? { height: 'auto' } : undefined}
      />
    </div>
  );
}
