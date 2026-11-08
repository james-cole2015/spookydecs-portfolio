import { describe, expect, it } from 'vitest';
import { selfUnitCandidates, itemIdsWithUnit } from '../../src/lib/packState';
import type { ItemRecord } from '../../src/api/storageApi';
import type { StorageUnit } from '../../src/config/storageConfig';

const item = (id: string, sd: Record<string, unknown> = {}, extra: Record<string, unknown> = {}): ItemRecord =>
  ({ id, class: 'Decoration', storage_data: { single_packed: true, packable: true, is_stored: false }, ...extra, ...(Object.keys(sd).length ? { storage_data: { single_packed: true, packable: true, is_stored: false, ...sd } } : {}) }) as ItemRecord;
const unit = (extra: Record<string, unknown>) => ({ id: 'STOR-SELF-HAL-001', class_type: 'Self', ...extra }) as unknown as StorageUnit;

describe('selfUnitCandidates (#701)', () => {
  it('keeps single-packed packable items with no unit', () => {
    expect(selfUnitCandidates([item('A')], []).map((i) => i.id)).toEqual(['A']);
  });

  it('drops items not flagged single-packed, and non-packable ones', () => {
    const out = selfUnitCandidates([item('A', { single_packed: false }), item('B', { packable: false }), item('C')], []);
    expect(out.map((i) => i.id)).toEqual(['C']);
  });

  it('drops items that already have an Empty unit assigned or are packed in one', () => {
    const units = [unit({ assigned_item_id: 'A', contents: [] }), unit({ id: 'STOR-SELF-HAL-002', contents: ['B'] })];
    expect(selfUnitCandidates([item('A'), item('B'), item('C')], units).map((i) => i.id)).toEqual(['C']);
    expect([...itemIdsWithUnit(units)].sort()).toEqual(['A', 'B']);
  });

  it('drops boxed items and non-items but allows a Deployed item', () => {
    const out = selfUnitCandidates(
      [item('P', {}, { status: 'Packed' }), item('D', {}, { status: 'Deployed' }), item('R', {}, { class_type: 'Receptacle' }), item('X', {}, { class: 'Storage' })],
      [],
    );
    expect(out.map((i) => i.id)).toEqual(['D']);
  });
});
