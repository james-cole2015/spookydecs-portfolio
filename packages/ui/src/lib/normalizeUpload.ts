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
 * The decoder (~3 MB) is **lazy-loaded** via dynamic import so it only enters the
 * load path when a HEIC is actually chosen. Same pattern as `rasterizePdf.ts`
 * does for pdf.js.
 *
 * Uses `heic-to` (libheif-js 1.19.x) rather than `heic2any`, which was last
 * published in 2023 and bundles a libheif that rejects newer iPhone captures —
 * 10-bit HDR and iOS 16+ encodings threw `ERR_LIBHEIF format not supported` on
 * some files while converting others fine (#549).
 *
 * Note the shipped build is **wasm2js**, not real wasm: it carries a JS shim of the
 * `WebAssembly` namespace and never calls the real API. So there is no `.wasm` asset
 * to emit or serve (the `libheif.wasm` fetch inside it is dead fallback glue), and it
 * needs no CSP `wasm-unsafe-eval` or CloudFront MIME setup. The trade is a larger,
 * slower-decoding JS payload — acceptable for an occasional one-photo conversion.
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
    const { heicTo } = await import('heic-to');
    blob = await heicTo({
      blob: file,
      type: 'image/jpeg',
      quality: HEIC_JPEG_QUALITY,
    });
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
