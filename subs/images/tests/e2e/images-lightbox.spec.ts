import { test, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from './global-setup';

// #704: the photo-browser lightbox must render a slide at the image's real aspect ratio
// (a portrait phone shot used to be stretched into the viewport-sized box). Read-only against dev.
test.use({ storageState: STORAGE_STATE_PATH });

// Portrait 2268x4032 reference photo from the #704 report. Override with REPRO_PHOTO_ID if it is ever deleted.
const PHOTO_ID = process.env.REPRO_PHOTO_ID || 'PHOTO-20261004-203821-e8064c9d';

test('lightbox slide keeps the full image aspect ratio (no skew)', async ({ page }, testInfo) => {
  await page.goto(`/browse?search=${encodeURIComponent(PHOTO_ID)}`);
  const thumb = page.locator('img[alt]').first();
  await thumb.waitFor({ timeout: 30_000 });
  await thumb.click();

  const slide = page.locator('.pswp__img:not(.pswp__img--placeholder)').first();
  await slide.waitFor({ timeout: 20_000 });
  // Wait for the full image to load and the slide to settle on its fitted size.
  await expect
    .poll(
      async () =>
        slide.evaluate((n) => {
          const i = n as HTMLImageElement;
          const r = i.getBoundingClientRect();
          if (!i.naturalWidth || !r.width) return null;
          return Math.abs(r.width / r.height - i.naturalWidth / i.naturalHeight) / (i.naturalWidth / i.naturalHeight);
        }),
      { timeout: 10_000, intervals: [250] },
    )
    .toBeLessThan(0.02);

  await testInfo.attach('lightbox', { body: await page.screenshot(), contentType: 'image/png' });
});
