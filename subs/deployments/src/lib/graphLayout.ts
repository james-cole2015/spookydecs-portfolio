/**
 * BFS-tier auto-layout for the deployment power-topology graph (#466).
 *
 * Hand-rolled rather than pulling in dagre/elkjs — chains are shallow (root ->
 * cord/plug chain -> load, rarely more than a few hops) per plan Approach §2.
 * Each zone root gets its own horizontal band; within a band, nodes are
 * stacked top-to-bottom by BFS depth from that root, and spread left-to-right
 * within a depth tier.
 */
import type { Node, Edge } from '@xyflow/react';
import type { GraphNodeData } from './graphDerivation';

const NODE_W = 200;
const NODE_H = 110;
const GAP_X = 40;
const GAP_Y = 60;
const BAND_GAP = 120;

export function layoutGraph(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
): Node<GraphNodeData>[] {
  const adjacency = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!e.source || !e.target) return;
    const list = adjacency.get(e.source) || [];
    list.push(e.target);
    adjacency.set(e.source, list);
  });

  const roots = nodes.filter((n) => n.data.kind === 'hub');
  const depthOf = new Map<string, number>();
  const tierByRoot = new Map<string, Map<number, string[]>>();

  roots.forEach((root) => {
    const tiers = new Map<number, string[]>();
    tierByRoot.set(root.id, tiers);
    const visited = new Set<string>([root.id]);
    let frontier = [root.id];
    let depth = 0;
    tiers.set(0, [root.id]);
    depthOf.set(root.id, 0);
    while (frontier.length) {
      depth += 1;
      const next: string[] = [];
      frontier.forEach((id) => {
        (adjacency.get(id) || []).forEach((childId) => {
          if (visited.has(childId)) return;
          visited.add(childId);
          next.push(childId);
          depthOf.set(childId, depth);
        });
      });
      if (next.length) tiers.set(depth, next);
      frontier = next;
    }
  });

  const positioned = new Map<string, { x: number; y: number }>();
  let bandX = 0;

  roots.forEach((root) => {
    const tiers = tierByRoot.get(root.id)!;
    const bandWidth = Math.max(
      ...Array.from(tiers.values()).map((ids) => ids.length * (NODE_W + GAP_X)),
      NODE_W,
    );
    tiers.forEach((ids, depth) => {
      const rowWidth = ids.length * (NODE_W + GAP_X) - GAP_X;
      const startX = bandX + (bandWidth - rowWidth) / 2;
      ids.forEach((id, i) => {
        positioned.set(id, {
          x: startX + i * (NODE_W + GAP_X),
          y: depth * (NODE_H + GAP_Y),
        });
      });
    });
    bandX += bandWidth + BAND_GAP;
  });

  return nodes.map((n) => ({
    ...n,
    position: positioned.get(n.id) || n.position,
  }));
}
