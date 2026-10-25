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

// Igor and Renfield are agentic (recorded gaps): this only proves the entry points render for the right records. The
// enrich worker updates the idea with no existence check, so triggering it would risk resurrecting a deleted idea.
test('ideas agentic entry points render (Ask Igor on an idea, Quick add on acquisitions)', async ({ page, ideas }) => {
  const { api } = ideas;
  const title = sentinelName('Igor');
  const res = await api('POST', '/ideas', { title, season: 'Halloween', status: 'Considering', tags: [] });
  expect(res.status).toBeLessThan(300);
  const idea = (await findSentinels(api)).find((i: any) => i.title === title);

  await page.goto(`/${idea.id}`);
  await expect(page.getByRole('button', { name: 'Ask Igor' })).toBeVisible();

  await page.goto('/acquisitions');
  await page.getByRole('button', { name: 'Quick add acquisition from URL' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Product URL')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
});
