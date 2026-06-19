/**
 * rasterizePdfToImage — render the first N pages of a PDF to a single stitched
 * JPEG File, for receipt/document upload flows that need an image.
 *
 * pdf.js (`pdfjs-dist`) is **lazy-loaded** via dynamic import so the ~1 MB library
 * and its worker only enter the bundle's load path when a PDF is actually selected;
 * subs that never touch PDFs pay nothing. Replaces the old pattern of relying on a
 * `window.pdfjsLib` global loaded as a side-effect of the CDN receipt widget (#382).
 */

const DEFAULT_MAX_PAGES = 4;
const DEFAULT_SCALE = 2.0;
const DEFAULT_QUALITY = 0.92;

let workerWired = false;

/** Lazy-load pdf.js and wire its worker once. */
async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (!workerWired && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // The consuming sub's Vite build emits a hashed worker asset for this URL.
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    workerWired = true;
  }
  return pdfjsLib;
}

export interface RasterizePdfOptions {
  /** Max pages to render (the rest are dropped with a console warning). Default 4. */
  maxPages?: number;
  /** Render scale — higher is sharper but larger. Default 2.0. */
  scale?: number;
  /** JPEG quality 0–1. Default 0.92. */
  quality?: number;
}

export async function rasterizePdfToImage(
  pdfFile: File,
  options: RasterizePdfOptions = {},
): Promise<File> {
  const { maxPages = DEFAULT_MAX_PAGES, scale = DEFAULT_SCALE, quality = DEFAULT_QUALITY } = options;
  const pdfjsLib = await loadPdfjs();
  const buffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  if (pdf.numPages > maxPages) {
    console.warn(`PDF has ${pdf.numPages} pages — only the first ${maxPages} were processed.`);
  }

  const canvases: HTMLCanvasElement[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    await page.render({ canvasContext: ctx, viewport }).promise;
    canvases.push(canvas);
  }

  const totalWidth = canvases[0].width;
  const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);
  const stitched = document.createElement('canvas');
  stitched.width = totalWidth;
  stitched.height = totalHeight;
  const ctx = stitched.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  let y = 0;
  for (const c of canvases) {
    ctx.drawImage(c, 0, y);
    y += c.height;
  }

  return new Promise<File>((resolve, reject) => {
    stitched.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert PDF to image'));
          return;
        }
        resolve(new File([blob], pdfFile.name.replace(/\.pdf$/i, '.jpg'), { type: 'image/jpeg' }));
      },
      'image/jpeg',
      quality,
    );
  });
}
