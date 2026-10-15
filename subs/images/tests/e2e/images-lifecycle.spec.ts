import { test, expect, createSentinelImage, findSentinels } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

test.use({ storageState: STORAGE_STATE_PATH });

// Upload goes through the shared photo-upload modal (CDN service + editor), which is outside this
// sub; the pipeline it drives (presign → S3 → confirm) is exercised directly by the fixture, and
// this journey covers what the images sub itself owns: view, edit metadata, delete.
test('images lifecycle: upload (API pipeline) → view → edit caption → delete', async ({ page, images }) => {
  const { api } = images;
  let photoId = '';
  const edited = 'E2E IMAGES SENTINEL - safe to delete (edited)';

  await test.step('Upload — presign → S3 PUT → confirm creates a real image record', async () => {
    const photo = await createSentinelImage(api, { caption: 'lifecycle' });
    expect(photo?.photo_id, 'confirm returned a photo_id').toMatch(/^PHOTO-/);
    photoId = photo.photo_id;
    const listed = await findSentinels(api);
    expect(listed.some((p: any) => p.photo_id === photoId)).toBe(true);
  });

  await test.step('View — detail page renders the record', async () => {
    await page.goto(`/${photoId}`);
    await expect(page.getByText(photoId).first()).toBeVisible();
    await expect(page.getByText('E2E IMAGES SENTINEL').first()).toBeVisible();
  });

  await test.step('Edit — change the caption through EditForm, verify persisted', async () => {
    await page.goto(`/${photoId}/edit`);
    await page.getByLabel('Caption').fill(edited);
    const patched = page.waitForResponse((r) => r.url().includes(`/admin/images/${photoId}`) && ['PATCH', 'PUT'].includes(r.request().method()));
    await page.getByRole('button', { name: 'Save Changes' }).click();
    const res = await patched;
    expect(res.status(), `update → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
    await expect.poll(async () => {
      const r = await api('GET', `/admin/images/${photoId}`);
      return (r.data?.photo ?? r.data ?? r.body)?.caption;
    }, { timeout: 15_000 }).toBe(edited);
  });

  await test.step('Delete — remove from the detail page', async () => {
    await page.goto(`/${photoId}`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL(/\/list$/, { timeout: 15_000 });
    await expect.poll(async () => (await api('GET', `/admin/images/${photoId}`)).status, { timeout: 15_000 }).toBe(404);
  });
});
