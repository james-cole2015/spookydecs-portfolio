/**
 * L1 — Items & Photos derivation (#689): live status filter, snapshot (no filter), zone/class filters.
 *
 *   npx vitest run --dir subs/deployments/tests/unit
 */
import { describe, it, expect } from 'vitest';
import { bucketCounts, classBucket, deriveItemList, filterItems } from '../../src/lib/itemList';
import type { GraphInput } from '../../src/lib/graphDerivation';

const input: GraphInput = {
  zones: { FY: { zone_code: 'FY', zone_name: 'Front Yard', receptacle_ids: ['OUT-1'] }, BY: { zone_code: 'BY', zone_name: 'Back Yard', receptacle_ids: ['OUT-2'] } },
  items: {
    A: { id: 'A', short_name: 'Reaper', class_type: 'Animatronic', status: 'Deployed' },
    B: { id: 'B', short_name: 'Ghost', class_type: 'Inflatable', status: 'PreDeployment' },
    C: { id: 'C', short_name: 'Torn down', class_type: 'Static Prop', status: 'Stored' },
    D: { id: 'D', short_name: 'Lights', class_type: 'String Light', status: 'Deployed' },
    F: { id: 'F', short_name: 'Extension', class: 'Accessory', class_type: 'Cord', status: 'Deployed' },
    G: { id: 'G', short_name: 'Splitter', class: 'Accessory', class_type: 'Plug', status: 'Deployed' },
    E: { id: 'E', short_name: 'Orphan', class_type: 'Static Prop', status: 'Deployed' },
  },
  placements: [
    { placement_id: 'p1', item_id: 'A', zone_code: 'FY', photo_ids: ['ph1'] },
    { placement_id: 'p2', item_id: 'C', zone_code: 'BY' },
    { placement_id: 'p3', item_id: 'A', zone_code: 'FY', placement_type: 'removal', photo_ids: ['gone'] },
  ],
  connections: [
    { connection_id: 'c1', from_item_id: 'OUT-1', to_item_id: 'B', zone_code: 'FY', photo_ids: ['ph2', 'ph3'] },
    { connection_id: 'c3', from_item_id: 'OUT-1', to_item_id: 'F', zone_code: 'FY' },
    { connection_id: 'c4', from_item_id: 'F', to_item_id: 'G', zone_code: 'FY' },
    { connection_id: 'c2', from_item_id: 'OUT-2', to_item_id: 'D', zone_code: 'BY' },
  ],
};

describe('deriveItemList', () => {
  it('live: keeps PreDeployment/Deployed items with a placement or inbound connection', () => {
    const rows = deriveItemList(input, { applyStatusFilter: true });
    expect(rows.map((r) => r.id).sort()).toEqual(['A', 'B']);
  });

  it('live: never lists unplaced items or zone receptacles', () => {
    const ids = deriveItemList(input, { applyStatusFilter: true }).map((r) => r.id);
    expect(ids).not.toContain('E');
    expect(ids).not.toContain('OUT-1');
  });

  it('excludes cords, plugs and lights, live and snapshot', () => {
    for (const applyStatusFilter of [true, false]) {
      const ids = deriveItemList(input, { applyStatusFilter }).map((r) => r.id);
      expect(ids).not.toContain('F');
      expect(ids).not.toContain('G');
      expect(ids).not.toContain('D');
    }
  });

  it('snapshot: no status filter, so teardown-rewritten statuses still list', () => {
    const rows = deriveItemList(input, { applyStatusFilter: false });
    expect(rows.map((r) => r.id)).toContain('C');
  });

  it('collects photos from placement and inbound connection, ignoring removal records', () => {
    const rows = Object.fromEntries(deriveItemList(input, { applyStatusFilter: true }).map((r) => [r.id, r]));
    expect(rows.A.photoIds).toEqual(['ph1']);
    expect(rows.B.photoIds).toEqual(['ph2', 'ph3']);
  });
});

describe('filters', () => {
  const rows = deriveItemList(input, { applyStatusFilter: true });
  it('filters by zone and class bucket', () => {
    expect(filterItems(rows, 'FY', null).map((r) => r.id).sort()).toEqual(['A', 'B']);
    expect(filterItems(rows, 'ALL', 'animatronic').map((r) => r.id)).toEqual(['A']);
    expect(filterItems(rows, 'BY', 'inflatable')).toEqual([]);
  });
  it('counts buckets under the active zone', () => {
    expect(bucketCounts(rows, 'ALL')).toEqual({ animatronic: 1, inflatable: 1 });
    expect(bucketCounts(rows, 'BY')).toEqual({});
  });
  it('buckets the four decoration classes only', () => {
    expect(classBucket('Inflatable')).toBe('inflatable');
    expect(classBucket('Spot Light')).toBeNull();
  });
});
