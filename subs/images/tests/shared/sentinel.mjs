/**
 * Sentinel image fixture (#623) — images are created through the real three-step pipeline
 * (POST /admin/images/presign → PUT bytes to S3 → POST /admin/images/confirm, see
 * docs-spookydecs/photo-service.md), so the UI journeys run against a genuine S3 object + DDB record.
 *
 * Server-generated photo IDs → marker+sweep. Every sentinel image is linked to the fake idea id
 * SENTINEL_IDEA_ID (context 'idea' → S3 path images/ideas/{stage}/{idea_id}/, stage-scoped so it
 * cannot collide with another environment), and carries SENTINEL_MARKER in its caption. Sweep lists
 * by idea_id and DELETEs each via the API, which removes the S3 object, thumbnail and DDB record.
 */
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';
import { sweepItemsAndIdeas, findSentinelItems } from '../../../_e2e/shared/entities.mjs';

export const SENTINEL_MARKER = 'E2E IMAGES SENTINEL - safe to delete';
/** Sentinel items for item-context photos carry this marker. */
export const ITEM_MARKER = 'E2E IMAGES ITEM SENTINEL - safe to delete';
export const SENTINEL_IDEA_ID = 'E2E-IMAGES-SENTINEL';

// 8x8 JPEG (the real client uploads JPEG thumbnails alongside the original).
export const IMG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDTooor81P0Q//Z',
  'base64',
);

/** Uploads one sentinel image end to end; returns the confirmed photo record. */
export async function createSentinelImage(api, { caption = '', itemId = null, target: explicitTarget = null } = {}) {
  const filename = `e2e-sentinel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpeg`;
  // Item context (photo_type 'catalog') carries item_ids and fires Image.Uploaded → items.images; otherwise the fake idea.
  const target = explicitTarget ?? (itemId
    ? { context: 'item', photo_type: 'catalog', item_ids: [itemId] }
    : { context: 'idea', photo_type: 'inspiration', idea_id: SENTINEL_IDEA_ID });
  const presign = await api('POST', '/admin/images/presign', {
    ...target,
    season: 'halloween',
    files: [{ filename, content_type: 'image/jpeg', file_size: IMG.length }],
  });
  if (presign.status !== 200) throw new Error(`presign failed (${presign.status}): ${JSON.stringify(presign.body).slice(0, 300)}`);
  const up = (presign.data?.uploads || presign.body?.uploads)[0];

  const put = await fetch(up.presigned_url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'x-amz-tagging': 'confirmed=false' }, body: IMG });
  if (!put.ok) throw new Error(`S3 PUT failed (${put.status})`);
  if (up.thumb_presigned_url) {
    const thumb = await fetch(up.thumb_presigned_url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'x-amz-tagging': 'confirmed=false' }, body: IMG });
    if (!thumb.ok) throw new Error(`S3 thumbnail PUT failed (${thumb.status})`);
  }

  const confirm = await api('POST', '/admin/images/confirm', {
    ...target,
    season: 'halloween',
    caption: `${SENTINEL_MARKER} ${caption}`.trim(),
    tags: ['e2e-sentinel'],
    photos: [{
      cloudfront_url: up.cloudfront_url,
      thumb_cloudfront_url: up.thumb_cloudfront_url,
      s3_key: up.s3_key,
      thumb_s3_key: up.thumb_s3_key,
    }],
  });
  if (confirm.status >= 300) throw new Error(`confirm failed (${confirm.status}): ${JSON.stringify(confirm.body).slice(0, 300)}`);
  const photo = (confirm.data?.photos || confirm.body?.photos || confirm.data?.items || [])[0] ?? confirm.data;
  return photo;
}

export async function findSentinels(api) {
  const res = await api('GET', `/admin/images?idea_id=${SENTINEL_IDEA_ID}`);
  const photos = res.data?.photos || res.data?.images || res.body?.photos || res.body?.images || res.data || [];
  return (Array.isArray(photos) ? photos : []).filter((p) => String(p.caption ?? '').includes(SENTINEL_MARKER));
}

/** Deletes through the images API (removes S3 original, stored + generated thumbnail, record, and fires Image.Deleted). */
export async function sweepSentinels(api) {
  const found = await findSentinels(api);
  for (const p of found) await api('DELETE', `/admin/images/${p.photo_id}`);
  // Item-context photos: delete them via the images API before the item goes (item cascade would orphan thumbnails, #655).
  const items = await findSentinelItems(api, ITEM_MARKER);
  let itemPhotos = 0;
  for (const item of items) {
    const res = await api('GET', `/admin/images?item_id=${encodeURIComponent(item.id)}`);
    const photos = res.data?.photos || res.data?.images || res.body?.photos || res.body?.images || res.data || [];
    for (const p of Array.isArray(photos) ? photos : []) {
      await api('DELETE', `/admin/images/${p.photo_id}`);
      itemPhotos++;
    }
  }
  const rest = await sweepItemsAndIdeas(api, ITEM_MARKER);
  return found.length + itemPhotos + rest;
}
