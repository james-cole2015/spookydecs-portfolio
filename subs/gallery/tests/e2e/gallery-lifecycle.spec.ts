import { test, expect } from '@playwright/test';

// Read-only: every journey is GET-only, so it is safe against prod (E2E_GALLERY_URL).
const SECTIONS = [
  { path: '/showcase', tab: 'SpookyDecs Displays', section: 'showcase' },
  { path: '/progress', tab: 'Custom Builds', section: 'progress' },
  { path: '/community', tab: 'Community Displays', section: 'community' },
] as const;

const isGalleryApi = (url: string) => /\/gallery\/images/.test(url);

test('gallery: every section loads its photos from the public API', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET' && r.method() !== 'OPTIONS' && r.method() !== 'HEAD' && /\/(dev|prod|demo)\//.test(r.url())) {
      writes.push(`${r.method()} ${r.url()}`);
    }
  });

  for (const { path, section } of SECTIONS) {
    await test.step(`${path} — GET /gallery/images?section=${section} returns a data array`, async () => {
      const res = page.waitForResponse((r) => isGalleryApi(r.url()) && r.url().includes(`section=${section}`));
      await page.goto(path);
      const response = await res;
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      await expect(page.getByText('SpookyDecs Gallery')).toBeVisible();
    });
  }

  expect(writes, 'gallery must issue no write requests').toEqual([]);
});

test('gallery: section tabs navigate between sections', async ({ page }) => {
  await page.goto('/showcase');
  const tabs = page.getByRole('tablist', { name: 'Gallery sections' });
  await expect(tabs).toBeVisible();

  for (const { path, tab } of [SECTIONS[1], SECTIONS[2], SECTIONS[0]]) {
    await tabs.getByRole('tab', { name: new RegExp(tab) }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test('gallery: Progress shows its heading, root and unknown routes land on the showcase', async ({ page }) => {
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: /Custom Builds/ })).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('tab', { name: /SpookyDecs Displays/, selected: true })).toBeVisible();

  await page.goto('/does-not-exist');
  await expect(page).toHaveURL(/\/(showcase)?$/);
});
