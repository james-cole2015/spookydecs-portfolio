import { test, expect, sentinelName } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';
import { findSentinelAcquisitions } from '../shared/sentinel.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const asList = (res: any) => {
  const d = res.data ?? res.body?.data ?? res.body;
  return Array.isArray(d) ? d : d?.costs || d?.items || [];
};

test('acquisitions: create → list → edit → pass / reconsider → purchase wizard → item + finance cost → delete', async ({ page, ideas }) => {
  const { api } = ideas;
  const title = sentinelName('Acquisition');
  const editedTitle = `${title} (edited)`;
  let id = '';
  const find = async () => (await findSentinelAcquisitions(api)).find((a: any) => a.acquisition_id === id);

  await test.step('Create — manual form', async () => {
    await page.goto('/acquisitions/create');
    await page.getByLabel('Title').fill(title);
    await selectOption(page, 'Season', 'Halloween');
    await page.getByLabel('Price ($)').fill('19.99');
    await page.getByLabel('Retailer').fill('E2E Mart');
    await page.getByLabel('Product URL').fill('https://example.com/e2e-acquisition');
    await selectOption(page, 'Priority', 'Nice-to-have');
    await page.getByLabel('Description').fill('Created by the #623 e2e suite; safe to delete.');
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/acquisitions$/.test(r.url()));
    await page.getByRole('button', { name: 'Create Acquisition' }).click();
    expect((await posted).status()).toBeLessThan(300);
    await page.waitForURL(/\/acquisitions\/[^/]+$/, { timeout: 15_000 });
    const found = (await findSentinelAcquisitions(api)).find((a: any) => a.title === title);
    expect(found, 'created acquisition present via API').toBeTruthy();
    id = found.acquisition_id;
    expect(found).toMatchObject({ season: 'Halloween', status: 'Considering', retailer: 'E2E Mart', priority: 'Nice-to-have' });
    expect(Number(found.price)).toBeCloseTo(19.99, 2);
  });

  await test.step('List — card renders and search finds it', async () => {
    await page.goto('/acquisitions');
    await expect(page.getByText(title).first()).toBeVisible();
    await page.goto(`/acquisitions?search=${encodeURIComponent(title)}`);
    await expect(page.getByText(title).first()).toBeVisible();
    await page.goto('/acquisitions?search=zzz-no-such-acquisition-zzz');
    await expect(page.getByText('No acquisitions found')).toBeVisible();
  });

  await test.step('Edit — title and notes persist', async () => {
    await page.goto(`/acquisitions/${id}/edit`);
    await page.getByLabel('Title').fill(editedTitle);
    await page.getByPlaceholder('Internal notes, sizing, alternatives…').fill('e2e note');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForURL(new RegExp(`/acquisitions/${id}$`), { timeout: 15_000 });
    await expect.poll(async () => (await find())?.title).toBe(editedTitle);
    expect((await find()).notes).toBe('e2e note');
    await expect(page.getByText(editedTitle).first()).toBeVisible();
  });

  await test.step('Mark Passed, then back to Considering', async () => {
    await page.getByRole('button', { name: 'Mark Passed' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Mark Passed' }).click();
    await expect.poll(async () => (await find())?.status).toBe('Passed');
    await page.getByRole('button', { name: /Back to Considering|Reconsider/ }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Back to Considering|Reconsider/ }).click();
    await expect.poll(async () => (await find())?.status).toBe('Considering');
  });

  let itemId = '';
  await test.step('Purchase wizard — item created, acquisition Purchased', async () => {
    await page.reload();
    await page.getByRole('button', { name: 'Purchase', exact: true }).click();
    const wizard = page.getByRole('dialog');
    await selectOption(page, 'Class', 'Decoration');
    await selectOption(page, 'Type', 'Static Prop');
    await wizard.getByLabel('Tethers').fill('2');
    await wizard.getByLabel('Stakes').fill('4');
    await wizard.getByRole('button', { name: /Next/ }).click();
    await expect(wizard.getByLabel('Price ($)')).toHaveValue('19.99');
    await wizard.getByRole('checkbox', { name: /Gift \/ no receipt/ }).check();
    await wizard.getByRole('button', { name: /Review/ }).click();
    await expect(wizard.getByText('Decoration / Static Prop')).toBeVisible();
    await wizard.getByRole('button', { name: 'Complete Purchase' }).click();
    await expect(wizard.getByText('Purchase Complete!')).toBeVisible({ timeout: 30_000 });
    await wizard.getByRole('button', { name: 'Done' }).click();
    await expect.poll(async () => (await find())?.status).toBe('Purchased');
    const items = asList(await api('GET', '/items')).filter((i: any) => i.acquisition_data?.related_acquisition_id === id);
    expect(items.length, 'item linked to the acquisition').toBe(1);
    itemId = items[0].id;
    expect(items[0].short_name).toBe(editedTitle);
  });

  await test.step('Acquisition → Finance: acq-buy cost row at the purchase total', async () => {
    const costId = `acq-buy-${id}`;
    await expect
      .poll(async () => asList(await api('GET', '/finance/costs')).find((c: any) => c.cost_id === costId), { timeout: 60_000, intervals: [2_000] })
      .toBeTruthy();
    const cost = asList(await api('GET', '/finance/costs')).find((c: any) => c.cost_id === costId);
    expect(cost).toMatchObject({ cost_type: 'acquisition', related_item_id: itemId, related_acquisition_id: id });
    expect(Number(cost.total_cost)).toBeCloseTo(19.99, 2);
  });

  await test.step('Purchased acquisition is locked (no Edit button) and hidden from the active list', async () => {
    await page.goto(`/acquisitions/${id}`);
    await expect(page.getByText(/Purchased/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
    await page.goto(`/acquisitions?search=${encodeURIComponent(editedTitle)}`);
    await expect(page.getByText('No acquisitions found')).toBeVisible();
    await page.goto(`/acquisitions?status=Purchased&search=${encodeURIComponent(editedTitle)}`);
    await expect(page.getByText(editedTitle).first()).toBeVisible();
  });

  await test.step('Delete — a Considering acquisition deletes from its detail page', async () => {
    // The purchased one is swept by the fixture; exercise the UI delete on a fresh record.
    const throwaway = sentinelName('Acquisition delete');
    const res = await api('POST', '/acquisitions', { title: throwaway, season: 'Halloween', status: 'Considering' });
    expect(res.status).toBeLessThan(300);
    const created = (await findSentinelAcquisitions(api)).find((a: any) => a.title === throwaway);
    expect(created).toBeTruthy();
    await page.goto(`/acquisitions/${created.acquisition_id}`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL(/\/acquisitions$/, { timeout: 15_000 });
    await expect.poll(async () => (await findSentinelAcquisitions(api)).some((a: any) => a.title === throwaway)).toBe(false);
  });
});
