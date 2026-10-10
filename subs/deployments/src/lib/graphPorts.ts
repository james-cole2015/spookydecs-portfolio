/**
 * Port availability + authoring rules for the drag-to-connect graph (#638).
 *
 * Pure functions over the same GraphInput deriveGraph consumes. The graph never
 * offers a handle that would produce an invalid connection — the server guards
 * (to_port validity #627, target dedupe #628, source port in use) are the backstop,
 * not the primary UX.
 *
 * Ports are auto-assigned, one handle per side: the first free Female_N on the
 * source, and Male_1 / Power_Inlet on the target.
 */
import type { Node } from '@xyflow/react';
import type { GraphConnection, GraphInput, GraphItem, GraphNodeData } from './graphDerivation';

const activeConns = (input: GraphInput): GraphConnection[] =>
  input.connections.filter((c) => (c.connection_type ?? 'deployment') === 'deployment');

function rootZone(id: string, input: GraphInput): string | undefined {
  return Object.values(input.zones).find((z) => z.receptacle_ids.includes(id))?.zone_code;
}

/** Free Female_N ports on a node (receptacle or item), in order. Unknown female_ends => none (fail closed). */
export function freeFemalePorts(nodeId: string, input: GraphInput): string[] {
  const total = Number(input.items[nodeId]?.female_ends) || 0;
  const used = new Set(activeConns(input).filter((c) => c.from_item_id === nodeId).map((c) => c.from_port));
  return Array.from({ length: total }, (_, i) => `Female_${i + 1}`).filter((p) => !used.has(p));
}

/** The port a connection plugs into on this item, or null if it can't receive power. */
export function targetPortFor(item: GraphItem | undefined): 'Male_1' | 'Power_Inlet' | null {
  if (!item) return null;
  if ((Number(item.male_ends) || 0) > 0) return 'Male_1';
  if (item.power_inlet === true) return 'Power_Inlet';
  return null;
}

/** An item can be a connection target at most once per deployment (#628). */
export function canReceive(nodeId: string, input: GraphInput): boolean {
  if (rootZone(nodeId, input)) return false;
  if (!targetPortFor(input.items[nodeId])) return false;
  return !activeConns(input).some((c) => c.to_item_id === nodeId);
}

/** The connection a light's illuminates[] lives on — the one where the light is the target. */
export function connectionPoweringLight(nodeId: string, input: GraphInput): GraphConnection | undefined {
  return activeConns(input).find((c) => c.to_item_id === nodeId);
}

export function isLight(item: GraphItem | undefined): boolean {
  return item?.class === 'Light';
}

/** Zone a node belongs to: a hub's own zone, else its declaration, else the zone of its inbound connection. */
export function zoneOfNode(nodeId: string, input: GraphInput): string | undefined {
  return (
    rootZone(nodeId, input) ||
    input.placements.find((p) => p.item_id === nodeId && (p.placement_type ?? 'deployment') === 'deployment')?.zone_code ||
    activeConns(input).find((c) => c.to_item_id === nodeId)?.zone_code
  );
}

/** Stamp authoring flags onto derived nodes. No-op flags (all false) when not editable. */
export function decorateNodes(
  nodes: Node<GraphNodeData>[],
  input: GraphInput,
  editable: boolean,
): Node<GraphNodeData>[] {
  return nodes.map((n) => {
    if (!editable || n.data.kind === 'placeholder') return { ...n, data: { ...n.data, editable: false } };
    const isHub = n.data.kind === 'hub';
    return {
      ...n,
      data: {
        ...n.data,
        editable: true,
        canSource: freeFemalePorts(n.id, input).length > 0,
        canTarget: !isHub && canReceive(n.id, input),
        canIlluminate: !isHub && isLight(input.items[n.id]) && !!connectionPoweringLight(n.id, input),
        canBeLit: !isHub && input.items[n.id]?.class === 'Decoration',
      },
    };
  });
}

// ---- Per-zone scoping (#638) -------------------------------------------------------------
// Each graph shows one zone: a zone is a physically separate setup with its own outlets and
// breaker, and wiring never crosses zones.

/**
 * The zone an item belongs to: a receptacle's own zone, else where it is declared, else the
 * zone of any active connection touching it (older items were wired without being declared).
 */
export function itemZone(id: string, input: GraphInput): string | undefined {
  return (
    rootZone(id, input) ||
    input.placements.find((p) => p.item_id === id && (p.placement_type ?? 'deployment') === 'deployment')?.zone_code ||
    activeConns(input).find((c) => c.from_item_id === id || c.to_item_id === id)?.zone_code
  );
}

/** Narrow a deployment-wide input to a single zone's graph. `pendingIds` are the picker-added accessories shown there. */
export function filterToZone(input: GraphInput, zone: string, pendingIds: string[] = []): GraphInput {
  const sameZoneOrUnknown = (id: string) => {
    const z = itemZone(id, input);
    return !z || z === zone;
  };
  return {
    ...input,
    zones: input.zones[zone] ? { [zone]: input.zones[zone] } : {},
    connections: input.connections
      .filter((c) => c.zone_code === zone)
      .map((c) => ({ ...c, illuminates: (c.illuminates || []).filter(sameZoneOrUnknown) })),
    placements: input.placements.filter((p) => p.zone_code === zone),
    pending: pendingIds,
  };
}

/** Counts shown on a zone's tab: items on the canvas and how many declared items still have no connection. */
export function zoneSummary(input: GraphInput, zone: string): { items: number; unwired: number } {
  const scoped = filterToZone(input, zone);
  const roots = new Set(Object.values(scoped.zones).flatMap((z) => z.receptacle_ids));
  const conns = activeConns(scoped);
  const declared = scoped.placements
    .filter((p) => (p.placement_type ?? 'deployment') === 'deployment')
    .map((p) => p.item_id);
  const ids = new Set<string>(declared);
  conns.forEach((c) => {
    ids.add(c.from_item_id);
    ids.add(c.to_item_id);
  });
  roots.forEach((r) => ids.delete(r));
  const wired = new Set<string>(conns.flatMap((c) => [c.from_item_id, c.to_item_id]));
  return { items: ids.size, unwired: declared.filter((id) => !wired.has(id)).length };
}

/** Every item id on any zone's canvas — an accessory already in use in one zone isn't offered for another. */
export function itemsInUse(input: GraphInput): Set<string> {
  const ids = new Set<string>();
  input.placements
    .filter((p) => (p.placement_type ?? 'deployment') === 'deployment')
    .forEach((p) => ids.add(p.item_id));
  activeConns(input).forEach((c) => {
    ids.add(c.from_item_id);
    ids.add(c.to_item_id);
  });
  return ids;
}
