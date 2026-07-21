/**
 * imageCanvas — headless canvas helpers for the shared pre-upload photo editor.
 *
 * `getEditedImage` applies the transforms produced by `ImageEditorModal`
 * (react-easy-crop pixel rect + rotation + flip + brightness) to a source image
 * and returns an edited `Blob`. No React — this is the pure pixel layer, mirroring
 * `lib/rasterizePdf.ts`. The rotation-aware crop follows the canonical react-easy-crop
 * recipe: draw the image into a rotation-sized bounding-box canvas, then copy out the
 * crop rect (which react-easy-crop reports in that bounding-box space).
 *
 * The `source` is deliberately generic — a `File` (fresh pre-upload edit, #482) **or**
 * an image URL / `HTMLImageElement` (post-upload re-edit of a library photo, #483).
 */

const DEFAULT_MIME = 'image/jpeg';
const DEFAULT_QUALITY = 0.92;

/** A crop rectangle in source-image pixels, as `react-easy-crop` reports it. */
export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageTransforms {
  /** Crop rect from react-easy-crop's `onCropComplete` (`croppedAreaPixels`). */
  crop: CropPixels;
  /** Rotation in degrees (straighten slider + ±90° buttons combined). Default 0. */
  rotation?: number;
  /** Mirror horizontally. Default false. */
  flipHorizontal?: boolean;
  /** Mirror vertically. Default false. */
  flipVertical?: boolean;
  /** CSS `brightness()` multiplier — 1 = unchanged. Default 1. */
  brightness?: number;
  /** Output MIME. Default `image/jpeg`. */
  mimeType?: string;
  /** Output quality 0–1 (jpeg/webp). Default 0.92. */
  quality?: number;
}

/** A `File`, an object/remote URL, or an already-loaded image. */
export type ImageSource = File | string | HTMLImageElement;

function getRadianAngle(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Bounding-box size of an image after it is rotated by `rotation` degrees. */
function rotateSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const rad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/** Resolve any `ImageSource` to a decoded `HTMLImageElement`. */
export function createImage(source: ImageSource): Promise<HTMLImageElement> {
  if (source instanceof HTMLImageElement) {
    return source.complete
      ? Promise.resolve(source)
      : new Promise((resolve, reject) => {
          source.addEventListener('load', () => resolve(source));
          source.addEventListener('error', reject);
        });
  }
  const isFile = source instanceof File;
  const url = isFile ? URL.createObjectURL(source) : source;
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Remote URLs (CDN re-edit, #483) must be CORS-clean or the canvas taints.
    if (!isFile) image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => {
      if (isFile) URL.revokeObjectURL(url);
      resolve(image);
    });
    image.addEventListener('error', (err) => {
      if (isFile) URL.revokeObjectURL(url);
      reject(err);
    });
    image.src = url;
  });
}

/**
 * Apply crop / rotation / flip / brightness to `source` and resolve with an edited `Blob`.
 */
export async function getEditedImage(source: ImageSource, transforms: ImageTransforms): Promise<Blob> {
  const {
    crop,
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false,
    brightness = 1,
    mimeType = DEFAULT_MIME,
    quality = DEFAULT_QUALITY,
  } = transforms;

  const image = await createImage(source);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Draw the (optionally rotated/flipped/brightened) image centered in the bounding box.
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);
  if (brightness !== 1) ctx.filter = `brightness(${brightness})`;
  ctx.drawImage(image, 0, 0);

  // Copy out the crop rect — react-easy-crop reports it in bounding-box space.
  const cropped = document.createElement('canvas');
  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) throw new Error('Failed to get canvas context');
  cropped.width = Math.max(1, Math.round(crop.width));
  cropped.height = Math.max(1, Math.round(crop.height));
  croppedCtx.drawImage(
    canvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    cropped.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to export edited image'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
