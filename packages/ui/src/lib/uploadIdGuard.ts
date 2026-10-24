/**
 * uploadIdGuard — fail a photo upload fast when an id lands in the wrong field (#682).
 *
 * `usePhotoUpload` maps a single `entityId` onto the context's id field, and `metadata`
 * is spread over the result. A caller that passes the wrong entity (an item id as the
 * `entityId` of a `deployment` upload) otherwise uploads cleanly and writes a record
 * whose `deployment_id` is an item id, with the object stored under the wrong S3 prefix.
 * Ids are namespaced by prefix, so a mismatch is detectable before anything is sent.
 */

const DEPLOYMENT_PREFIX = 'DEP-';
const STORAGE_PREFIX = 'STOR-';

/** Prefixes that identify another entity type, so they can never be an item id. */
const NON_ITEM_PREFIXES = [DEPLOYMENT_PREFIX, STORAGE_PREFIX];

/**
 * Throws if the id fields in an upload's metadata are inconsistent with their names.
 * `meta` is the object `usePhotoUpload` builds (context + id fields + passthrough).
 */
export function assertUploadIds(meta: Record<string, unknown>): void {
  const context = String(meta.context ?? '');

  const deploymentId = meta.deployment_id;
  if (context === 'deployment' && !deploymentId) {
    throw new Error(
      "Photo upload: context 'deployment' needs a deployment_id (pass idField/entityId or metadata.deployment_id).",
    );
  }
  if (deploymentId != null && !String(deploymentId).startsWith(DEPLOYMENT_PREFIX)) {
    throw new Error(
      `Photo upload: deployment_id "${String(deploymentId)}" is not a deployment id (expected ${DEPLOYMENT_PREFIX}…). ` +
        'Pass the deployment as entityId and the item as metadata.item_ids.',
    );
  }

  const storageId = meta.storage_id;
  if (storageId != null && !String(storageId).startsWith(STORAGE_PREFIX)) {
    throw new Error(`Photo upload: storage_id "${String(storageId)}" is not a storage id (expected ${STORAGE_PREFIX}…).`);
  }

  const itemIds = Array.isArray(meta.item_ids) ? meta.item_ids : [];
  for (const raw of itemIds) {
    const id = String(raw);
    if (NON_ITEM_PREFIXES.some((p) => id.startsWith(p))) {
      throw new Error(`Photo upload: item_ids contains "${id}", which is not an item id.`);
    }
  }
}
