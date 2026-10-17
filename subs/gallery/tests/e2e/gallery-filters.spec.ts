import { test, expect, type Page } from '@playwright/test';

// Read-only like gallery-lifecycle.spec.ts: safe against prod (E2E_GALLERY_URL). Everything is data-driven from what the
// public API returns in that environment, so no fixture is seeded.
const isList = (url: string) => /\/gallery\/images\?/.test(url);

/** Loads /showcase and returns the API base plus the unfiltered photo list. */
async function loadShowcase(page: Page) {
  const res = page.waitForResponse((r) => isList(r.url()) && r.url().includes('section=showcase'));
  await page.goto('/showcase');
  const response = await res;
  const base = response.url().split('/gallery/images')[0];
  const photos: any[] = (await response.json()).data ?? [];
  return { base, photos };
}

async function applyFilter(page: Page, fill: () => Promise<void>) {
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await fill();
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
}

test('gallery: season + year filter — query params reach the API, results match, chips and Browse all work', async ({ page }) => {
  const { photos } = await loadShowcase(page);
  test.skip(photos.length === 0, 'this environment has no showcase photos');
  const pick = photos.find((p) => p.season && p.year) ?? photos[0];
  const season = String(pick.season).toLowerCase();
  const year = String(pick.year);

  const filtered = page.waitForResponse((r) => isList(r.url()) && r.url().includes(`season=${season}`) && r.url().includes(`year=${year}`));
  await applyFilter(page, async () => {
    await page.getByRole('button', { name: /^Season/ }).click();
    await page.locator('[data-slot="listbox"] [role="option"]').filter({ hasText: new RegExp(season, 'i') }).click();
    await expect(page.locator('[data-slot="listbox"]')).toHaveCount(0); // the Season list has closed
    await page.getByRole('button', { name: /^Year/ }).click();
    await page.locator('[data-slot="listbox"] [role="option"]').filter({ hasText: year }).click();
  });
  const body = (await (await filtered).json()).data as any[];
  expect(body.length).toBeGreaterThan(0);
  for (const p of body) {
    expect(String(p.season).toLowerCase()).toBe(season);
    expect(String(p.year)).toBe(year);
  }
  await expect(page).toHaveURL(new RegExp(`season=${season}`));
  await expect(page).toHaveURL(new RegExp(`year=${year}`));
  await expect(page.getByText(`📅 ${year}`)).toBeVisible();

  await test.step('Browse all clears both filters and reloads the full set', async () => {
    const all = page.waitForResponse((r) => isList(r.url()) && !r.url().includes('season=') && !r.url().includes('year='));
    await page.getByRole('button', { name: 'Browse all' }).click();
    await expect(page.getByText(String(photos.length), { exact: true })).toBeVisible(); // the grid's photo count
    expect(((await (await all).json()).data as any[]).length).toBe(photos.length);
    await expect(page).not.toHaveURL(/season=|year=/);
  });
});

test('gallery: tag filter — any-match semantics, empty state for an unknown tag, chip removal restores the set', async ({ page }) => {
  const { photos } = await loadShowcase(page);
  const tagged = photos.find((p) => (p.tags ?? []).length > 0);

  const addTag = async (tag: string) => {
    await applyFilter(page, async () => {
      await page.getByLabel('Tags').fill(tag);
      await page.getByLabel('Tags').press('Enter');
    });
  };

  await test.step('An unknown tag returns nothing', async () => {
    const res = page.waitForResponse((r) => isList(r.url()) && r.url().includes('tags=e2e-no-such-tag'));
    await addTag('e2e-no-such-tag');
    expect(((await (await res).json()).data as any[]).length).toBe(0);
    await expect(page).toHaveURL(/tags=e2e-no-such-tag/);
    await expect(page.getByText('🏷️ e2e-no-such-tag')).toBeVisible();
    await expect(page.getByText('No photos found')).toBeVisible();
  });

  await test.step('Removing the tag chip restores the unfiltered set', async () => {
    const all = page.waitForResponse((r) => isList(r.url()) && !r.url().includes('tags='));
    await page.getByText('🏷️ e2e-no-such-tag').locator('..').getByRole('button').click();
    expect(((await (await all).json()).data as any[]).length).toBe(photos.length);
  });

  if (tagged) {
    await test.step(`A real tag ("${tagged.tags[0]}") returns only photos carrying it`, async () => {
      const tag = String(tagged.tags[0]);
      const res = page.waitForResponse((r) => isList(r.url()) && r.url().includes(`tags=${encodeURIComponent(tag)}`));
      await addTag(tag);
      const body = (await (await res).json()).data as any[];
      expect(body.length).toBeGreaterThan(0);
      for (const p of body) expect(p.tags).toContain(tag);
    });
  } else {
    test.info().annotations.push({ type: 'note', description: 'no showcase photo carries a tag in this environment; the positive tag match is not exercised' });
  }
});

test('gallery: photo detail — a card opens the lightbox, Close dismisses it; the list API rejects bad sections', async ({ page }) => {
  const { base, photos } = await loadShowcase(page);
  test.skip(photos.length === 0, 'this environment has no showcase photos');

  await test.step('Lightbox opens from the first card and shows the photo', async () => {
    await page.locator('img[alt]').first().waitFor();
    await page.waitForLoadState('networkidle');
    await page.locator('.group.cursor-zoom-in').first().click();
    const lightbox = page.locator('.pswp');
    await expect(lightbox).toBeVisible();
    await expect(lightbox.locator('img').first()).toBeVisible();
    await expect(lightbox).toHaveClass(/pswp--ui-visible/); // opening animation finished
    // PhotoSwipe ignores close while its opening transition runs, so retry the click until it takes.
    await expect(async () => {
      await page.locator('.pswp__button--close').click({ timeout: 2_000 });
      await expect(page.locator('.pswp')).toHaveCount(0, { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
  });

  // KNOWN GAP (flagged to the owner, not filed yet): the handler implements GET /gallery/images/{id} and galleryApi.getPhoto
  // calls it, but the route is not on the API Gateway (403 "Missing Authentication Token" on dev and prod) and no page uses it.
  await test.step('Single-photo route is not exposed (recorded gap); the list route returns only public fields', async () => {
    const res = await page.request.get(`${base}/gallery/images/${photos[0].photo_id}`);
    console.log(`[gallery] GAP GET /gallery/images/{id} -> ${res.status()}`);
    expect(photos[0].cloudfront_url).toBeTruthy();
    expect(Object.keys(photos[0])).not.toContain('is_public'); // internal fields are stripped from the list
  });

  await test.step('Invalid and missing section are 400', async () => {
    expect((await page.request.get(`${base}/gallery/images?section=nope`)).status()).toBe(400);
    expect((await page.request.get(`${base}/gallery/images`)).status()).toBe(400);
  });
});
