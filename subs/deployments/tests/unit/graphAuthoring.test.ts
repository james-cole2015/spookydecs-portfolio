/**
 * L1 — drag-to-connect authoring rules, per-zone scoping and visual tiers (#638).
 *
 *   npx vitest run --dir subs/deployments/tests/unit
 */
import { describe, it, expect } from 'vitest';
import { deriveGraph, type GraphInput } from '../../src/lib/graphDerivation';
import { layoutGraph } from '../../src/lib/graphLayout';
import {
  canReceive,
  connectionPoweringLight,
  decorateNodes,
  filterToZone,
  freeFemalePorts,
  itemZone,
  itemsInUse,
  targetPortFor,
  zoneSummary,
} from '../../src/lib/graphPorts';

const FY = { zone_code: 'FY', zone_name: 'Front Yard', receptacle_ids: ['RECEP'] };

function wiredInput(): GraphInput {
  return {
    zones: { FY },
    items: {
      RECEP: { id: 'RECEP', female_ends: 2 },
      CORD: { id: 'CORD', class: 'Accessory', class_type: 'Cord', male_ends: 1, female_ends: 3 },
      LIGHT: { id: 'LIGHT', class: 'Light', class_type: 'Spot Light', power_inlet: true, power_data: { amps: 1, watts: 100 } },
      PROP: { id: 'PROP', class: 'Decoration', class_type: 'Static Prop' },
      LONE: { id: 'LONE', class: 'Decoration', class_type: 'Inflatable', male_ends: 1 },
    },
    connections: [
      { connection_id: 'c1', from_item_id: 'RECEP', from_port: 'Female_1', to_item_id: 'CORD', to_port: 'Male_1', zone_code: 'FY' },
      { connection_id: 'c2', from_item_id: 'CORD', from_port: 'Female_1', to_item_id: 'LIGHT', to_port: 'Power_Inlet', zone_code: 'FY', illuminates: ['PROP'] },
    ],
    placements: ['CORD', 'LIGHT', 'PROP', 'LONE'].map((id) => ({ item_id: id, zone_code: 'FY', placement_id: `p-${id}` })),
  };
}

describe('declared items and illuminates edges', () => {
  it('makes every declared item a node, even with no connections', () => {
    const g = deriveGraph(wiredInput());
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['CORD', 'LIGHT', 'LONE', 'PROP', 'RECEP']);
  });

  it('draws power edges from connections only — no outlet→prop placement edge', () => {
    const g = deriveGraph(wiredInput());
    expect(g.edges.filter((e) => e.data!.kind === 'connection').map((e) => e.id).sort()).toEqual(['c1', 'c2']);
    expect(g.edges.some((e) => e.source === 'RECEP' && e.target === 'PROP')).toBe(false);
  });

  it('draws illuminates as a light→prop edge that is not part of the amp rollup', () => {
    const g = deriveGraph(wiredInput());
    expect(g.edges.filter((e) => e.data!.kind === 'illuminates').map((e) => [e.source, e.target])).toEqual([['LIGHT', 'PROP']]);
    expect(g.nodes.find((n) => n.id === 'RECEP')!.data.rollupAmps).toBe(1);
  });

  it('shows pending (picker-added) accessories as nodes without a declaration or connection', () => {
    const input = { ...wiredInput(), items: { ...wiredInput().items, SPARE: { id: 'SPARE', class: 'Accessory', class_type: 'Cord', male_ends: 1, female_ends: 1 } }, pending: ['SPARE'] };
    const nodes = decorateNodes(deriveGraph(input).nodes, input, true);
    const spare = nodes.find((n) => n.id === 'SPARE')!;
    expect(spare).toBeDefined();
    expect([spare.data.canSource, spare.data.canTarget]).toEqual([true, true]);
  });

  it('lays unconnected declared nodes out below the bands', () => {
    const g = deriveGraph(wiredInput());
    const laid = layoutGraph(g.nodes, g.edges);
    const y = (id: string) => laid.find((n) => n.id === id)!.position.y;
    expect(y('LONE')).toBeGreaterThan(y('LIGHT'));
  });
});

describe('port availability and authoring flags', () => {
  const input = wiredInput();

  it('computes free female ports from active connections', () => {
    expect(freeFemalePorts('RECEP', input)).toEqual(['Female_2']);
    expect(freeFemalePorts('CORD', input)).toEqual(['Female_2', 'Female_3']);
    expect(freeFemalePorts('LONE', input)).toEqual([]);
  });

  it('only lets an item with a male end / inlet and no inbound connection receive power (#628)', () => {
    expect(canReceive('CORD', input)).toBe(false); // already fed
    expect(canReceive('LONE', input)).toBe(true);
    expect(canReceive('PROP', input)).toBe(false); // port-less
    expect(canReceive('RECEP', input)).toBe(false); // hub
    expect(targetPortFor(input.items.LIGHT)).toBe('Power_Inlet');
    expect(targetPortFor(input.items.LONE)).toBe('Male_1');
  });

  it('finds the connection that holds a light\'s illuminates list', () => {
    expect(connectionPoweringLight('LIGHT', input)!.connection_id).toBe('c2');
  });

  it('only lights can illuminate and only decorations can be lit', () => {
    const nodes = decorateNodes(deriveGraph(input).nodes, input, true);
    const f = (id: string) => nodes.find((n) => n.id === id)!.data;
    expect([f('LIGHT').canIlluminate, f('LONE').canIlluminate, f('CORD').canIlluminate]).toEqual([true, false, false]);
    expect([f('PROP').canBeLit, f('LONE').canBeLit, f('CORD').canBeLit, f('LIGHT').canBeLit]).toEqual([true, true, false, false]);
  });

  it('offers no authoring handles when not editable', () => {
    const nodes = decorateNodes(deriveGraph(input).nodes, input, false);
    expect(nodes.every((n) => !n.data.canSource && !n.data.editable)).toBe(true);
  });
});

describe('visual tiers and through-load', () => {
  const tier: GraphInput = {
    zones: { FY },
    items: {
      RECEP: { id: 'RECEP', female_ends: 1 },
      EXT: { id: 'EXT', class: 'Accessory', class_type: 'Cord', male_ends: 1, female_ends: 1, length: '25ft' },
      SPLIT: { id: 'SPLIT', class: 'Accessory', class_type: 'Plug', male_ends: 1, female_ends: 3 },
      INFL: { id: 'INFL', class: 'Decoration', class_type: 'Inflatable', male_ends: 1, power_data: { amps: 2, watts: 240 } },
      SPOT: { id: 'SPOT', class: 'Light', class_type: 'Spot Light', power_inlet: true, power_data: { amps: 0.5, watts: 60 } },
      SKULL: { id: 'SKULL', class: 'Decoration', class_type: 'Static Prop' },
    },
    connections: [
      { connection_id: 'a', from_item_id: 'RECEP', from_port: 'Female_1', to_item_id: 'EXT', to_port: 'Male_1', zone_code: 'FY' },
      { connection_id: 'b', from_item_id: 'EXT', from_port: 'Female_1', to_item_id: 'SPLIT', to_port: 'Male_1', zone_code: 'FY' },
      { connection_id: 'c', from_item_id: 'SPLIT', from_port: 'Female_1', to_item_id: 'INFL', to_port: 'Male_1', zone_code: 'FY' },
      { connection_id: 'd', from_item_id: 'SPLIT', from_port: 'Female_2', to_item_id: 'SPOT', to_port: 'Power_Inlet', zone_code: 'FY', illuminates: ['SKULL'] },
    ],
    placements: [],
  };
  const g = deriveGraph(tier);
  const data = (id: string) => g.nodes.find((n) => n.id === id)!.data;

  it('classifies decoration > light > plug/splitter > cord', () => {
    expect(['EXT', 'SPLIT', 'INFL', 'SPOT', 'SKULL', 'RECEP'].map((id) => data(id).kind)).toEqual(['cord', 'branch', 'load', 'light', 'load', 'hub']);
  });

  it('shows the load carried through cords and splitters, and counts what a light lights', () => {
    expect(data('EXT').throughAmps).toBe(2.5);
    expect(data('SPLIT').throughAmps).toBe(2.5);
    expect(data('RECEP').rollupAmps).toBe(2.5);
    expect(data('SPOT').litCount).toBe(1);
    expect(data('INFL').litCount).toBeUndefined();
  });

  it('labels edges into conductors with the carried load and edges into loads with their own', () => {
    const label = (id: string) => g.edges.find((e) => e.id === id)!.label;
    expect([label('a'), label('b'), label('c')]).toEqual(['2.5A', '2.5A', '2A/240W']);
  });
});

describe('per-zone scoping', () => {
  const input: GraphInput = {
    zones: {
      FY,
      BY: { zone_code: 'BY', zone_name: 'Back Yard', receptacle_ids: ['R-BY'] },
    },
    items: {
      RECEP: { id: 'RECEP', female_ends: 2 }, 'R-BY': { id: 'R-BY', female_ends: 2 },
      CORD_FY: { id: 'CORD_FY', class: 'Accessory', class_type: 'Cord', male_ends: 1, female_ends: 1 },
      GHOST: { id: 'GHOST', class: 'Decoration', class_type: 'Inflatable', male_ends: 1, power_data: { amps: 2 } },
      SKULL_BY: { id: 'SKULL_BY', class: 'Decoration', class_type: 'Static Prop' },
      SPOT_FY: { id: 'SPOT_FY', class: 'Light', class_type: 'Spot Light', power_inlet: true },
      LOOSE_FY: { id: 'LOOSE_FY', class: 'Decoration', class_type: 'Animatronic', power_inlet: true },
    },
    connections: [
      { connection_id: 'c1', from_item_id: 'RECEP', from_port: 'Female_1', to_item_id: 'CORD_FY', to_port: 'Male_1', zone_code: 'FY' },
      { connection_id: 'c2', from_item_id: 'CORD_FY', from_port: 'Female_1', to_item_id: 'SPOT_FY', to_port: 'Power_Inlet', zone_code: 'FY', illuminates: ['GHOST', 'SKULL_BY'] },
    ],
    placements: [
      { item_id: 'GHOST', zone_code: 'FY', placement_id: 'p1' },
      { item_id: 'SKULL_BY', zone_code: 'BY', placement_id: 'p2' },
      { item_id: 'LOOSE_FY', zone_code: 'FY', placement_id: 'p3' },
    ],
  };

  it('resolves an item\'s zone from its outlet, declaration, or (older items) its connection', () => {
    expect(['R-BY', 'GHOST', 'CORD_FY', 'SKULL_BY'].map((id) => itemZone(id, input))).toEqual(['BY', 'FY', 'FY', 'BY']);
  });

  it('builds one graph per zone with only that zone\'s outlet and items', () => {
    expect(deriveGraph(filterToZone(input, 'FY')).nodes.map((n) => n.id).sort()).toEqual(['CORD_FY', 'GHOST', 'LOOSE_FY', 'RECEP', 'SPOT_FY']);
    expect(deriveGraph(filterToZone(input, 'BY')).nodes.map((n) => n.id).sort()).toEqual(['R-BY', 'SKULL_BY']);
  });

  it('drops an illuminates link to a prop in another zone', () => {
    const edges = deriveGraph(filterToZone(input, 'FY')).edges.filter((e) => e.data!.kind === 'illuminates');
    expect(edges.map((e) => e.target)).toEqual(['GHOST']);
  });

  it('shows a picker-added accessory in the zone it was added in', () => {
    expect(deriveGraph(filterToZone(input, 'BY', ['CORD_NEW'])).nodes.some((n) => n.id === 'CORD_NEW')).toBe(true);
  });

  it('counts unwired only for declared items that can take power — never static props', () => {
    expect(zoneSummary(input, 'FY')).toEqual({ items: 4, unwired: 2 }); // ghost + loose
    expect(zoneSummary(input, 'BY')).toEqual({ items: 1, unwired: 0 }); // a static prop can never be wired
  });

  it('treats an accessory wired in any zone as in use', () => {
    expect([...itemsInUse(input)].sort()).toEqual(['CORD_FY', 'GHOST', 'LOOSE_FY', 'RECEP', 'SKULL_BY', 'SPOT_FY']);
  });
});
