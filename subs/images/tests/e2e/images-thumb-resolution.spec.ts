import { test, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from './global-setup';

// #704: grid thumbs must be sharp on a DPR 2 display. object-fit: cover scales the image by
// max(boxW/natW, boxH/natH); device pixels per image pixel = that scale * DPR. The old ~168x300
// client thumb gave ~3x upscaling here; the canonical 800px server thumb gives ~1.1x.
// Depends on the dev backfill having pointed the record at the server thumb.
test.use({ storageState: STORAGE_STATE_PATH, deviceScaleFactor: 2 });

const PHOTO_ID = process.env.REPRO_PHOTO_ID || 'PHOTO-20261004-203821-e8064c9d';
const MAX_UPSCALE = 1.25; // tolerate mild upscaling; pixelation starts well above this

test('grid thumb is not upscaled more than ~1.25x on a DPR 2 display', async ({ page }) => {
  await page.goto(`/browse?search=${encodeURIComponent(PHOTO_ID)}`);
  const img = page.locator('img[alt]').first();
  await img.waitFor({ timeout: 30_000 });
  await expect
    .poll(async () => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 15_000 })
    .toBe(true);

  const m = await img.evaluate((el: HTMLImageElement) => {
    const r = el.getBoundingClientRect();
    return {
      src: el.currentSrc,
      natW: el.naturalWidth,
      natH: el.naturalHeight,
      boxW: r.width,
      boxH: r.height,
      dpr: window.devicePixelRatio,
    };
  });
  expect(m.dpr).toBe(2);
  expect(m.src).toMatch(/\/thumbnails\/thumb-/); // canonical thumb, not the full-image fallback

  const scale = Math.max(m.boxW / m.natW, m.boxH / m.natH);
  const upscale = scale * m.dpr;
  expect(upscale, `thumb ${m.natW}x${m.natH} in ${m.boxW}x${m.boxH} box`).toBeLessThanOrEqual(MAX_UPSCALE);
});
