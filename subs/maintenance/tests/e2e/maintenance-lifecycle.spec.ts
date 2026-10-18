import { test, expect, createSentinelItem } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';

/** Polls the sentinel item until `maintenance.repair_data.needs_repair` and `operational_status` match. */
async function expectItemRepairState(api: any, itemId: string, needsRepair: boolean, operational: boolean) {
  await expect.poll(async () => {
    const res = await api('GET', `/items/${itemId}`);
    const it = res.data?.item ?? res.data ?? res.body;
    return { needs_repair: it?.maintenance?.repair_data?.needs_repair, operational_status: it?.operational_status };
  }, { timeout: 45_000, intervals: [1000, 2000, 3000, 5000], message: 'maintenance → items consumer should land the downstream write' })
    .toEqual({ needs_repair: needsRepair, operational_status: operational });
}


test.use({ storageState: STORAGE_STATE_PATH });

// Sequential: each phase depends on the record the previous one created.
test('maintenance lifecycle: create repair → perform repair → item updated (EDA) → delete record', async ({ page, maint }) => {
  const { api } = maint;
  const item = await createSentinelItem(api, 'repair');
  const title = `E2E repair ${Date.now()}`;
  let recordId = '';

  await test.step('Create — repair record for the sentinel item through RecordFormPage', async () => {
    await page.goto(`/create?item_id=${item.id}`);
    await selectOption(page, 'Record Type', /^Repair$/);
    await selectOption(page, 'Category', /^Replacement$/);
    await selectOption(page, 'Status', /^Scheduled$/);
    await page.getByLabel('Title').fill(title);
    await selectOption(page, 'Criticality', /^Critical$/);
    await page.getByLabel('Performed By').fill('e2e-suite');
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/admin\/maintenance-records$/.test(r.url()));
    await page.getByRole('button', { name: /Create|Save/ }).last().click();
    const res = await posted;
    expect(res.status(), `POST record → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
    await page.waitForURL(new RegExp(`/${item.id}/[^/]+$`), { timeout: 15_000 });
    recordId = new URL(page.url()).pathname.split('/').pop()!;
    const rec = await api('GET', `/admin/maintenance-records/${recordId}`);
    const body = rec.data?.record ?? rec.data ?? rec.body;
    expect(body.title).toBe(title);
    expect(body.status).toBe('scheduled');
  });

  await test.step('EDA — RepairRecord.Created (critical) marks the item needs_repair and not operational', async () => {
    await expectItemRepairState(api, item.id, true, false);
  });

  await test.step('Perform — complete the repair through RepairFormPage', async () => {
    await page.goto(`/${item.id}/${recordId}/perform-repair`);
    await page.getByLabel('Performed By').fill('e2e-suite');
    await page.getByLabel('Date Performed').fill(new Date().toISOString().slice(0, 10));
    await page.getByLabel('Repair Notes').fill('Replaced the sentinel widget.');
    await page.getByRole('button', { name: /Complete|Submit|Save/ }).last().click();
    await expect(page.getByText('Repair Completed Successfully')).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => {
      const rec = await api('GET', `/admin/maintenance-records/${recordId}`);
      return (rec.data?.record ?? rec.data ?? rec.body)?.status;
    }, { timeout: 15_000 }).toBe('completed');
  });

  await test.step('EDA — Repair.Completed clears needs_repair and restores operational_status', async () => {
    await expectItemRepairState(api, item.id, false, true);
  });

  await test.step('Delete — remove the record from RecordDetailPage', async () => {
    await page.goto(`/${item.id}/${recordId}`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(async () => (await api('GET', `/admin/maintenance-records/${recordId}`)).status, { timeout: 15_000 }).toBe(404);
  });
});

/** Creates an open critical repair through the API and waits for the items consumer to flag the item. */
async function createFlaggedRepair(api: any, itemId: string, title: string): Promise<string> {
  const res = await api('POST', '/admin/maintenance-records', {
    item_id: itemId, record_type: 'repair', category: 'replacement', status: 'scheduled',
    criticality: 'critical', title, performed_by: 'e2e-suite',
  });
  const rec = res.data?.record ?? res.data ?? res.body;
  expect(res.status, `POST record → ${JSON.stringify(res.body).slice(0, 300)}`).toBeLessThan(300);
  await expectItemRepairState(api, itemId, true, false);
  return rec.record_id;
}

// #668: the generic edit and delete paths must release the item, not just perform-repair.
test('maintenance: completing a repair through the generic edit form clears the item flag (EDA)', async ({ page, maint }) => {
  const { api } = maint;
  const item = await createSentinelItem(api, 'repair-edit');
  const recordId = await createFlaggedRepair(api, item.id, `E2E repair edit ${Date.now()}`);

  await page.goto(`/${item.id}/${recordId}/edit`);
  await selectOption(page, 'Status', /^Completed$/);
  await page.getByLabel(/Date Performed/).fill(new Date().toISOString().slice(0, 10));
  const put = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/admin/maintenance-records/${recordId}`));
  await page.getByRole('button', { name: /Update|Save/ }).last().click();
  expect((await put).status()).toBeLessThan(300);

  await expectItemRepairState(api, item.id, false, true);
});

test('maintenance: deleting an open repair clears the item flag (EDA)', async ({ page, maint }) => {
  const { api } = maint;
  const item = await createSentinelItem(api, 'repair-delete');
  const recordId = await createFlaggedRepair(api, item.id, `E2E repair delete ${Date.now()}`);

  await page.goto(`/${item.id}/${recordId}`);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect.poll(async () => (await api('GET', `/admin/maintenance-records/${recordId}`)).status, { timeout: 15_000 }).toBe(404);

  await expectItemRepairState(api, item.id, false, true);
});
