/**
 * Overlay a proposal's included rows onto the zone graph as ghosts (#639).
 *
 * Pure: returns a new GraphInput plus the ids to style. Added things render dashed and
 * translucent; things a removal row would take away render struck-back (greyed). The existing
 * derive/layout pipeline is untouched — ghosts are ordinary placements/connections with
 * reserved ids, styled afterwards by `styleGhosts`.
 */
import type { Edge, Node } from '@xyflow/react';
import type { GraphConnection, GraphEdgeData, GraphInput, GraphItem, GraphNodeData } from './graphDerivation';
import type { ProposalRow } from './proposal';

export const GHOST_PREFIX = 'ghost-';

export interface GhostOverlay {
  input: GraphInput;
  addedNodes: Set<string>;
  removedNodes: Set<string>;
  addedEdges: Set<string>;
  removedEdges: Set<string>;
}

const isActive = (c: GraphConnection) => (c.connection_type ?? 'deployment') === 'deployment';

export function applyProposalToGraph(
  input: GraphInput,
  rows: ProposalRow[],
  included: Set<string>,
  zone: string,
  proposalItems: Record<string, GraphItem> = {},
): GhostOverlay {
  const items = { ...input.items };
  Object.entries(proposalItems).forEach(([id, it]) => {
    if (!items[id]) items[id] = it;
  });
  let connections = input.connections.map((c) => ({ ...c, illuminates: [...(c.illuminates || [])] }));
  let placements = [...input.placements];
  const out: GhostOverlay = {
    input,
    addedNodes: new Set(),
    removedNodes: new Set(),
    addedEdges: new Set(),
    removedEdges: new Set(),
  };

  const nodesBefore = new Set<string>([
    ...placements.map((p) => p.item_id),
    ...connections.flatMap((c) => [c.from_item_id, c.to_item_id]),
  ]);
  const markAdded = (id?: string) => {
    if (id && !nodesBefore.has(id)) out.addedNodes.add(id);
  };

  rows
    .filter((r) => r.valid && included.has(r.row_id))
    .forEach((r) => {
      const gid = `${GHOST_PREFIX}${r.row_id}`;
      switch (r.op) {
        case 'declare':
          placements.push({ placement_id: gid, item_id: r.item_id!, zone_code: zone });
          markAdded(r.item_id);
          break;
        case 'undeclare':
          if (r.item_id) out.removedNodes.add(r.item_id);
          break;
        case 'connect':
          connections.push({
            connection_id: gid,
            from_item_id: r.from_item_id!,
            to_item_id: r.to_item_id!,
            from_port: r.from_port,
            to_port: r.to_port,
            zone_code: zone,
            illuminates: [],
          });
          markAdded(r.from_item_id);
          markAdded(r.to_item_id);
          out.addedEdges.add(gid);
          break;
        case 'disconnect': {
          const id = r.target_ref?.connection_id;
          if (id) out.removedEdges.add(id);
          break;
        }
        case 'illuminate':
        case 'unilluminate': {
          const conn = connections.find(
            (c) => isActive(c) && (c.connection_id === r.target_ref?.connection_id || c.to_item_id === r.item_id),
          );
          if (!conn) break;
          const cid = conn.connection_id || conn.to_item_id;
          (r.illuminates || []).forEach((lit) => {
            const edgeId = `illum:${cid}:${lit}`;
            if (r.op === 'illuminate') {
              if (!conn.illuminates!.includes(lit)) {
                conn.illuminates!.push(lit);
                markAdded(lit);
                out.addedEdges.add(edgeId);
              }
            } else {
              out.removedEdges.add(edgeId);
            }
          });
          break;
        }
      }
    });

  out.input = { ...input, items, connections, placements };
  return out;
}

const GHOST_ADD_STROKE = 'hsl(var(--heroui-secondary))';
const GHOST_REMOVE_STROKE = 'hsl(var(--heroui-danger))';

/** Style the derived nodes/edges: added = dashed + translucent, removed = faded with a danger edge. */
export function styleGhosts(
  nodes: Node<GraphNodeData>[],
  edges: Edge<GraphEdgeData>[],
  overlay: GhostOverlay,
): { nodes: Node<GraphNodeData>[]; edges: Edge<GraphEdgeData>[] } {
  return {
    nodes: nodes.map((n) =>
      overlay.addedNodes.has(n.id)
        ? { ...n, style: { ...n.style, opacity: 0.55 }, className: 'proposal-ghost' }
        : overlay.removedNodes.has(n.id)
          ? { ...n, style: { ...n.style, opacity: 0.35, filter: 'grayscale(1)' }, className: 'proposal-removed' }
          : n,
    ),
    edges: edges.map((e) =>
      overlay.addedEdges.has(e.id)
        ? { ...e, style: { ...e.style, stroke: GHOST_ADD_STROKE, strokeWidth: 2, strokeDasharray: '4 4', opacity: 0.8 } }
        : overlay.removedEdges.has(e.id)
          ? { ...e, style: { ...e.style, stroke: GHOST_REMOVE_STROKE, strokeWidth: 2, strokeDasharray: '2 6', opacity: 0.6 } }
          : e,
    ),
  };
}
