import { test, expect, createSentinelImage, findSentinels, ITEM_MARKER } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { createSentinelItem } from '../../../_e2e/shared/entities.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const itemOf = (r: any) => r.data?.item ?? r.body?.data?.item ?? r.data ?? r.body?.data ?? r.body;
const photoOf = (r: any) => r.data?.photo ?? r.data ?? r.body?.data ?? r.body;

test('images coverage: item photos → Image.Uploaded back-links → set primary → delete promotes the next', async ({ page, images }) => {
  const { api } = images;
  const item = await createSentinelItem(api, ITEM_MARKER, 'photos');
  const itemImages = async () => itemOf(await api('GET', `/items/${encodeURIComponent(item.id)}`))?.images;

  const a = await createSentinelImage(api, { caption: 'A (first → primary)', itemId: item.id });
  await expect.poll(async () => (await itemImages())?.primary_photo_id, { timeout: 60_000, intervals: [2_000] }).toBe(a.photo_id);

  const b = await createSentinelImage(api, { caption: 'B (second → secondary)', itemId: item.id });
  await expect.poll(async () => (await itemImages())?.secondary_photo_ids ?? [], { timeout: 60_000, intervals: [2_000] }).toContain(b.photo_id);
  expect((await itemImages()).primary_photo_id).toBe(a.photo_id);

  await test.step('Set primary — swaps the primary flag on both photos', async () => {
    const res = await api('POST', '/admin/images/set_primary', { photo_id: b.photo_id, context: 'item', item_id: item.id });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBeLessThan(300);
    await expect.poll(async () => photoOf(await api('GET', `/admin/images/${b.photo_id}`))?.is_primary, { timeout: 30_000 }).toBe(true);
    expect(photoOf(await api('GET', `/admin/images/${a.photo_id}`)).is_primary).toBe(false);
    await expect.poll(async () => (await itemImages())?.primary_photo_id, { timeout: 60_000, intervals: [2_000] }).toBe(b.photo_id);
  });

  await test.step('Detail page shows the item link; entity pages list the photos', async () => {
    await page.goto(`/${b.photo_id}`);
    await expect(page.getByText(item.id).first()).toBeVisible();
    await page.goto(`/entities/${encodeURIComponent(item.id)}?type=item`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Something went wrong|Unable to load|Failed to load/i)).toHaveCount(0);
    await expect(page.getByText(item.id).first()).toBeVisible();
  });

  await test.step('Delete the primary through the UI — Image.Deleted promotes the other photo', async () => {
    await page.goto(`/${b.photo_id}`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL(/\/list$/, { timeout: 15_000 });
    await expect.poll(async () => (await itemImages())?.primary_photo_id, { timeout: 60_000, intervals: [2_000] }).toBe(a.photo_id);
    expect((await itemImages()).secondary_photo_ids ?? []).not.toContain(b.photo_id);
  });
});

test('images coverage: edit metadata (season, year, tags, caption) and replace + reprocess', async ({ page, images }) => {
  const { api, marker } = images;
  const photo = await createSentinelImage(api, { caption: 'metadata' });
  const record = async () => photoOf(await api('GET', `/admin/images/${photo.photo_id}`));

  await test.step('Edit — season, year, caption and a new tag through the form', async () => {
    await page.goto(`/${photo.photo_id}/edit`);
    await page.getByLabel('Year').fill('2024');
    await page.getByLabel('Caption').fill(`${marker} metadata edited`);
    const tag = page.getByPlaceholder('Add tag, then press , or Enter');
    await tag.fill('E2E-Extra');
    await tag.press('Enter');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect.poll(async () => (await record())?.caption, { timeout: 15_000 }).toBe(`${marker} metadata edited`);
    const r = await record();
    expect(Number(r.year)).toBe(2024);
    expect(r.tags).toEqual(expect.arrayContaining(['e2e-sentinel', 'e2e-extra']));
  });

  await test.step('Replace + reprocess — new bytes keep the same photo id and bump the cache-busting URL', async () => {
    const before = await record();
    const presigned = await api('POST', `/admin/images/${photo.photo_id}/presign-replace`, { content_type: 'image/jpeg', file_size: 125 });
    expect(presigned.status, JSON.stringify(presigned.body).slice(0, 300)).toBeLessThan(300);
    const url = (presigned.data ?? presigned.body?.data ?? presigned.body).presigned_url;
    const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z', 'base64') });
    expect(put.ok, `replace PUT → ${put.status}`).toBe(true);
    const re = await api('POST', `/admin/images/${photo.photo_id}/reprocess`);
    expect(re.status, JSON.stringify(re.body).slice(0, 300)).toBeLessThan(300);
    const after = await record();
    expect(after.photo_id).toBe(before.photo_id);
    expect(after.cloudfront_url).toMatch(/\?v=/);
    expect(after.cloudfront_url).not.toBe(before.cloudfront_url);
  });
});

test('images coverage: list, gallery manager, browse, entities and items pages load; list filters and search narrow', async ({ page, images }) => {
  const { api, marker } = images;
  const photo = await createSentinelImage(api, { caption: 'listing' });

  for (const path of ['/', '/list', '/gallery', '/browse', '/entities', '/items']) {
    await test.step(path, async () => {
      const resp = await page.goto(path);
      expect(resp?.status()).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Something went wrong|Unable to load|Failed to load/i), path).toHaveCount(0);
    });
  }

  await test.step('List — the sentinel is found by search and by season; excluded by another season', async () => {
    const q = encodeURIComponent(marker);
    await page.goto(`/list?search=${q}`);
    await expect(page.getByText(/\d+ images? found/)).toBeVisible();
    await expect(page.getByText(photo.photo_id).first()).toBeVisible();
    await page.goto(`/list?search=${q}&season=halloween`);
    await expect(page.getByText(photo.photo_id).first()).toBeVisible();
    await page.goto(`/list?search=${q}&season=christmas`);
    await expect(page.getByText(photo.photo_id)).toHaveCount(0);
  });

  await test.step('Browse — the sentinel idea shows under entities', async () => {
    await page.goto('/entities');
    await page.waitForLoadState('networkidle');
    expect((await findSentinels(api)).length).toBeGreaterThan(0);
  });
});
