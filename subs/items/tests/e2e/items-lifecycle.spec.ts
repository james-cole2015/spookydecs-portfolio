import type { Page } from '@playwright/test';
import { test, expect, sentinelName, SEASON } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';

/** Drives the 4-step create wizard to the Review step, then saves. Class/type are picked by visible name. */
async function createViaWizard(page: Page, opts: { cls: string; type: string; name: string; packMode?: string; location?: string }) {
  await page.goto('/create');
  await page.getByRole('button', { name: opts.cls, exact: false }).first().click();
  await page.getByRole('button', { name: opts.type, exact: false }).first().click();
  await page.getByLabel('Item Name').fill(opts.name);
  await selectOption(page, 'Season', SEASON);
  // Required Decoration fields (stakes/tethers) — the wizard enforces them inline (#647).
  await page.getByLabel('Stakes').fill('4');
  await page.getByLabel('Tethers').fill('2');
  if (opts.packMode) {
    await selectOption(page, 'Pack Mode', opts.packMode);
    if (opts.location) await selectOption(page, 'Storage Location', opts.location);
  }
  await page.getByRole('button', { name: /Review/ }).click();
  const created = page.waitForResponse((r) => r.url().endsWith('/items') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Save Item/ }).click();
  const res = await created;
  expect(res.status(), `POST /items → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
  await page.waitForURL(/\/items$/);
}

async function findByName(api: any, name: string) {
  const res = await api('GET', '/items');
  const list: any[] = res.data?.items || res.body?.items || [];
  return list.find((i) => i.short_name === name);
}

test.use({ storageState: STORAGE_STATE_PATH });

// One sequential test per journey: each phase depends on the record the previous one created.
test('items lifecycle: create (Tote-packed) → edit → cascade delete', async ({ page, items }) => {
  const { api } = items;
  const name = sentinelName('Static Prop');
  const edited = `${name} edited`;
  let id = '';

  await test.step('Create — Static Prop through the wizard', async () => {
    await createViaWizard(page, { cls: 'Decoration', type: 'Static Prop', name });
    const rec = await findByName(api, name);
    expect(rec, 'created item present via API').toBeTruthy();
    id = rec.id;
    expect(rec.season).toBe(SEASON);
  });

  await test.step('Edit — rename through EditPage, verify persisted', async () => {
    await page.goto(`/${id}/edit`);
    await page.getByLabel('Item Name').fill(edited);
    await page.getByRole('button', { name: /Save|Update/ }).first().click();
    await expect.poll(async () => (await api('GET', `/items/${id}`)).data?.short_name
      ?? (await api('GET', `/items/${id}`)).body?.short_name, { timeout: 15_000 }).toBe(edited);
  });

  await test.step('Delete — cascade delete from DetailPage', async () => {
    await page.goto(`/${id}`);
    await page.getByTestId('item-actions-menu').click();
    await page.getByRole('menuitem', { name: /Delete \(Cascade\)/ }).click();
    await page.getByRole('button', { name: 'Delete Everything' }).click();
    await expect.poll(async () => (await api('GET', `/items/${id}`)).status, { timeout: 15_000 }).toBe(404);
  });
});

// Cascade delete leaves the item's Self unit behind (contents still lists the deleted item); #646 makes
// such an orphaned Self unit deletable, so the test removes it to leave no STOR-SELF-* record on dev.
test('items lifecycle: Single-packed requires a location and auto-creates a Self unit (#632/#637)', async ({ page, items }) => {
  const { api } = items;
  const name = sentinelName('Single');
  let id = '';
  let selfId = '';

  await test.step('Create — Single-packed with a location', async () => {
    await createViaWizard(page, { cls: 'Decoration', type: 'Static Prop', name, packMode: 'Single-packed', location: 'Shed' });
    const rec = await findByName(api, name);
    expect(rec).toBeTruthy();
    id = rec.id;
    expect(rec.storage_data?.single_packed).toBe(true);
  });

  await test.step('EDA — Item.PackingRequested → Self unit created', async () => {
    await expect.poll(async () => {
      const res = await api('GET', '/storage');
      const units: any[] = res.data?.storage_units || res.body?.storage_units || [];
      selfId = units.find((u) => u.class_type === 'Self' && (u.contents || []).includes(id))?.id || '';
      return !!selfId;
    }, { timeout: 30_000, intervals: [1000, 2000, 3000] }).toBe(true);
  });

  await test.step('Cleanup — cascade delete the item, then delete its orphaned Self unit (#646)', async () => {
    expect((await api('DELETE', `/items/${id}/cascade`)).status).toBe(200);
    expect((await api('DELETE', `/storage/${selfId}`)).status).toBe(200);
    expect((await api('GET', '/storage')).data?.storage_units?.some((u: any) => u.id === selfId) ?? false).toBe(false);
  });
});
