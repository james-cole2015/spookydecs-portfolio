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

const GAP_X = 40;
const GAP_Y = 50;
const BAND_GAP = 120;

// Per-kind footprint, matching the node components. Cords are compact pills, so a chain of
// them doesn't take the space of a chain of cards.
const SIZE: Record<string, { w: number; h: number }> = {
  hub: { w: 200, h: 110 },
  load: { w: 220, h: 110 },
  light: { w: 200, h: 100 },
  branch: { w: 200, h: 96 },
  cord: { w: 150, h: 44 },
  placeholder: { w: 200, h: 80 },
};
const sizeOf = (kind: string) => SIZE[kind] || SIZE.load;

export function layoutGraph(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
): Node<GraphNodeData>[] {
  const kindOf = new Map(nodes.map((n) => [n.id, n.data.kind as string]));
  const adjacency = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!e.source || !e.target) return;
    const list = adjacency.get(e.source) || [];
    list.push(e.target);
    adjacency.set(e.source, list);
  });

  const roots = nodes.filter((n) => n.data.kind === 'hub');
  const tierByRoot = new Map<string, Map<number, string[]>>();

  roots.forEach((root) => {
    const tiers = new Map<number, string[]>();
    tierByRoot.set(root.id, tiers);
    const visited = new Set<string>([root.id]);
    let frontier = [root.id];
    let depth = 0;
    tiers.set(0, [root.id]);
    while (frontier.length) {
      depth += 1;
      const next: string[] = [];
      frontier.forEach((id) => {
        (adjacency.get(id) || []).forEach((childId) => {
          if (visited.has(childId)) return;
          visited.add(childId);
          next.push(childId);
        });
      });
      if (next.length) tiers.set(depth, next);
      frontier = next;
    }
  });

  const rowWidth = (ids: string[]) =>
    ids.reduce((sum, id) => sum + sizeOf(kindOf.get(id) || '').w, 0) + Math.max(0, ids.length - 1) * GAP_X;
  const rowHeight = (ids: string[]) => Math.max(...ids.map((id) => sizeOf(kindOf.get(id) || '').h));

  const positioned = new Map<string, { x: number; y: number }>();
  let bandX = 0;
  let maxBottom = 0;

  roots.forEach((root) => {
    const tiers = tierByRoot.get(root.id)!;
    const ordered = Array.from(tiers.entries()).sort((a, b) => a[0] - b[0]);
    const bandWidth = Math.max(...ordered.map(([, ids]) => rowWidth(ids)), SIZE.hub.w);
    let y = 0;
    ordered.forEach(([, ids]) => {
      let x = bandX + (bandWidth - rowWidth(ids)) / 2;
      ids.forEach((id) => {
        positioned.set(id, { x, y });
        x += sizeOf(kindOf.get(id) || '').w + GAP_X;
      });
      y += rowHeight(ids) + GAP_Y;
    });
    maxBottom = Math.max(maxBottom, y);
    bandX += bandWidth + BAND_GAP;
  });

  // Declared-but-unconnected nodes (#638) aren't reachable from any zone root, so give
  // them a row below the bands. They are the drag sources / targets for authoring, so they
  // must be visible rather than stacked at the origin.
  const orphans = nodes.filter((n) => !positioned.has(n.id));
  if (orphans.length > 0) {
    const rowY = maxBottom + BAND_GAP / 2;
    let x = 0;
    orphans.forEach((n) => {
      positioned.set(n.id, { x, y: rowY });
      x += sizeOf(n.data.kind).w + GAP_X;
    });
  }

  return nodes.map((n) => ({
    ...n,
    position: positioned.get(n.id) || n.position,
  }));
}
