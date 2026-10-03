import type { Page } from '@playwright/test';
import { test, expect, SEASON, LOCATION, SIZE } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

/**
 * Selects a HeroUI/react-aria `<Select>` option. Opening a second Select before the
 * first one's popover has finished closing was observed to make the new option node
 * detach mid-click (the two portal-rendered popovers fight over the same layer), so
 * this explicitly waits for the popover to close before returning — the next
 * `selectOption` call then opens onto a clean slate.
 */
async function selectOption(page: Page, label: string, value: string) {
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
  const option = page.getByRole('option', { name: value, exact: true });
  await option.click();
  await expect(option).toBeHidden();
}

// Storage's Playwright spec (#589), mirroring subs/deployments' deployment-lifecycle.spec.ts
// (#554). One sequential test, not independent tests per phase — each phase depends on
// state the browser itself created in the previous one (a fresh tote, a packed item),
// same rationale as deployments.
test.use({ storageState: STORAGE_STATE_PATH });

test('storage lifecycle: create → pack → mark packed → mark stored → unpack → delete', async ({
  page,
  storage,
}) => {
  const { api } = storage;
  const name = `${storage.marker} Playwright Tote`;
  let storageId = '';

  await test.step('Create — create a Tote through the UI (CreateWizardPage)', async () => {
    await page.goto('/storage/create');
    await page.getByTestId('create-type-tote').click();

    await selectOption(page, 'Season', SEASON);
    await selectOption(page, 'Location', LOCATION);
    await page.getByLabel('Short Name').fill(name);
    await selectOption(page, 'Size', SIZE);

    await page.getByTestId('create-review-submit').click();
    await page.getByTestId('create-submit').click();

    await page.waitForURL(/\/storage\/STOR-[^/]+$/);
    storageId = new URL(page.url()).pathname.split('/').pop()!;

    const res = await api('GET', `/storage/${storageId}`);
    expect(res.status).toBe(200);
  });

  let itemId = '';

  await test.step('Pack — pack one real unpacked item into the tote (PackWizardPage)', async () => {
    const itemsRes = await api('GET', '/items?unpacked=true');
    const items: { id: string; class?: string; class_type?: string; storage_data?: any }[] =
      itemsRes.data?.items || itemsRes.body?.items || [];
    const candidate = items.find((i) => {
      if (i.class === 'Deployment' || i.class === 'Storage' || i.class_type === 'Receptacle') return false;
      const sd = i.storage_data || {};
      return sd.packable !== false && sd.is_stored === false && sd.single_packed !== true;
    });
    test.skip(!candidate, 'dev has no packable unpacked item available — fixture gap, not a #589 regression');
    itemId = candidate!.id;

    await page.goto(`/storage/pack/${storageId}`);
    await page.getByTestId(`item-picker-${itemId}`).click();
    await page.getByTestId('pack-tote-save').click();

    await page.waitForURL(`**/storage/${storageId}`);
    await expect(page.getByTestId(`content-item-${itemId}`)).toBeVisible();
  });

  await test.step('Mark as Packed', async () => {
    await page.getByTestId('mark-packed-btn').click();
    await page.getByTestId('confirm-mark-packed').click();
    await expect(page.getByText('Packed', { exact: true })).toBeVisible();
  });

  await test.step('Mark as Stored', async () => {
    await page.getByTestId('mark-stored-btn').click();
    await page.getByTestId('confirm-mark-stored').click();
    await expect(page.getByText('Stored', { exact: true })).toBeVisible();
  });

  await test.step('Unpack — remove the item from the tote', async () => {
    await page.getByTestId(`remove-item-${itemId}`).click();
    await page.getByTestId('confirm-remove-item').click();
    await expect(page.getByTestId(`content-item-${itemId}`)).toHaveCount(0);

    const itemRes = await api('GET', `/items/${itemId}`);
    const item = itemRes.data ?? itemRes.body;
    expect(item?.storage_data?.is_stored ?? false).toBe(false);
  });

  await test.step('Delete — delete the (now-empty) tote', async () => {
    await page.getByTestId('delete-btn').click();
    await page.getByTestId('confirm-delete').click();
    await page.waitForURL('**/storage');

    const res = await api('GET', `/storage/${storageId}`);
    expect(res.status).toBe(404);
  });
});
