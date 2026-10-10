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
        canBeLit: !isHub,
      },
    };
  });
}
