import { describe, it, expect } from 'vitest';
import { isOrphaned, type Photo } from '../../src/config/imagesConfig';

const base = { photo_id: 'PHOTO-1' } as Photo;

describe('isOrphaned', () => {
  it('flags a photo with no links', () => {
    expect(isOrphaned(base)).toBe(true);
  });

  it.each([
    ['item_ids', { item_ids: ['ITEM-1'] }],
    ['item_id', { item_id: 'ITEM-1' }],
    ['idea_id', { idea_id: 'IDEA-1' }],
    ['deployment_id', { deployment_id: 'DEP-1' }],
    ['storage_id', { storage_id: 'STOR-1' }],
    ['cost_ids', { cost_ids: ['COST-1'] }],
    ['record_id', { record_id: 'MAINT-1' }],
  ])('treats %s as linked', (_n, patch) => {
    expect(isOrphaned({ ...base, ...patch } as Photo)).toBe(false);
  });

  it('empty arrays still count as orphaned', () => {
    expect(isOrphaned({ ...base, item_ids: [], cost_ids: [] } as Photo)).toBe(true);
  });
});
