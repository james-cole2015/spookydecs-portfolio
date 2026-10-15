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

export const SENTINEL_MARKER = 'E2E IMAGES SENTINEL - safe to delete';
export const SENTINEL_IDEA_ID = 'E2E-IMAGES-SENTINEL';

// 8x8 JPEG (the real client uploads JPEG thumbnails alongside the original).
const IMG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDTooor81P0Q//Z',
  'base64',
);

/** Uploads one sentinel image end to end; returns the confirmed photo record. */
export async function createSentinelImage(api, { caption = '' } = {}) {
  const filename = `e2e-sentinel-${Date.now()}.jpeg`;
  const presign = await api('POST', '/admin/images/presign', {
    context: 'idea',
    photo_type: 'inspiration',
    season: 'halloween',
    idea_id: SENTINEL_IDEA_ID,
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
    context: 'idea',
    photo_type: 'inspiration',
    season: 'halloween',
    idea_id: SENTINEL_IDEA_ID,
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

export async function sweepSentinels(api) {
  const found = await findSentinels(api);
  for (const p of found) await api('DELETE', `/admin/images/${p.photo_id}`);
  return found.length;
}
