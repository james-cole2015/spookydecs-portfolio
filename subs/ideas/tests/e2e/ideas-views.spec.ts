import { test, expect, sentinelName, findSentinels } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

test.use({ storageState: STORAGE_STATE_PATH });

test('ideas views: landing, list, workbench board and acquisitions load; a Planning idea is queued on the board', async ({ page, ideas }) => {
  const { api } = ideas;
  const title = sentinelName('Board');
  const created = await api('POST', '/ideas', {
    title, season: 'Halloween', status: 'Considering', tags: [], description: 'board check', link: 'https://example.com/board',
  });
  expect(created.status).toBeLessThan(300);
  const idea = (await findSentinels(api)).find((i: any) => i.title === title);
  const moved = await api('PUT', `/ideas/${idea.id}`, { id: idea.id, title, season: 'Halloween', status: 'Planning' });
  expect(moved.status, JSON.stringify(moved.body).slice(0, 200)).toBeLessThan(300);

  for (const path of ['/', '/list', '/workbench', '/acquisitions']) {
    await test.step(path, async () => {
      const resp = await page.goto(path);
      expect(resp?.status()).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Something went wrong|Unable to load|Failed to load/i)).toHaveCount(0);
    });
  }

  await test.step('Workbench board — Planning queue lists the idea and opens its detail page', async () => {
    await page.goto('/workbench');
    await expect(page.getByRole('heading', { name: 'Active Builds' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Planning/ })).toBeVisible();
    await page.getByText(title).first().click();
    await page.waitForURL(new RegExp(`/${idea.id}$`));
  });
});
