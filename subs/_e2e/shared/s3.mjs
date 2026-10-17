/**
 * Read-only S3 checks for e2e specs (#623): did a delete leave photo objects behind? Uses the local aws CLI; every helper
 * returns null when the CLI is unusable so a spec can annotate instead of failing on tooling.
 */
import { execFileSync } from 'node:child_process';

const BUCKET = 'spooky-decs-shared-assets';

/** The key sd_photos_thumbnail_gen writes for a photo's s3_key (mirrors sd_photos_handler._generated_thumb_key, #649). */
export function generatedThumbKey(s3Key) {
  const i = s3Key.lastIndexOf('/');
  const dir = i >= 0 ? s3Key.slice(0, i) : '';
  const file = s3Key.slice(i + 1).replace('image-', 'thumb-');
  return dir ? `${dir}/thumbnails/${file}` : `thumbnails/${file}`;
}

/** Keys that exist under an exact key/prefix (so an exact key returns [key] or []). */
export function keysWithPrefix(prefix) {
  try {
    const out = execFileSync('aws', [
      's3api', 'list-objects-v2', '--region', 'us-east-2', '--bucket', BUCKET,
      '--prefix', prefix, '--query', 'Contents[].Key', '--output', 'json',
    ], { encoding: 'utf8', timeout: 30_000 });
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return null;
  }
}

/** Every object a photo record owns that still exists: original, stored thumbnail, generated thumbnail. */
export function remainingObjects(photo) {
  const keys = [photo.s3_key, photo.thumb_s3_key, photo.s3_key && generatedThumbKey(photo.s3_key)].filter(Boolean);
  const left = [];
  for (const k of new Set(keys)) {
    const found = keysWithPrefix(k);
    if (found === null) return null;
    left.push(...found.filter((x) => x === k));
  }
  return left;
}
