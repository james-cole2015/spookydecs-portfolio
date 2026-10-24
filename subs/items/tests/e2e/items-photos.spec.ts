import { test, expect } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { createSentinelItem } from '../../../_e2e/shared/entities.mjs';
import { remainingObjects } from '../../../_e2e/shared/s3.mjs';
import { IMG } from '../../../images/tests/shared/sentinel.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const itemOf = (r: any) => r.data?.item ?? r.body?.data?.item ?? r.data ?? r.body?.data ?? r.body;
const photosOf = (r: any): any[] => {
  const d = r.data ?? r.body?.data ?? r.body;
  return d?.photos || d?.images || (Array.isArray(d) ? d : []);
};

test('items photos: upload through the detail page → back-link → set primary → cascade delete leaves no S3 objects (#655)', async ({ page, items }) => {
  test.setTimeout(180_000);
  const { api, marker } = items;
  const item = await createSentinelItem(api, marker, 'photos');
  const enc = encodeURIComponent(item.id);
  const itemImages = async () => itemOf(await api('GET', `/items/${enc}`))?.images;
  const listPhotos = async () => photosOf(await api('GET', `/admin/images?item_id=${enc}`));

  /** Shared upload flow: trigger → picker dialog (file input) → Continue → editor ("Use original") → upload. */
  const upload = async (label: string, trigger: 'section' | 'gallery') => {
    if (trigger === 'section') await page.getByRole('button', { name: '+ Upload' }).click();
    else await page.getByRole('button', { name: '+ Add Photos' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="file"]').setInputFiles({ name: `${label}.jpg`, mimeType: 'image/jpeg', buffer: IMG });
    await dialog.getByRole('button', { name: /^Continue/ }).click();
    await page.getByRole('button', { name: 'Use original' }).click();
  };

  await test.step('Upload — first photo through "+ Upload" becomes the primary (Image.Uploaded → item.images)', async () => {
    await page.goto(`/${enc}`);
    await upload('first', 'section');
    await expect.poll(async () => (await listPhotos()).length, { timeout: 60_000, intervals: [2_000] }).toBe(1);
    const [first] = await listPhotos();
    await expect.poll(async () => (await itemImages())?.primary_photo_id, { timeout: 60_000, intervals: [2_000] }).toBe(first.photo_id);
  });

  await test.step('Upload — second photo through the gallery is secondary; Set as Primary swaps them', async () => {
    await page.reload();
    await upload('second', 'gallery');
    await expect.poll(async () => (await listPhotos()).length, { timeout: 60_000, intervals: [2_000] }).toBe(2);
    const primaryBefore = (await itemImages()).primary_photo_id;
    const second = (await listPhotos()).find((p) => p.photo_id !== primaryBefore);
    await expect.poll(async () => (await itemImages())?.secondary_photo_ids ?? [], { timeout: 60_000, intervals: [2_000] }).toContain(second.photo_id);

    await page.reload();
    await page.getByRole('button', { name: 'Set as Primary' }).first().click();
    await expect.poll(async () => (await itemImages())?.primary_photo_id, { timeout: 60_000, intervals: [2_000] }).toBe(second.photo_id);
  });

  await test.step('Cascade delete with photos attached leaves no S3 objects behind', async () => {
    const photos = await listPhotos();
    expect(photos.length).toBe(2);
    await page.reload();
    await page.getByTestId('item-actions-menu').click();
    await page.getByRole('menuitem', { name: /Delete \(Cascade\)/ }).click();
    await page.getByRole('button', { name: 'Delete Everything' }).click();
    await expect.poll(async () => (await api('GET', `/items/${enc}`)).status, { timeout: 30_000 }).toBe(404);
    await expect.poll(async () => (await listPhotos()).length, { timeout: 30_000 }).toBe(0);
    for (const p of photos) {
      const left = remainingObjects(p);
      if (left === null) { test.info().annotations.push({ type: 'note', description: 'aws CLI unavailable — S3 not checked' }); break; }
      expect(left, `objects left for ${p.photo_id}`).toEqual([]);
    }
  });
});
