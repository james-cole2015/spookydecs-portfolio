import { test, expect, sentinelName, findSentinels } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

test.use({ storageState: STORAGE_STATE_PATH });

test('ideas views: landing, list, active-builds list and acquisitions load', async ({ page, ideas }) => {
  const { api } = ideas;
  const title = sentinelName('Board');
  const created = await api('POST', '/ideas', {
    title, season: 'Halloween', status: 'Considering', tags: [], description: 'board check', link: 'https://example.com/board',
  });
  expect(created.status).toBeLessThan(300);
  const idea = (await findSentinels(api)).find((i: any) => i.title === title);
  const moved = await api('PUT', `/ideas/${idea.id}`, { id: idea.id, title, season: 'Halloween', status: 'Planning' });
  expect(moved.status, JSON.stringify(moved.body).slice(0, 200)).toBeLessThan(300);

  for (const path of ['/', '/list', '/list?status=Workbench', '/acquisitions']) {
    await test.step(path, async () => {
      const resp = await page.goto(path);
      expect(resp?.status()).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Something went wrong|Unable to load|Failed to load/i)).toHaveCount(0);
    });
  }

  await test.step('Legacy /workbench redirects to the Workbench list', async () => {
    await page.goto('/workbench');
    await page.waitForURL(/\/list\?status=Workbench/);
  });
});
