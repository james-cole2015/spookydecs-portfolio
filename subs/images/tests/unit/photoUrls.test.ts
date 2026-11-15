import { describe, it, expect } from 'vitest';
import { photoUrls } from '../../../../packages/ui/src/lib/photoUrls';

const FULL = 'https://cdn/x/image-a.jpeg';
const THUMB = 'https://cdn/x/thumbnails/thumb-a.jpeg';

describe('photoUrls (#704)', () => {
  it('thumb tier: thumb as src, full image as fallbackSrc (prop name matches SpookyImage)', () => {
    expect(photoUrls({ cloudfront_url: FULL, thumb_cloudfront_url: THUMB }, 'thumb')).toEqual({ src: THUMB, fallbackSrc: FULL });
  });
  it('full tier: full image, no fallback', () => {
    expect(photoUrls({ cloudfront_url: FULL, thumb_cloudfront_url: THUMB }, 'full')).toEqual({ src: FULL });
  });
  it('accepts the lightbox shape', () => {
    expect(photoUrls({ url: FULL, thumbUrl: THUMB })).toEqual({ src: THUMB, fallbackSrc: FULL });
  });
  it('no thumb, or thumb == full: no pointless fallback', () => {
    expect(photoUrls({ cloudfront_url: FULL })).toEqual({ src: FULL });
    expect(photoUrls({ cloudfront_url: FULL, thumb_cloudfront_url: FULL })).toEqual({ src: FULL });
  });
  it('empty input is safe', () => {
    expect(photoUrls(null)).toEqual({ src: '' });
  });
});
