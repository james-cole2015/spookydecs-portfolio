/**
 * normalizeUploadFiles — make a picked file set safe for the upload pipeline.
 *
 * Apple's HEIC/HEIF (the default iPhone capture format that macOS Photos preserves
 * on drag) is rejected twice downstream: Chrome/Firefox cannot decode it to canvas,
 * so the pre-upload editor can't re-encode it, and the CDN `photo-upload-service.js`
 * `validateFile()` allowlist (jpeg/png/gif/webp/pdf) throws
 * `Invalid file type: image/heic` (#533). Transcoding to JPEG here — before the
 * editor and before the service — fixes every React sub's upload path at once with
 * no backend change.
 *
 * `heic2any` (~1.4 MB of libheif) is **lazy-loaded** via dynamic import so it only
 * enters the load path when a HEIC is actually chosen. Same pattern as
 * `rasterizePdf.ts` does for pdf.js.
 */

const HEIC_MIME = /^image\/(heic|heif)(-sequence)?$/i;
const HEIC_EXT = /\.(heic|heif)$/i;

/** JPEG quality used for the HEIC→JPEG transcode. */
const HEIC_JPEG_QUALITY = 0.9;

/**
 * True for HEIC/HEIF by MIME **or** filename extension — some drag sources
 * (macOS Photos among them) hand over a File with an empty `type`, so the
 * extension is the only signal available.
 */
export function isHeicFile(file: File): boolean {
  return HEIC_MIME.test(file.type) || HEIC_EXT.test(file.name);
}

/** Transcode one HEIC/HEIF File to a JPEG File. */
async function convertHeicToJpeg(file: File): Promise<File> {
  let blob: Blob;
  try {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: HEIC_JPEG_QUALITY,
    });
    // heic2any returns Blob | Blob[] (an array for multi-image HEIC sequences).
    blob = Array.isArray(converted) ? converted[0] : converted;
  } catch (err) {
    console.error('HEIC conversion failed', err);
    throw new Error(
      `Could not read HEIC photo "${file.name}". Try exporting it as JPEG.`,
    );
  }
  const name = HEIC_EXT.test(file.name) ? file.name.replace(HEIC_EXT, '.jpg') : `${file.name}.jpg`;
  return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
}

/**
 * Pass every file through, converting HEIC/HEIF to JPEG and leaving everything
 * else untouched. Idempotent and cheap for non-HEIC input, so it is safe to call
 * on both the editor path and the direct upload path (a file that already went
 * through the editor is a JPEG and short-circuits).
 */
export async function normalizeUploadFiles(files: File[] | FileList): Promise<File[]> {
  const list = Array.from(files ?? []);
  if (list.length === 0) return [];
  if (!list.some(isHeicFile)) return list;
  return Promise.all(list.map((f) => (isHeicFile(f) ? convertHeicToJpeg(f) : f)));
}
