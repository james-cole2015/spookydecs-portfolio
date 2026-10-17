import { test, expect, createSentinelItem, createSentinelRecord, findSentinelSchedules, sentinelName, asList, SENTINEL_MARKER } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';
import { IMG } from '../../../images/tests/shared/sentinel.mjs';
import { remainingObjects } from '../../../_e2e/shared/s3.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const recordOf = (r: any) => r.data?.record ?? r.data ?? r.body;
const itemOf = (r: any) => r.data?.item ?? r.data ?? r.body;
const today = () => new Date().toISOString().slice(0, 10);

async function openInspection(page: any, api: any, label: string) {
  const item = await createSentinelItem(api, label);
  const insp = await createSentinelRecord(api, item.id, { record_type: 'inspection', category: 'exterior_inspection', title: sentinelName(label) });
  await page.goto(`/${item.id}/${insp.record_id}/perform-inspection`);
  await page.getByLabel('Inspector').fill('e2e-suite');
  await page.getByLabel('Date Performed').fill(today());
  return { item, insp };
}

async function submitInspection(page: any, recordId: string) {
  const posted = page.waitForResponse((r: any) => r.request().method() === 'POST' && r.url().includes(`/${recordId}/inspect`));
  await page.getByRole('button', { name: 'Complete Inspection' }).click();
  const res = await posted;
  expect(res.status(), `inspect → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
  await expect(page.getByText('Inspection Completed Successfully')).toBeVisible({ timeout: 15_000 });
}

test('maintenance: inspection Pass completes the record and generates no tasks', async ({ page, maint }) => {
  const { api } = maint;
  const { item, insp } = await openInspection(page, api, 'pass');
  await page.getByRole('radio', { name: /Pass/ }).check();
  await page.getByLabel('Findings / Notes').fill('All good.');
  await submitInspection(page, insp.record_id);

  await expect.poll(async () => recordOf(await api('GET', `/admin/maintenance-records/${insp.record_id}`))?.status, { timeout: 15_000 }).toBe('completed');
  const stored = recordOf(await api('GET', `/admin/maintenance-records/${insp.record_id}`)).inspection_result;
  expect(stored).toMatchObject({ result: 'pass', action_taken: 'none', generated_task_ids: [] });
  expect(item.id).toBeTruthy();
});

test('maintenance: inspection Maintenance Required with two tasks creates two records', async ({ page, maint }) => {
  const { api } = maint;
  const { item, insp } = await openInspection(page, api, 'two tasks');
  await page.getByRole('radio', { name: /Maintenance Required/ }).check();
  await page.getByLabel('Title').first().fill('E2E task one');
  await selectOption(page, 'Criticality', /^Low$/, { first: true });
  await page.getByRole('button', { name: 'Add Task' }).click();
  await page.getByLabel('Title').nth(1).fill('E2E task two');
  await selectOption(page, 'Criticality', /^High$/, { last: true });
  await submitInspection(page, insp.record_id);

  const stored = recordOf(await api('GET', `/admin/maintenance-records/${insp.record_id}`)).inspection_result;
  expect(stored.generated_task_ids).toHaveLength(2);
  // (the item may also get its next scheduled inspection from the recurrence consumer, so only the generated tasks are matched)
  const titles = asList(await api('GET', `/admin/maintenance-records?item_id=${item.id}`), 'records').filter((r) => stored.generated_task_ids.includes(r.record_id)).map((r) => r.title).sort();
  expect(titles).toEqual(['E2E task one', 'E2E task two']);
});

test('maintenance: Retire Item requires a reason, asks to confirm, and retires the item', async ({ page, maint }) => {
  const { api } = maint;
  const { item, insp } = await openInspection(page, api, 'failed');
  await page.getByRole('radio', { name: /Retire Item/ }).check();
  // The reason is a required field: the browser blocks the submit and nothing is posted.
  let posted = false;
  page.on('request', (r: any) => { if (r.method() === 'POST' && r.url().includes('/inspect')) posted = true; });
  await page.getByRole('button', { name: 'Complete Inspection' }).click();
  await expect(page.getByLabel('Reason for Retirement')).toBeFocused();
  expect(posted, 'no request without a retirement reason').toBe(false);

  await page.getByLabel('Reason for Retirement').fill('Seams split beyond repair (#623 e2e).');
  await selectOption(page, 'Disposal Method', /Donate/);
  // Retiring is permanent, so the form asks first; cancelling posts nothing.
  await page.getByRole('button', { name: 'Complete Inspection' }).click();
  await expect(page.getByText('Retire this item?')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(posted, 'cancelling the confirm must not post').toBe(false);
  const done = page.waitForResponse((r: any) => r.request().method() === 'POST' && r.url().includes(`/${insp.record_id}/inspect`));
  await page.getByRole('button', { name: 'Complete Inspection' }).click();
  await page.getByTestId('confirm-retire').click();
  expect((await done).status()).toBeLessThan(300);
  await expect(page.getByText('Inspection Completed Successfully')).toBeVisible({ timeout: 15_000 });

  await expect.poll(async () => recordOf(await api('GET', `/admin/maintenance-records/${insp.record_id}`))?.status, { timeout: 15_000 }).toBe('completed');
  expect(recordOf(await api('GET', `/admin/maintenance-records/${insp.record_id}`)).inspection_result)
    .toMatchObject({ result: 'failed', action_taken: 'item_retired', retirement_details: { disposal_method: 'donate' } });
  // #662: the handler publishes Inspection.Failed and the items consumer retires the item.
  await expect.poll(async () => String(itemOf(await api('GET', `/items/${encodeURIComponent(item.id)}`))?.status ?? ''), { timeout: 30_000 }).toBe('Retired');
});

test('maintenance: standalone template-apply wizard — select template → select items → review → apply', async ({ page, maint }) => {
  const { api } = maint;
  const item = await createSentinelItem(api, 'wizard');
  const title = sentinelName('wizard template');
  const created = await api('POST', '/admin/maintenance-schedules', {
    class_type: 'Static Prop', short_name: `E2E_${Date.now()}`, record_type: 'maintenance', category: 'cleaning', title,
    frequency: 'annual', enabled: true, description: '', estimated_cost: 0,
  });
  expect(created.status, JSON.stringify(created.body).slice(0, 300)).toBeLessThan(300);

  await page.goto('/schedules/apply');
  await page.getByRole('radio', { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).check();
  await page.getByRole('button', { name: 'Next Step' }).click();
  await page.getByLabel('Search items').fill(item.short_name);
  await page.getByRole('row', { name: new RegExp(item.id) }).getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Next Step' }).click();
  await expect(page.getByText('Template will be added to 1 item(s)')).toBeVisible(); // review step
  await expect(page.getByText(item.id)).toBeVisible();
  const applied = page.waitForResponse((r: any) => r.request().method() === 'POST' && /\/apply$/.test(r.url()));
  await page.getByRole('button', { name: /^Apply/ }).click();
  expect((await applied).status()).toBeLessThan(300);
  await expect(page.getByText('records created')).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => asList(await api('GET', `/admin/maintenance-records?item_id=${item.id}`), 'records').length, { timeout: 20_000 }).toBeGreaterThan(0);

  const tmpl = (await findSentinelSchedules(api)).find((t: any) => t.title === title);
  if (tmpl) await api('DELETE', `/admin/maintenance-schedules/${tmpl.schedule_id}`);
});

test('maintenance: records list — status tabs, item filter and URL state; schedules list filters', async ({ page, maint }) => {
  const { api } = maint;
  const item = await createSentinelItem(api, 'list');
  const open = await createSentinelRecord(api, item.id, { title: sentinelName('open one') });
  const done = await createSentinelRecord(api, item.id, { title: sentinelName('done one'), status: 'completed', date_performed: today() });

  await page.goto(`/records?item=${encodeURIComponent(item.id)}`);
  await expect(page.getByText(open.title).first()).toBeVisible();
  await expect(page.getByText(done.title)).toHaveCount(0); // All tab hides completed
  await page.getByRole('tab', { name: 'Completed' }).click();
  await expect(page).toHaveURL(/tab=completed/);
  await expect(page.getByText(done.title).first()).toBeVisible();
  await expect(page.getByText(open.title)).toHaveCount(0);

  await test.step('Item filter narrows; an unmatched filter shows nothing', async () => {
    await page.goto('/records?item=NO_SUCH_ITEM_E2E');
    await expect(page.getByText(open.title)).toHaveCount(0);
    await page.goto('/records');
    await page.getByLabel('Item ID').fill(item.id);
    await expect(page.getByText(open.title).first()).toBeVisible();
  });

  await test.step('Items and Schedules lists render and filter', async () => {
    await page.goto('/items');
    await expect(page.getByText(/Something went wrong|Failed to load/i)).toHaveCount(0);
    await page.goto('/schedules');
    await expect(page.getByRole('grid', { name: 'Maintenance templates' })).toBeVisible();
    await selectOption(page, 'Type', /Repair|Inspection|Maintenance/, { first: true });
    await expect(page).toHaveURL(/type=/);
  });
});

test('maintenance: record photos and cost link — attach through the edit form, see it on the Photos tab; a maintenance cost shows on the Costs tab', async ({ page, maint }) => {
  test.setTimeout(240_000);
  const { api } = maint;
  const item = await createSentinelItem(api, 'photos');
  const rec = await createSentinelRecord(api, item.id);

  const cost = await api('POST', '/finance/costs', {
    item_name: `${SENTINEL_MARKER} cost`, cost_type: 'maintenance', category: 'parts', cost_date: today(), vendor: 'E2E Vendor',
    quantity: 1, unit_cost: 12.5, total_cost: 12.5, related_item_id: item.id, related_record_id: rec.record_id,
  });
  expect(cost.status, JSON.stringify(cost.body).slice(0, 300)).toBeLessThan(300);

  await test.step('Attach — Add Photos through the shared picker/editor, then Update Record persists the attachment', async () => {
    await page.goto(`/${item.id}/${rec.record_id}/edit`);
    await page.getByRole('button', { name: 'Add Photos' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'maint.jpg', mimeType: 'image/jpeg', buffer: IMG });
    await dialog.getByRole('button', { name: /^Continue/ }).click();
    await page.getByRole('button', { name: 'Use original' }).click();
    await expect(page.getByText('1 photo(s) attached')).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: /Update Record/ }).click();
    await page.waitForURL(new RegExp(`/${item.id}/${rec.record_id}$`), { timeout: 15_000 });
    await expect.poll(async () => {
      const a = recordOf(await api('GET', `/admin/maintenance-records/${rec.record_id}`))?.attachments;
      return (a?.documentation?.length ?? 0) + (a?.before_photos?.length ?? 0) + (a?.after_photos?.length ?? 0);
    }, { timeout: 20_000 }).toBe(1);
  });

  await test.step('Photos tab renders the attachment', async () => {
    await page.getByRole('tab', { name: 'Photos' }).click();
    await expect(page.locator('img').first()).toBeVisible({ timeout: 30_000 });
  });

  await test.step('Costs tab shows the linked maintenance cost and total', async () => {
    await page.getByRole('tab', { name: 'Costs' }).click();
    await expect(page.getByText('$12.50').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Recent Maintenance Costs')).toBeVisible();
  });

  await test.step('Deleting the item cascade-removes the record photo from S3', async () => {
    const a = recordOf(await api('GET', `/admin/maintenance-records/${rec.record_id}`)).attachments;
    const photoId = (a.documentation?.[0] ?? a.before_photos?.[0] ?? a.after_photos?.[0])?.photo_id;
    const img = await api('GET', `/admin/images/${photoId}`);
    const photo = (img.data?.photo ?? img.data) as { s3_key?: string; thumb_s3_key?: string } | undefined;
    await api('DELETE', `/items/${encodeURIComponent(item.id)}/cascade`);
    if (!photo?.s3_key) { test.info().annotations.push({ type: 'note', description: 'photo s3_key not readable; S3 check skipped' }); return; }
    const left = remainingObjects(photo);
    if (left === null) { test.info().annotations.push({ type: 'note', description: 'aws CLI unavailable — S3 not checked' }); return; }
    expect(left, 'maintenance photo objects left after item cascade (#663)').toEqual([]);
  });
});
