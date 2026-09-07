/**
 * L1 — pure layout logic for the deployment power-topology graph (#466).
 *
 *   npx vitest run --dir subs/deployments/tests/unit
 */
import { describe, it, expect } from 'vitest';
import { deriveGraph, type GraphInput } from '../../src/lib/graphDerivation';
import { layoutGraph } from '../../src/lib/graphLayout';

const ZONES = {
  FY: { zone_code: 'FY', zone_name: 'Front Yard', receptacle_id: 'REC-FY-001' },
  BY: { zone_code: 'BY', zone_name: 'Back Yard', receptacle_id: 'REC-BY-001' },
};

describe('layoutGraph', () => {
  it('places each root at depth 0 and its children in deeper tiers with increasing y', () => {
    const input: GraphInput = {
      zones: ZONES,
      items: {
        'CORD-1': { id: 'CORD-1', class_type: 'Cord' },
        'LOAD-1': { id: 'LOAD-1', class_type: 'Inflatable', power_data: { amps: 2 } },
      },
      connections: [
        { from_item_id: 'REC-FY-001', to_item_id: 'CORD-1', connection_type: 'deployment' },
        { from_item_id: 'CORD-1', to_item_id: 'LOAD-1', connection_type: 'deployment' },
      ],
      placements: [],
    };
    const { nodes, edges } = deriveGraph(input);
    const laidOut = layoutGraph(nodes, edges);

    const root = laidOut.find((n) => n.id === 'REC-FY-001')!;
    const cord = laidOut.find((n) => n.id === 'CORD-1')!;
    const load = laidOut.find((n) => n.id === 'LOAD-1')!;

    expect(root.position.y).toBe(0);
    expect(cord.position.y).toBeGreaterThan(root.position.y);
    expect(load.position.y).toBeGreaterThan(cord.position.y);
  });

  it('separates disconnected zone roots into distinct horizontal bands', () => {
    const input: GraphInput = { zones: ZONES, items: {}, connections: [], placements: [] };
    const { nodes, edges } = deriveGraph(input);
    const laidOut = layoutGraph(nodes, edges);

    const fy = laidOut.find((n) => n.id === 'REC-FY-001')!;
    const by = laidOut.find((n) => n.id === 'REC-BY-001')!;
    expect(fy.position.x).not.toBe(by.position.x);
  });

  it('never leaves a node at the (0,0) default when it has no outgoing/incoming reach beyond its root', () => {
    const input: GraphInput = {
      zones: ZONES,
      items: { 'PROP-1': { id: 'PROP-1', class_type: 'Static Prop' } },
      connections: [],
      placements: [{ item_id: 'PROP-1', zone_code: 'FY', placement_type: 'deployment' }],
    };
    const { nodes, edges } = deriveGraph(input);
    const laidOut = layoutGraph(nodes, edges);
    const prop = laidOut.find((n) => n.id === 'PROP-1')!;
    expect(prop.position.y).toBeGreaterThan(0);
  });
});
