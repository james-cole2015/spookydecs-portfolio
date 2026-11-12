import { test, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from './global-setup';

// #704: SpookyImage falls back to the full image when the thumbnail 404s (the server thumb is
// generated asynchronously after upload), then retries the thumb ONCE with a cache-busting param.
test.use({ storageState: STORAGE_STATE_PATH });

const PHOTO_ID = process.env.REPRO_PHOTO_ID || 'PHOTO-20261004-203821-e8064c9d';

test('grid thumb 404 -> shows full image -> one cache-busted retry of the thumb', async ({ page }) => {
  const thumbRequests: string[] = [];
  await page.route('**/thumbnails/**', async (route) => {
    thumbRequests.push(route.request().url());
    // First request 404s (simulates the thumb not generated yet); later ones pass through.
    if (thumbRequests.length === 1) return route.fulfill({ status: 404, body: 'not found' });
    return route.continue();
  });

  await page.goto(`/browse?search=${encodeURIComponent(PHOTO_ID)}`);
  const cell = page.locator('img[alt]').first();
  await cell.waitFor({ timeout: 30_000 });

  // 1) falls back to the full-size image
  await expect.poll(async () => (await cell.getAttribute('src')) ?? '', { timeout: 10_000 }).toMatch(/\/image-/);

  // 2) after the retry delay it retries the thumb with a cache-busting param, exactly once
  await expect
    .poll(async () => (await cell.getAttribute('src')) ?? '', { timeout: 15_000 })
    .toMatch(/\/thumbnails\/thumb-.*[?&]r=\d+/);
  await page.waitForTimeout(1500);
  const thumbHits = thumbRequests.filter((u) => /thumb-/.test(u));
  expect(thumbHits).toHaveLength(2); // the 404 + the single retry, no retry storm
});
