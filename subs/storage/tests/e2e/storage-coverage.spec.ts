import { test, expect, SEASON, LOCATION, SIZE } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';
import { createSentinelItem } from '../../../_e2e/shared/entities.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const itemOf = (r: any) => r.data?.item ?? r.body?.data?.item ?? r.data ?? r.body?.data ?? r.body;
const unitsOf = (r: any): any[] => r.data?.storage_units || r.body?.storage_units || [];

test('storage coverage: pack → Item.Packed event → views → edit → Stored → unpack → Item.Unpacked event', async ({ page, storage }) => {
  const { api, marker } = storage;
  const item = await createSentinelItem(api, marker, 'packable');
  const toteName = `${marker} Coverage Tote ${Date.now()}`;
  const renamed = `${toteName} edited`;
  let toteId = '';
  const itemNow = async () => itemOf(await api('GET', `/items/${encodeURIComponent(item.id)}`));

  await test.step('Unpacked view lists the new, unpacked item', async () => {
    await page.goto('/storage/unpacked');
    await expect(page.getByText(item.short_name).first()).toBeVisible();
  });

  await test.step('Create — Tote through the wizard', async () => {
    await page.goto('/storage/create');
    await page.getByTestId('create-type-tote').click();
    await selectOption(page, 'Season', SEASON);
    await selectOption(page, 'Location', LOCATION);
    await page.getByLabel('Short Name').fill(toteName);
    await selectOption(page, 'Size', SIZE);
    await page.getByLabel('General Notes').fill('coverage notes');
    await page.getByTestId('create-review-submit').click();
    await page.getByTestId('create-submit').click();
    await page.waitForURL(/\/storage\/STOR-[^/]+$/);
    toteId = new URL(page.url()).pathname.split('/').pop()!;
    const unit = unitsOf(await api('GET', '/storage')).find((u) => u.id === toteId);
    expect(unit).toMatchObject({ season: SEASON, location: LOCATION, size: SIZE, class_type: 'Tote' });
  });

  await test.step('Pack — the sentinel item through the pack wizard; search narrows the picker', async () => {
    await page.goto(`/storage/pack/${toteId}`);
    await page.getByPlaceholder('Search items…').fill(item.short_name);
    await page.getByTestId(`item-picker-${item.id}`).click();
    await page.getByTestId('pack-tote-save').click();
    await page.waitForURL(`**/storage/${toteId}`);
    await expect(page.getByTestId(`content-item-${item.id}`)).toBeVisible();
  });

  await test.step('EDA — Item.Packed sets is_stored, status Packed and the tote link on the item', async () => {
    await expect.poll(async () => {
      const it = await itemNow();
      return { stored: it?.storage_data?.is_stored, status: it?.status, tote: it?.storage_data?.tote_id };
    }, { timeout: 60_000, intervals: [2_000] }).toEqual({ stored: true, status: 'Packed', tote: toteId });
  });

  await test.step('Unpacked view no longer lists the item', async () => {
    await page.goto('/storage/unpacked');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(item.short_name)).toHaveCount(0);
  });

  await test.step('List — appears by search and filters; excluded by a non-matching filter', async () => {
    const q = encodeURIComponent(toteName);
    await page.goto(`/storage?search=${q}`);
    await expect(page.getByText(toteName).first()).toBeVisible();
    await page.goto(`/storage?search=${q}&location=${encodeURIComponent(LOCATION)}&class_type=Tote&season=${SEASON}`);
    await expect(page.getByText(toteName).first()).toBeVisible();
    await page.goto(`/storage?search=${q}&location=Attic`);
    await expect(page.getByText(toteName)).toHaveCount(0);
    await page.goto(`/storage?search=${q}&class_type=Self`);
    await expect(page.getByText(toteName)).toHaveCount(0);
  });

  await test.step('Statistics page loads and shows storage totals', async () => {
    await page.goto('/statistics');
    await expect(page.getByText('Storage Units', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Items', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Something went wrong|Unable to load|Failed to load/i)).toHaveCount(0);
  });

  await test.step('Edit — rename and move to another location', async () => {
    await page.goto(`/storage/${toteId}/edit`);
    await page.getByLabel('Short Name').fill(renamed);
    await selectOption(page, 'Location', 'Attic');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForURL(`**/storage/${toteId}`);
    const unit = unitsOf(await api('GET', '/storage')).find((u) => u.id === toteId);
    expect(unit.name ?? unit.short_name).toBe(renamed);
    expect(unit.location).toBe('Attic');
    await expect(page.getByText(renamed).first()).toBeVisible();
  });

  await test.step('Packed → Stored; contents are locked while Stored', async () => {
    await page.getByTestId('mark-packed-btn').click();
    await page.getByTestId('confirm-mark-packed').click();
    await expect(page.getByText('Packed', { exact: true })).toBeVisible();
    await page.getByTestId('mark-stored-btn').click();
    await page.getByTestId('confirm-mark-stored').click();
    await expect(page.getByText('Stored', { exact: true })).toBeVisible();
    await expect(page.getByTestId(`remove-item-${item.id}`)).toHaveCount(0);
    await page.getByTestId('mark-packed-btn').click();
    await page.getByTestId('confirm-mark-packed').click();
    await expect(page.getByText('Packed', { exact: true })).toBeVisible();
  });

  await test.step('Unpack — Item.Unpacked resets the item to Ready and not stored', async () => {
    await page.getByTestId(`remove-item-${item.id}`).click();
    await page.getByTestId('confirm-remove-item').click();
    await expect(page.getByTestId(`content-item-${item.id}`)).toHaveCount(0);
    await expect.poll(async () => {
      const it = await itemNow();
      return { stored: it?.storage_data?.is_stored, status: it?.status };
    }, { timeout: 60_000, intervals: [2_000] }).toEqual({ stored: false, status: 'Ready' });
  });

  await test.step('Delete the empty tote', async () => {
    await page.getByTestId('delete-btn').click();
    await page.getByTestId('confirm-delete').click();
    await page.waitForURL('**/storage');
    expect((await api('GET', `/storage/${toteId}`)).status).toBe(404);
  });
});

test('storage coverage: Large & Oversized page lists non-packable items and filters them', async ({ page, storage }) => {
  const { api, marker } = storage;
  const name = `${marker} oversized ${Date.now()}`;
  const res = await api('POST', '/items', {
    type: 'Decoration', category: 'Static Prop', shortName: name, season: 'Christmas', status: 'Ready',
    stakes: '4', tethers: '2', packable: false, singlePacked: false,
  });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBeLessThan(300);

  await page.goto('/storage/non-packable');
  await page.getByPlaceholder('Search items…').fill(name);
  await expect(page.getByText(name).first()).toBeVisible();
  await selectOption(page, 'Season', 'Halloween');
  await expect(page.getByText(name)).toHaveCount(0);
  await selectOption(page, 'Season', 'Christmas');
  await expect(page.getByText(name).first()).toBeVisible();
  await selectOption(page, 'Status', 'Stored');
  await expect(page.getByText(name)).toHaveCount(0);
  await selectOption(page, 'Status', 'Not Stored');
  await expect(page.getByText(name).first()).toBeVisible();

  // The unpacked view is the post-pack audit: it lists every item with is_stored false/absent (operations.py), so an
  // oversized item shows there too even though it can never go in a tote.
  await page.goto('/storage/unpacked');
  await page.getByPlaceholder('Search items…').fill(name);
  await expect(page.getByText(name).first()).toBeVisible();
});

test('storage coverage: supply tote — add supplies, delete is blocked while it has supplies', async ({ page, storage }) => {
  const { api, marker } = storage;
  const name = `${marker} Supply Tote ${Date.now()}`;
  let id = '';
  const unitNow = async () => unitsOf(await api('GET', '/storage')).find((u) => u.id === id);

  await test.step('Create — Supplies tote through the wizard', async () => {
    await page.goto('/storage/create');
    await page.getByTestId('create-type-tote').click();
    await page.getByText('Supplies', { exact: true }).click();
    await selectOption(page, 'Season', SEASON);
    await selectOption(page, 'Location', LOCATION);
    await page.getByLabel('Short Name').fill(name);
    await selectOption(page, 'Size', SIZE);
    await page.getByTestId('create-review-submit').click();
    await page.getByTestId('create-submit').click();
    await page.waitForURL(/\/storage\/STOR-[^/]+$/);
    id = new URL(page.url()).pathname.split('/').pop()!;
    expect((await unitNow()).is_supply_tote).toBe(true);
    await expect(page.getByText('Supply Tote', { exact: true })).toBeVisible();
  });

  await test.step('Add a supply and save', async () => {
    await page.getByRole('button', { name: /Add/ }).first().click();
    await page.getByLabel('Name').last().fill('E2E zip ties');
    await page.getByLabel('Quantity').last().fill('50');
    await page.getByRole('button', { name: 'Save Supplies' }).click();
    await expect.poll(async () => JSON.stringify((await unitNow())?.supplies ?? (await unitNow())?.supply_list ?? ''), { timeout: 15_000 }).toContain('E2E zip ties');
  });

  await test.step('Delete is blocked while supplies remain; removing them allows it', async () => {
    await page.getByTestId('delete-btn').click();
    await page.getByTestId('confirm-delete').click();
    await expect(page.getByText(/Cannot delete a supply tote with supplies/)).toBeVisible();
    expect(await unitNow()).toBeTruthy();

    await page.getByRole('button', { name: 'Remove supply' }).click();
    await page.getByRole('button', { name: 'Save Supplies' }).click();
    await page.waitForTimeout(500);
    await page.getByTestId('delete-btn').click();
    await page.getByTestId('confirm-delete').click();
    await page.waitForURL('**/storage');
    expect((await api('GET', `/storage/${id}`)).status).toBe(404);
  });
});

test('storage coverage: Self-contained unit created through the wizard holds its item', async ({ page, storage }) => {
  const { api, marker } = storage;
  const item = await createSentinelItem(api, marker, 'self');
  const name = `${marker} Self ${Date.now()}`;

  await page.goto('/storage/create');
  await page.getByTestId('create-type-self').click();
  await selectOption(page, 'Season', SEASON);
  await selectOption(page, 'Item', new RegExp(`${item.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)$`));
  await selectOption(page, 'Location', LOCATION);
  await page.getByLabel('Short Name').fill(name);
  await page.getByTestId('create-review-submit').click();
  await page.getByTestId('create-submit').click();
  await page.waitForURL(/\/storage\/STOR-SELF-[^/]+$/);
  const id = new URL(page.url()).pathname.split('/').pop()!;

  const unit = unitsOf(await api('GET', '/storage')).find((u) => u.id === id);
  expect(unit).toMatchObject({ class_type: 'Self', location: LOCATION });
  expect(unit.contents ?? [unit.item_id]).toContain(item.id);
  await expect(page.getByTestId(`content-item-${item.id}`)).toBeVisible();
});
