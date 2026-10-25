import { test, expect, sentinelName, findSentinels, SEASON } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';

test.use({ storageState: STORAGE_STATE_PATH });

// Sequential: each phase depends on the idea the previous one created.
test('ideas lifecycle: create → detail → cascade delete', async ({ page, ideas }) => {
  const { api } = ideas;
  const title = sentinelName('Idea');
  let id = '';

  await test.step('Create — idea through FormPage', async () => {
    await page.goto('/create');
    await page.getByLabel('Title').fill(title);
    await selectOption(page, 'Season', SEASON);
    await page.getByLabel('Description').fill('Created by the #623 e2e suite; safe to delete.');
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/ideas$/.test(r.url()));
    await page.getByRole('button', { name: 'Create Idea' }).click();
    const res = await posted;
    expect(res.status(), `POST /ideas → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
    await page.waitForURL(/\/[^/]+$/, { timeout: 15_000 });
    const found = (await findSentinels(api)).find((i: any) => i.title === title);
    expect(found, 'created idea present via API').toBeTruthy();
    id = found.id;
    expect(found.season).toBe(SEASON);
    expect(found.status).toBe('Considering');
  });

  await test.step('Detail — idea renders at /:id', async () => {
    await page.goto(`/${id}`);
    await expect(page.getByText(title).first()).toBeVisible();
  });

  await test.step('List — idea shows in the list view', async () => {
    await page.goto('/list');
    await expect(page.getByText(title).first()).toBeVisible();
  });

  await test.step('Delete — cascade delete from DetailPage', async () => {
    await page.goto(`/${id}`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL(/\/list$/, { timeout: 15_000 });
    await expect.poll(async () => (await findSentinels(api)).some((i: any) => i.id === id), { timeout: 15_000 }).toBe(false);
  });
});
