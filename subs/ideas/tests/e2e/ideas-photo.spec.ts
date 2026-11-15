import { execFileSync } from 'node:child_process';
import { test, expect, sentinelName, findSentinels } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';
import { IMG } from '../../../images/tests/shared/sentinel.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const photosOf = (r: any): any[] => {
  const d = r.data ?? r.body?.data ?? r.body;
  return d?.photos || d?.images || (Array.isArray(d) ? d : []);
};

/** Keys under the idea's S3 prefix (read-only); null when the aws CLI is not usable here. */
function s3Keys(ideaId: string): string[] | null {
  try {
    const out = execFileSync('aws', [
      's3api', 'list-objects-v2', '--region', 'us-east-2', '--bucket', 'spooky-decs-shared-assets',
      '--prefix', `images/ideas/dev/${ideaId}/`, '--query', 'Contents[].Key', '--output', 'json',
    ], { encoding: 'utf8', timeout: 30_000 });
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return null;
  }
}

test('ideas photo: create with a photo → stored and shown → cascade delete removes every S3 object (#655)', async ({ page, ideas }) => {
  const { api } = ideas;
  const title = sentinelName('Photo');
  let id = '';

  await test.step('Create — idea with an attached photo through FormPage', async () => {
    await page.goto('/create');
    await page.getByLabel('Title').fill(title);
    await selectOption(page, 'Season', 'Halloween');
    await page.getByLabel('Description').fill('Created by the #623 e2e suite; safe to delete.');
    await page.locator('input[type="file"]').setInputFiles({ name: 'e2e-idea.jpg', mimeType: 'image/jpeg', buffer: IMG });
    await expect(page.getByAltText('preview')).toBeVisible();
    await page.getByRole('button', { name: 'Create Idea' }).click();
    // /create itself matches a bare "/segment" pattern, so wait for the redirect away from it (the upload runs first).
    await page.waitForURL((u) => !u.pathname.endsWith('/create'), { timeout: 60_000 });
    const found = (await findSentinels(api)).find((i: any) => i.title === title);
    expect(found, 'idea created').toBeTruthy();
    id = found.id;
  });

  let photoId = '';
  await test.step('Photo record exists for the idea and the detail page renders it', async () => {
    await expect.poll(async () => photosOf(await api('GET', `/admin/images?idea_id=${encodeURIComponent(id)}`)).length, { timeout: 30_000 }).toBeGreaterThan(0);
    const photo = photosOf(await api('GET', `/admin/images?idea_id=${encodeURIComponent(id)}`))[0];
    photoId = photo.photo_id;
    expect(photo).toMatchObject({ idea_id: id });
    expect(photo.cloudfront_url).toBeTruthy();
    await page.goto(`/${id}`);
    await expect(page.getByRole('heading', { name: 'Photos' }).or(page.getByText('Photos', { exact: true })).first()).toBeVisible();
    await expect(page.locator(`img[src*="${photoId}"], img[src*="${id}"]`).first()).toBeVisible({ timeout: 20_000 });
  });

  await test.step('Cascade delete removes the photo record and its S3 objects, including the generated thumbnail', async () => {
    const before = s3Keys(id);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL(/\/list$/, { timeout: 30_000 });
    await expect.poll(async () => photosOf(await api('GET', `/admin/images?idea_id=${encodeURIComponent(id)}`)).length, { timeout: 30_000 }).toBe(0);
    const after = s3Keys(id);
    if (before !== null && after !== null) {
      expect(before.length, 'objects existed before delete').toBeGreaterThan(0);
      expect(after, `leftover S3 objects under images/ideas/dev/${id}/`).toEqual([]);
    } else {
      test.info().annotations.push({ type: 'note', description: 'aws CLI unavailable — S3 prefix not checked' });
    }
  });
});

// Igor and Renfield are agentic, so this asserts the request is ACCEPTED (202), not the fan-out result. Each record is
// then deleted mid-run: the enrich workers' write-back is guarded (#661), so the late write must not resurrect a ghost.
test('ideas agentic: Ask Igor and Quick add are accepted, and a delete mid-run leaves no ghost (#661)', async ({ page, ideas }) => {
  const { api } = ideas;
  const listOf = (r: any): any[] => {
    const d = r.data ?? r.body?.data ?? r.body;
    return Array.isArray(d) ? d : d?.acquisitions || d?.ideas || [];
  };

  await test.step('Ask Igor — enrich accepted, then delete the idea mid-run', async () => {
    const title = sentinelName('Igor');
    const res = await api('POST', '/ideas', { title, season: 'Halloween', status: 'Considering', tags: [] });
    expect(res.status).toBeLessThan(300);
    const idea = (await findSentinels(api)).find((i: any) => i.title === title);
    expect(idea, 'idea created').toBeTruthy();

    await page.goto(`/${idea.id}`);
    const accepted = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`${idea.id}/enrich`));
    // The panel is a collapsed accordion: open it (the trigger button), then press the inner "Ask Igor" action button.
    await page.getByRole('button', { name: 'Ask Igor' }).click();
    await page.locator('button:not([data-slot="trigger"])', { hasText: 'Ask Igor' }).click();
    expect((await accepted).status()).toBe(202);

    expect((await api('DELETE', `/ideas/${idea.id}`)).status).toBeLessThan(300);
    await expect.poll(async () => (await findSentinels(api)).some((i: any) => i.id === idea.id)).toBe(false);
  });

  await test.step('Quick add — enrich accepted, then delete the acquisition mid-run', async () => {
    const url = `https://example.com/e2e-quick-add-${Date.now()}`;
    await page.goto('/acquisitions');
    await page.getByRole('button', { name: 'Quick add acquisition from URL' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Product URL').fill(url);
    const accepted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/acquisitions\/[^/]+\/enrich$/.test(r.url()));
    await dialog.getByRole('button', { name: /Add & Enrich/ }).click();
    expect((await accepted).status()).toBe(202);
    await page.waitForURL(/\/acquisitions\/[^/]+$/, { timeout: 15_000 });

    // The stub carries a placeholder title (not the sentinel), so find it by its unique URL and delete it here.
    const stub = listOf(await api('GET', '/acquisitions')).find((a: any) => a.url === url);
    expect(stub, 'quick-add stub created').toBeTruthy();
    expect((await api('DELETE', `/acquisitions/${stub.acquisition_id}`)).status).toBeLessThan(300);
    await expect
      .poll(async () => listOf(await api('GET', '/acquisitions')).some((a: any) => a.acquisition_id === stub.acquisition_id))
      .toBe(false);
  });
});
