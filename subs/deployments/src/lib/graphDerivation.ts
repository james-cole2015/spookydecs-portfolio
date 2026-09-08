/**
 * Topology derivation — raw deployment records → React Flow nodes/edges.
 *
 * Runs identically over live-derived data (active deployments) and frozen
 * `graph_snapshot` data (completed/archived deployments) — see #466 plan §3.
 * One function, one set of derivation rules, no duplicated logic between the
 * live and snapshot paths.
 */
import type { Node, Edge } from '@xyflow/react';
import { OVERLOAD_AMPS_THRESHOLD } from '../config/deploymentsConfig';

// Leaf load class_types that carry power_data (backend: POWER_DATA_CLASS_TYPES
// in lambdas-spookydecs/handlers/items/transforms.py). Cord/Plug are pass-through
// edges, not loads, and never carry power_data — see plan Approach §0.
const LOAD_CLASS_TYPES = new Set(['Inflatable', 'Animatronic', 'String Light', 'Spot Light']);

export interface GraphZone {
  zone_code: string;
  zone_name: string;
  receptacle_id: string;
}

export interface GraphItem {
  id: string;
  short_name?: string;
  class?: string;
  class_type?: string;
  status?: string;
  power_data?: { watts?: number | string; amps?: number | string };
  male_ends?: string | number;
  female_ends?: string | number;
  length?: string | number;
  images?: { primary_photo_id?: string };
}

export interface GraphConnection {
  connection_id?: string;
  from_item_id: string;
  to_item_id: string;
  from_port?: string;
  to_port?: string;
  photo_ids?: string[];
  connection_type?: 'deployment' | 'removal';
  zone_code?: string;
  /** Item ids this connection's to_item (typically a spotlight) illuminates. */
  illuminates?: string[];
}

export interface GraphPlacement {
  placement_id?: string;
  item_id: string;
  zone_code: string;
  placement_type?: 'deployment' | 'removal';
  photo_ids?: string[];
}

export interface GraphInput {
  zones: Record<string, GraphZone>;
  items: Record<string, GraphItem | undefined>;
  connections: GraphConnection[];
  placements: GraphPlacement[];
}

export type GraphNodeKind = 'hub' | 'load' | 'branch' | 'placeholder';

export interface GraphNodeData extends Record<string, unknown> {
  kind: GraphNodeKind;
  label: string;
  classType?: string;
  hasPowerData: boolean;
  item?: GraphItem;
  zone?: GraphZone;
  femaleEnds?: number;
  /** Per-outlet amp rollup (hub nodes only). */
  rollupAmps?: number;
  overloaded?: boolean;
}

export interface GraphEdgeData extends Record<string, unknown> {
  powered: boolean;
  label: string;
  connection?: GraphConnection;
  placement?: GraphPlacement;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * True when a load item carries a real (non-empty) amps reading. Seed/live
 * data can carry `power_data: { amps: '', watts: '' }` on an item that has
 * the field but was never filled in — that's "no power_data" for rendering
 * purposes, not a real 0A reading, so an empty string must not pass `!= null`.
 */
function hasResolvableAmps(item: GraphItem | undefined): boolean {
  if (!item || !LOAD_CLASS_TYPES.has(item.class_type || '')) return false;
  const amps = item.power_data?.amps;
  return amps != null && amps !== '';
}

function edgeLabel(item: GraphItem | undefined, length?: string | number): { label: string; powered: boolean } {
  if (hasResolvableAmps(item)) {
    const { amps, watts } = item!.power_data!;
    const lenPart = length != null && length !== '' ? `${length} · ` : '';
    const wattsPart = watts != null && watts !== '' ? `/${watts}W` : '';
    return { label: `${lenPart}${amps}A${wattsPart}`, powered: true };
  }
  const lenPart = length != null && length !== '' ? String(length) : 'no power_data';
  return { label: lenPart, powered: false };
}

/**
 * Resolves the node id a connection/placement's edge should terminate FROM/TO,
 * treating a zone's synthetic receptacle_id as a valid endpoint (never an item).
 */
function isRootId(id: string, zones: Record<string, GraphZone>): boolean {
  return Object.values(zones).some((z) => z.receptacle_id === id);
}

export function deriveGraph(input: GraphInput): { nodes: Node<GraphNodeData>[]; edges: Edge<GraphEdgeData>[] } {
  const { zones, items, connections, placements } = input;
  const nodes: Node<GraphNodeData>[] = [];
  const edges: Edge<GraphEdgeData>[] = [];
  const seenNodeIds = new Set<string>();

  const addNode = (id: string, data: GraphNodeData) => {
    if (seenNodeIds.has(id)) return;
    seenNodeIds.add(id);
    nodes.push({ id, type: data.kind, position: { x: 0, y: 0 }, data });
  };

  // Root nodes — one per zone circuit source. Never resolved via items table.
  Object.values(zones).forEach((zone) => {
    addNode(zone.receptacle_id, {
      kind: 'hub',
      label: `Wall Outlet — ${zone.zone_name}`,
      hasPowerData: false,
      zone,
      rollupAmps: 0,
      overloaded: false,
    });
  });

  const nodeKindFor = (id: string): GraphNodeData['kind'] => {
    if (isRootId(id, zones)) return 'hub';
    const item = items[id];
    if (!item) return 'placeholder';
    const femaleEnds = toNumber(item.female_ends);
    if (femaleEnds > 1) return 'branch';
    return 'load';
  };

  const ensureItemNode = (id: string) => {
    if (isRootId(id, zones)) return; // already added above
    const item = items[id];
    const kind = nodeKindFor(id);

    if (kind === 'placeholder') {
      addNode(id, {
        kind: 'placeholder',
        label: 'Item retired',
        hasPowerData: false,
      });
      return;
    }

    const femaleEnds = toNumber(item!.female_ends);
    const hasPowerData = hasResolvableAmps(item);

    addNode(id, {
      kind,
      label: item!.short_name || item!.id,
      classType: item!.class_type,
      hasPowerData,
      item,
      femaleEnds: kind === 'branch' ? femaleEnds : undefined,
    });
  };

  // Active connections -> edges (source may be a zone root or another item/cord).
  connections
    .filter((c) => (c.connection_type ?? 'deployment') === 'deployment')
    .forEach((conn) => {
      ensureItemNode(conn.from_item_id);
      ensureItemNode(conn.to_item_id);
      const destItem = items[conn.to_item_id];
      const { label, powered } = edgeLabel(destItem, destItem?.length);
      edges.push({
        id: conn.connection_id || `${conn.from_item_id}->${conn.to_item_id}`,
        source: conn.from_item_id,
        target: conn.to_item_id,
        label,
        data: { powered, label, connection: conn },
      });
    });

  // Active placements -> edges from the zone root directly to a static (no-power) item.
  placements
    .filter((p) => (p.placement_type ?? 'deployment') === 'deployment')
    .forEach((placement) => {
      const zone = zones[placement.zone_code];
      if (!zone) return;
      ensureItemNode(placement.item_id);
      const { label, powered } = edgeLabel(items[placement.item_id]);
      edges.push({
        id: placement.placement_id || `${zone.receptacle_id}->${placement.item_id}`,
        source: zone.receptacle_id,
        target: placement.item_id,
        label,
        data: { powered, label, placement },
      });
    });

  // Per-outlet amp rollup: sum of resolved load power_data.amps reachable from each root.
  const adjacency = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!e.source || !e.target) return;
    const list = adjacency.get(e.source) || [];
    list.push(e.target);
    adjacency.set(e.source, list);
  });

  const rollupFor = (rootId: string): number => {
    const visited = new Set<string>([rootId]);
    const stack = [...(adjacency.get(rootId) || [])];
    let amps = 0;
    while (stack.length) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const item = items[id];
      if (hasResolvableAmps(item)) {
        amps += toNumber(item!.power_data!.amps);
      }
      stack.push(...(adjacency.get(id) || []));
    }
    return amps;
  };

  nodes.forEach((n) => {
    if (n.data.kind !== 'hub' || !n.data.zone) return;
    const rollupAmps = rollupFor(n.id);
    n.data.rollupAmps = rollupAmps;
    n.data.overloaded = rollupAmps > OVERLOAD_AMPS_THRESHOLD;
  });

  return { nodes, edges };
}
