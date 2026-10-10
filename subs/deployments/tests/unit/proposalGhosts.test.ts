/**
 * L1 — proposal ghost overlay (#639).
 *
 *   npx vitest run --dir subs/deployments/tests/unit
 */
import { describe, it, expect } from 'vitest';
import type { GraphInput } from '../../src/lib/graphDerivation';
import { deriveGraph } from '../../src/lib/graphDerivation';
import { applyProposalToGraph, styleGhosts } from '../../src/lib/proposalGhosts';
import { defaultIncluded, type ProposalRow } from '../../src/lib/proposal';

const base = (): GraphInput => ({
  zones: { FY: { zone_code: 'FY', zone_name: 'Front Yard', receptacle_ids: ['OUT'] } },
  items: {
    OUT: { id: 'OUT', female_ends: 2 },
    CORD: { id: 'CORD', class: 'Accessory', class_type: 'Cord', male_ends: 1, female_ends: 3 },
    SPOT: { id: 'SPOT', class: 'Light', power_inlet: true },
  },
  connections: [
    { connection_id: 'c1', from_item_id: 'OUT', from_port: 'Female_1', to_item_id: 'CORD', to_port: 'Male_1', zone_code: 'FY' },
    { connection_id: 'c2', from_item_id: 'CORD', from_port: 'Female_1', to_item_id: 'SPOT', to_port: 'Power_Inlet', zone_code: 'FY' },
  ],
  placements: [{ placement_id: 'p1', item_id: 'SPOT', zone_code: 'FY' }],
});

const row = (r: Partial<ProposalRow> & Pick<ProposalRow, 'row_id' | 'op'>): ProposalRow => ({
  destructive: false,
  valid: true,
  problems: [],
  warnings: [],
  ...r,
});

const GHOST = { id: 'GHOST', short_name: 'Ghost', class: 'Decoration', male_ends: 1 };

describe('applyProposalToGraph', () => {
  it('adds a declared item that is not on the graph yet as a ghost node', () => {
    const o = applyProposalToGraph(base(), [row({ row_id: 'r1', op: 'declare', item_id: 'GHOST' })], new Set(['r1']), 'FY', { GHOST });
    expect(o.addedNodes.has('GHOST')).toBe(true);
    expect(deriveGraph(o.input).nodes.some((n) => n.id === 'GHOST')).toBe(true);
  });

  it('excluded and invalid rows leave no ghost', () => {
    const rows = [row({ row_id: 'r1', op: 'declare', item_id: 'GHOST' }), row({ row_id: 'r2', op: 'declare', item_id: 'GHOST', valid: false })];
    expect(applyProposalToGraph(base(), rows, new Set(['r2']), 'FY', { GHOST }).addedNodes.size).toBe(0);
    expect(applyProposalToGraph(base(), rows, new Set(), 'FY', { GHOST }).addedNodes.size).toBe(0);
  });

  it('a connect row adds a ghost edge and a ghost node for the new endpoint', () => {
    const o = applyProposalToGraph(
      base(),
      [row({ row_id: 'r1', op: 'connect', from_item_id: 'CORD', to_item_id: 'GHOST', from_port: 'Female_2', to_port: 'Male_1' })],
      new Set(['r1']),
      'FY',
      { GHOST },
    );
    const { edges } = deriveGraph(o.input);
    expect(o.addedEdges.has('ghost-r1')).toBe(true);
    expect(edges.some((e) => e.id === 'ghost-r1')).toBe(true);
    expect(o.addedNodes.has('GHOST')).toBe(true);
  });

  it('an illuminate row ghosts the annotation edge', () => {
    const o = applyProposalToGraph(
      base(),
      [row({ row_id: 'r1', op: 'illuminate', item_id: 'SPOT', illuminates: ['GHOST'], target_ref: { connection_id: 'c2' } })],
      new Set(['r1']),
      'FY',
      { GHOST },
    );
    expect(deriveGraph(o.input).edges.some((e) => e.id === 'illum:c2:GHOST')).toBe(true);
    expect(o.addedEdges.has('illum:c2:GHOST')).toBe(true);
  });

  it('removal rows mark existing things as removed without deleting them', () => {
    const rows = [
      row({ row_id: 'r1', op: 'undeclare', item_id: 'SPOT', destructive: true }),
      row({ row_id: 'r2', op: 'disconnect', destructive: true, target_ref: { connection_id: 'c1' } }),
    ];
    const o = applyProposalToGraph(base(), rows, new Set(['r1', 'r2']), 'FY');
    expect(o.removedNodes.has('SPOT') && o.removedEdges.has('c1')).toBe(true);
    expect(o.input.connections).toHaveLength(2);
  });

  it('does not mutate the input', () => {
    const input = base();
    const snap = JSON.stringify(input);
    applyProposalToGraph(input, [row({ row_id: 'r1', op: 'illuminate', item_id: 'SPOT', illuminates: ['GHOST'] })], new Set(['r1']), 'FY', { GHOST });
    expect(JSON.stringify(input)).toBe(snap);
  });

  it('styleGhosts dims added nodes and dashes added edges', () => {
    const o = applyProposalToGraph(base(), [row({ row_id: 'r1', op: 'declare', item_id: 'GHOST' })], new Set(['r1']), 'FY', { GHOST });
    const d = deriveGraph(o.input);
    const s = styleGhosts(d.nodes, d.edges, o);
    expect(s.nodes.find((n) => n.id === 'GHOST')!.className).toBe('proposal-ghost');
    expect(s.nodes.find((n) => n.id === 'SPOT')!.className).toBeUndefined();
  });
});

describe('defaultIncluded', () => {
  it('includes valid non-destructive rows only', () => {
    const rows = [
      row({ row_id: 'a', op: 'declare' }),
      row({ row_id: 'b', op: 'undeclare', destructive: true }),
      row({ row_id: 'c', op: 'declare', valid: false }),
    ];
    expect([...defaultIncluded(rows)]).toEqual(['a']);
  });
});
