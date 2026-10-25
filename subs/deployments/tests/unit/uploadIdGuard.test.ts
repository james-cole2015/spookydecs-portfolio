import { describe, expect, it } from 'vitest';
import { assertUploadIds } from '../../../../packages/ui/src/lib/uploadIdGuard';

// #682 — an id in the wrong upload field stores the photo under the wrong entity.
describe('assertUploadIds', () => {
  it('accepts the deployment shape: DEP- deployment_id plus the item as item_ids', () => {
    expect(() =>
      assertUploadIds({
        context: 'deployment',
        deployment_id: 'DEP-HAL-2026',
        item_ids: ['DEC-AMT-FIERY_REAPER-015'],
      }),
    ).not.toThrow();
  });

  it('rejects an item id in deployment_id (the #682 bug)', () => {
    expect(() =>
      assertUploadIds({ context: 'deployment', deployment_id: 'DEC-AMT-FIERY_REAPER-015' }),
    ).toThrow(/not a deployment id/);
  });

  it('rejects a deployment upload with no deployment_id (the old hyphenated key goes unread)', () => {
    expect(() =>
      assertUploadIds({ context: 'deployment', 'deployment-id': 'DEP-HAL-2026', item_ids: ['DEC-STC-X-001'] }),
    ).toThrow(/needs a deployment_id/);
  });

  it('rejects a deployment or storage id inside item_ids', () => {
    expect(() => assertUploadIds({ context: 'item', item_ids: ['DEP-HAL-2026'] })).toThrow(/not an item id/);
    expect(() => assertUploadIds({ context: 'item', item_ids: ['STOR-TOTE-HAL-001'] })).toThrow(/not an item id/);
  });

  it('rejects a non-storage id in storage_id', () => {
    expect(() => assertUploadIds({ context: 'storage', storage_id: 'DEC-STC-X-001' })).toThrow(/not a storage id/);
    expect(() => assertUploadIds({ context: 'storage', storage_id: 'STOR-TOTE-HAL-001' })).not.toThrow();
  });

  it('leaves contexts without these fields alone', () => {
    expect(() => assertUploadIds({ context: 'receipt', idea_id: 'idea-hal-20260612010242-kxou' })).not.toThrow();
    expect(() => assertUploadIds({ context: 'tracker', record_id: '681' })).not.toThrow();
    expect(() => assertUploadIds({ context: 'item', item_ids: ['LHT-STR-1-MULTI-031'] })).not.toThrow();
  });
});
