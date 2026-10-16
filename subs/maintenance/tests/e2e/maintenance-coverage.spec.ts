import { test, expect, createSentinelItem, createSentinelRecord, findSentinelSchedules, sentinelName, asList } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from './helpers';


const recordOf = (r: any) => r.data?.record ?? r.data ?? r.body;

test.use({ storageState: STORAGE_STATE_PATH });

test('maintenance: perform an inspection that requires maintenance → follow-up task is generated', async ({ page, maint }) => {
  const { api } = maint;
  const item = await createSentinelItem(api, 'inspection');
  const insp = await createSentinelRecord(api, item.id, { record_type: 'inspection', category: 'exterior_inspection', title: sentinelName('inspection') });
  const taskTitle = `E2E follow-up ${Date.now()}`;

  await page.goto(`/${item.id}/${insp.record_id}/perform-inspection`);
  await page.getByLabel('Inspector').fill('e2e-suite');
  await page.getByLabel('Date Performed').fill(new Date().toISOString().slice(0, 10));
  await page.getByRole('radio', { name: /Maintenance Required/ }).check();
  await page.getByLabel('Findings / Notes').fill('Seam frayed.');
  // Choosing Maintenance Required already opens one task row.
  await page.getByLabel('Title').fill(taskTitle);
  await selectOption(page, 'Criticality', /^Medium$/);
  const posted = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`/${insp.record_id}/inspect`));
  await page.getByRole('button', { name: /Complete|Submit|Save/ }).last().click();
  const res = await posted;
  expect(res.status(), `inspect → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
  await expect(page.getByText('Inspection Completed Successfully')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(taskTitle)).toBeVisible();

  await expect.poll(async () => recordOf(await api('GET', `/admin/maintenance-records/${insp.record_id}`))?.status, { timeout: 15_000 }).toBe('completed');
  const list = await api('GET', `/admin/maintenance-records?item_id=${item.id}`);
  const records = asList(list, 'records');
  expect(records.some((r) => r.title === taskTitle), 'generated follow-up task exists').toBe(true);
});

test('maintenance: edit a record through RecordFormPage and view it on the item and records pages', async ({ page, maint }) => {
  const { api } = maint;
  const item = await createSentinelItem(api, 'edit');
  const rec = await createSentinelRecord(api, item.id);
  const edited = `${sentinelName('edited')}`;

  await page.goto(`/${item.id}/${rec.record_id}/edit`);
  await page.getByLabel('Title').fill(edited);
  const put = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/admin/maintenance-records/${rec.record_id}`));
  await page.getByRole('button', { name: /Update|Save/ }).last().click();
  expect((await put).status()).toBeLessThan(300);
  await page.waitForURL(new RegExp(`/${item.id}/${rec.record_id}$`), { timeout: 15_000 });
  await expect(page.getByText(edited).first()).toBeVisible();
  expect(recordOf(await api('GET', `/admin/maintenance-records/${rec.record_id}`)).title).toBe(edited);

  await test.step('Item page lists the record', async () => {
    await page.goto(`/${item.id}`);
    await page.getByRole('tab', { name: /Upcoming/ }).click(); // scheduled records live under Upcoming
    await expect(page.getByText(edited).first()).toBeVisible();
  });
  await test.step('Records, Items and Landing views render', async () => {
    for (const path of ['/records', '/items', '/schedules', '/']) {
      const resp = await page.goto(path);
      expect(resp?.status()).toBeLessThan(400);
      await expect(page.getByText(/Something went wrong|Unable to load/i)).toHaveCount(0);
    }
  });
});

test('maintenance: template lifecycle — create → edit → apply to an item → delete', async ({ page, maint }) => {
  const { api } = maint;
  const item = await createSentinelItem(api, 'template');
  const title = sentinelName('template');
  const edited = `${title} edited`;
  let scheduleId = '';

  await test.step('Create — template through ScheduleFormPage', async () => {
    await page.goto('/schedules/new');
    await selectOption(page, 'Class Type', /Static Prop/);
    await page.getByLabel('Short Name').fill(`E2E_${Date.now()}`);
    await selectOption(page, 'Record Type', /^Maintenance$/);
    await selectOption(page, 'Category', /^Cleaning$/);
    await page.getByLabel('Title').fill(title);
    await selectOption(page, 'Frequency', /^Annual$/);
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/admin\/maintenance-schedules$/.test(r.url()));
    await page.getByRole('button', { name: /Create|Save/ }).last().click();
    const res = await posted;
    expect(res.status(), `POST schedule → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
    // Creating a template lands on its real detail page (was /schedules/undefined before #650).
    await page.waitForURL(/\/schedules\/TMPL-[^/]+$/, { timeout: 15_000 });
    scheduleId = new URL(page.url()).pathname.split('/').pop()!;
    expect((await findSentinelSchedules(api)).some((t: any) => t.schedule_id === scheduleId)).toBe(true);
    await expect(page.getByText(title).first()).toBeVisible();
  });

  await test.step('Edit — rename the template', async () => {
    await page.goto(`/schedules/${scheduleId}/edit`);
    await page.getByLabel('Title').fill(edited);
    const put = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/admin/maintenance-schedules/${scheduleId}`));
    await page.getByRole('button', { name: /Update|Save/ }).last().click();
    expect((await put).status()).toBeLessThan(300);
    await page.waitForURL(new RegExp(`/schedules/${scheduleId}$`), { timeout: 15_000 });
    await expect(page.getByText(edited).first()).toBeVisible();
  });

  await test.step('Apply — apply the template to the sentinel item (wizard)', async () => {
    await page.goto(`/schedules/${scheduleId}/apply`);
    await page.getByLabel('Search items').fill(item.short_name);
    await page.getByRole('row', { name: new RegExp(item.id) }).getByRole('checkbox').check();
    await page.getByRole('button', { name: /Next|Review|Continue/ }).last().click();
    const applied = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`/${scheduleId}/apply`));
    await page.getByRole('button', { name: /Apply/ }).last().click();
    expect((await applied).status()).toBeLessThan(300);
    await expect.poll(async () => {
      const list = await api('GET', `/admin/maintenance-records?item_id=${item.id}`);
      return asList(list, 'records').filter((r) => r.title === edited || r.schedule_id === scheduleId).length;
    }, { timeout: 20_000 }).toBeGreaterThan(0);
  });

  await test.step('Delete — remove the template (pending records cancelled)', async () => {
    await page.goto(`/schedules/${scheduleId}`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(async () => (await findSentinelSchedules(api)).some((t: any) => t.schedule_id === scheduleId), { timeout: 15_000 }).toBe(false);
  });
});
