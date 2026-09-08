/**
 * L1 — pure derivation logic for the deployment power-topology graph (#466).
 *
 *   npx vitest run --dir subs/deployments/tests/unit
 */
import { describe, it, expect } from 'vitest';
import { deriveGraph, type GraphInput } from '../../src/lib/graphDerivation';

const ZONE = { zone_code: 'FY', zone_name: 'Front Yard', receptacle_id: 'REC-FY-001' };

function baseInput(overrides: Partial<GraphInput> = {}): GraphInput {
  return {
    zones: { FY: ZONE },
    items: {},
    connections: [],
    placements: [],
    ...overrides,
  };
}

describe('deriveGraph — root nodes', () => {
  it('adds one hub node per zone, never resolved as an item', () => {
    const { nodes } = deriveGraph(baseInput());
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ id: 'REC-FY-001', data: { kind: 'hub' } });
  });
});

describe('deriveGraph — branch nodes', () => {
  it('collapses a female_ends > 1 cord into a single branch node with fan-out edges', () => {
    const input = baseInput({
      items: {
        'CORD-1': { id: 'CORD-1', short_name: 'Extension Cord', class_type: 'Cord', female_ends: 2 },
        'LOAD-1': { id: 'LOAD-1', short_name: 'Skeleton', class_type: 'Inflatable', power_data: { amps: 2, watts: 240 } },
        'LOAD-2': { id: 'LOAD-2', short_name: 'Spotlight', class_type: 'Spot Light', power_data: { amps: 1, watts: 60 } },
      },
      connections: [
        { from_item_id: 'REC-FY-001', to_item_id: 'CORD-1', connection_type: 'deployment' },
        { from_item_id: 'CORD-1', to_item_id: 'LOAD-1', connection_type: 'deployment' },
        { from_item_id: 'CORD-1', to_item_id: 'LOAD-2', connection_type: 'deployment' },
      ],
    });
    const { nodes, edges } = deriveGraph(input);
    const cordNode = nodes.find((n) => n.id === 'CORD-1');
    expect(cordNode?.data.kind).toBe('branch');
    expect(cordNode?.data.femaleEnds).toBe(2);
    // one node per item — no per-terminal phantom nodes
    expect(nodes.filter((n) => n.id === 'CORD-1')).toHaveLength(1);
    expect(edges.filter((e) => e.source === 'CORD-1')).toHaveLength(2);
  });
});

describe('deriveGraph — missing item placeholder', () => {
  it('renders a placeholder node for a connection referencing a deleted item', () => {
    const input = baseInput({
      items: {}, // LOAD-GONE deliberately absent
      connections: [
        { from_item_id: 'REC-FY-001', to_item_id: 'LOAD-GONE', connection_type: 'deployment' },
      ],
    });
    const { nodes } = deriveGraph(input);
    const placeholder = nodes.find((n) => n.id === 'LOAD-GONE');
    expect(placeholder?.data.kind).toBe('placeholder');
    expect(placeholder?.data.label).toBe('Item retired');
  });
});

describe('deriveGraph — power_data degradation', () => {
  it('treats power_data with empty-string amps/watts as no power_data, not a real 0A reading', () => {
    // Real seed/live data can carry power_data:{amps:'',watts:''} on a load item
    // whose fields were never filled in — this must render the "empty" state,
    // not the powered state with a blank amp value (found via DEP-DEMO-2026).
    const input = baseInput({
      items: {
        'LOAD-1': { id: 'LOAD-1', class_type: 'String Light', power_data: { amps: '', watts: '' } },
      },
      placements: [{ item_id: 'LOAD-1', zone_code: 'FY', placement_type: 'deployment' }],
    });
    const { nodes, edges } = deriveGraph(input);
    const loadNode = nodes.find((n) => n.id === 'LOAD-1');
    expect(loadNode?.data.hasPowerData).toBe(false);
    const edge = edges.find((e) => e.target === 'LOAD-1');
    expect(edge?.data?.powered).toBe(false);
    expect(edge?.data?.label).toBe('no power_data');
  });

  it('renders items without power_data as valid nodes with no amps/watts', () => {
    const input = baseInput({
      items: {
        'PROP-1': { id: 'PROP-1', short_name: 'Tombstone', class_type: 'Static Prop' },
      },
      placements: [{ item_id: 'PROP-1', zone_code: 'FY', placement_type: 'deployment' }],
    });
    const { nodes, edges } = deriveGraph(input);
    const propNode = nodes.find((n) => n.id === 'PROP-1');
    expect(propNode?.data.hasPowerData).toBe(false);
    expect(propNode?.data.kind).toBe('load');
    const edge = edges.find((e) => e.target === 'PROP-1');
    expect(edge?.data?.powered).toBe(false);
    expect(edge?.data?.label).toBe('no power_data');
  });

  it('labels a powered edge with the destination load amps/watts, not the cord', () => {
    const input = baseInput({
      items: {
        'CORD-1': { id: 'CORD-1', class_type: 'Cord', length: '25ft' },
        'LOAD-1': { id: 'LOAD-1', class_type: 'Inflatable', power_data: { amps: 3, watts: 360 } },
      },
      connections: [
        { from_item_id: 'REC-FY-001', to_item_id: 'CORD-1', connection_type: 'deployment' },
        { from_item_id: 'CORD-1', to_item_id: 'LOAD-1', connection_type: 'deployment' },
      ],
    });
    const { edges } = deriveGraph(input);
    const cordToRoot = edges.find((e) => e.source === 'REC-FY-001');
    expect(cordToRoot?.data?.powered).toBe(false); // no load at the near end
    const cordToLoad = edges.find((e) => e.target === 'LOAD-1');
    expect(cordToLoad?.data?.powered).toBe(true);
    expect(cordToLoad?.data?.label).toBe('3A/360W');
  });
});

describe('deriveGraph — per-outlet amp rollup', () => {
  it('sums reachable load amps and flags overload past the threshold', () => {
    const input = baseInput({
      items: {
        'LOAD-1': { id: 'LOAD-1', class_type: 'Inflatable', power_data: { amps: 10 } },
        'LOAD-2': { id: 'LOAD-2', class_type: 'Animatronic', power_data: { amps: 8 } },
      },
      connections: [
        { from_item_id: 'REC-FY-001', to_item_id: 'LOAD-1', connection_type: 'deployment' },
        { from_item_id: 'REC-FY-001', to_item_id: 'LOAD-2', connection_type: 'deployment' },
      ],
    });
    const { nodes } = deriveGraph(input);
    const hub = nodes.find((n) => n.id === 'REC-FY-001');
    expect(hub?.data.rollupAmps).toBe(18);
    expect(hub?.data.overloaded).toBe(true); // > 15A default threshold
  });

  it('does not flag overload under the threshold', () => {
    const input = baseInput({
      items: {
        'LOAD-1': { id: 'LOAD-1', class_type: 'Inflatable', power_data: { amps: 5 } },
      },
      connections: [
        { from_item_id: 'REC-FY-001', to_item_id: 'LOAD-1', connection_type: 'deployment' },
      ],
    });
    const { nodes } = deriveGraph(input);
    const hub = nodes.find((n) => n.id === 'REC-FY-001');
    expect(hub?.data.overloaded).toBe(false);
  });
});

describe('deriveGraph — inactive records excluded', () => {
  it('ignores removal-type connections and placements', () => {
    const input = baseInput({
      items: { 'LOAD-1': { id: 'LOAD-1', class_type: 'Inflatable', power_data: { amps: 2 } } },
      connections: [
        { from_item_id: 'REC-FY-001', to_item_id: 'LOAD-1', connection_type: 'removal' },
      ],
    });
    const { nodes, edges } = deriveGraph(input);
    expect(edges).toHaveLength(0);
    expect(nodes.find((n) => n.id === 'LOAD-1')).toBeUndefined();
  });
});
