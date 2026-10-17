import { test, expect, SEASON, LOCATION, SIZE } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { remainingObjects } from '../../../_e2e/shared/s3.mjs';
import { IMG } from '../../../images/tests/shared/sentinel.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const unitOf = (r: any) => r.data?.storage_unit ?? r.body?.data?.storage_unit ?? r.data ?? r.body?.data ?? r.body;
const photosOf = (r: any): any[] => {
  const d = r.data ?? r.body?.data ?? r.body;
  return d?.photos || d?.images || (Array.isArray(d) ? d : []);
};

test('storage photos: upload (max 2) → back-link → set primary → deleting the unit leaves no S3 objects (#655)', async ({ page, storage }) => {
  test.setTimeout(180_000);
  const { api, marker } = storage;
  const name = `${marker} Photo Tote ${Date.now()}`;
  const created = await api('POST', '/storage/totes', { season: SEASON, location: LOCATION, name, size: SIZE, general_notes: '', is_supply_tote: false });
  expect(created.status, JSON.stringify(created.body).slice(0, 300)).toBeLessThan(300);
  const id = (unitOf(created) as any).id;
  const listPhotos = async () => photosOf(await api('GET', `/admin/images?storage_id=${encodeURIComponent(id)}`));
  const unitImages = async () => (unitOf(await api('GET', `/storage/${id}`)) as any)?.images;

  /** Shared upload flow: trigger → picker dialog (file input) → Continue → editor ("Use original") → upload. */
  const upload = async (label: string) => {
    await page.getByRole('button', { name: '+ Add Photos' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="file"]').setInputFiles({ name: `${label}.jpg`, mimeType: 'image/jpeg', buffer: IMG });
    await dialog.getByRole('button', { name: /^Continue/ }).click();
    await page.getByRole('button', { name: 'Use original' }).click();
  };

  await test.step('Upload — first photo becomes the primary (Image.Uploaded → unit.images)', async () => {
    await page.goto(`/storage/${id}`);
    await upload('first');
    await expect.poll(async () => (await listPhotos()).length, { timeout: 60_000, intervals: [2_000] }).toBe(1);
    const [first] = await listPhotos();
    expect(first).toMatchObject({ storage_id: id });
    await expect.poll(async () => (await unitImages())?.primary_photo_id, { timeout: 60_000, intervals: [2_000] }).toBe(first.photo_id);
  });

  await test.step('Upload — second photo is secondary; the unit is at its 2-photo limit', async () => {
    await page.reload();
    await upload('second');
    await expect.poll(async () => (await listPhotos()).length, { timeout: 60_000, intervals: [2_000] }).toBe(2);
    await page.reload();
    await expect(page.getByRole('button', { name: '+ Add Photos' })).toHaveCount(0);
  });

  await test.step('Set as Primary swaps the primary photo', async () => {
    const primaryBefore = (await unitImages()).primary_photo_id;
    const other = (await listPhotos()).find((p) => p.photo_id !== primaryBefore);
    await page.getByRole('button', { name: 'Set as Primary' }).first().click();
    await expect.poll(async () => (await unitImages())?.primary_photo_id, { timeout: 60_000, intervals: [2_000] }).toBe(other.photo_id);
  });

  await test.step('Delete the unit — photo records and every S3 object (incl. generated thumbnails) go with it', async () => {
    const photos = await listPhotos();
    expect(photos.length).toBe(2);
    await page.getByTestId('delete-btn').click();
    await page.getByTestId('confirm-delete').click();
    await page.waitForURL('**/storage');
    expect((await api('GET', `/storage/${id}`)).status).toBe(404);
    await expect.poll(async () => (await listPhotos()).length, { timeout: 30_000 }).toBe(0);
    for (const p of photos) {
      const left = remainingObjects(p);
      if (left === null) { test.info().annotations.push({ type: 'note', description: 'aws CLI unavailable — S3 not checked' }); break; }
      expect(left, `objects left for ${p.photo_id}`).toEqual([]);
    }
  });
});
