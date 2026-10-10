import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  type Connection,
  type Node,
  type NodeChange,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Autocomplete, AutocompleteItem, Chip, Tab, Tabs } from '@heroui/react';
import { Breadcrumbs, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import {
  createConnection,
  getDeployment,
  getDeploymentGraph,
  getHistoricalDeployment,
  removeConnection,
  searchItems,
  updateConnection,
} from '../api/deploymentsApi';
import { DEPLOYMENT_CONFIG } from '../config/deploymentsConfig';
import type { GraphItem } from '../lib/graphDerivation';
import { deriveGraph, type GraphInput, type GraphNodeData, type GraphEdgeData } from '../lib/graphDerivation';
import { layoutGraph } from '../lib/graphLayout';
import {
  connectionPoweringLight,
  decorateNodes,
  filterToZone,
  freeFemalePorts,
  itemsInUse,
  targetPortFor,
  zoneSummary,
} from '../lib/graphPorts';
import HubNode from '../components/graph/HubNode';
import LoadNode from '../components/graph/LoadNode';
import BranchNode from '../components/graph/BranchNode';
import CordNode from '../components/graph/CordNode';
import LightNode from '../components/graph/LightNode';
import PlaceholderNode from '../components/graph/PlaceholderNode';
import GraphLegend from '../components/graph/GraphLegend';
import DetailPanel, { type GraphSelection, type RemoveRequest } from '../components/graph/DetailPanel';

const nodeTypes = {
  hub: HubNode,
  load: LoadNode,
  light: LightNode,
  branch: BranchNode,
  cord: CordNode,
  placeholder: PlaceholderNode,
};

// Edge color via HeroUI CSS vars (design.md F5 — no hardcoded hex).
const POWERED_STROKE = 'hsl(var(--heroui-warning))';
const UNPOWERED_STROKE = 'hsl(var(--heroui-default-300))';

function styleEdges(edges: Edge<GraphEdgeData>[]): Edge<GraphEdgeData>[] {
  return edges.map((e) => ({
    ...e,
    type: 'smoothstep',
    style: e.data?.powered
      ? { stroke: POWERED_STROKE, strokeWidth: 2 }
      : { stroke: UNPOWERED_STROKE, strokeWidth: 2, strokeDasharray: '6 4' },
  }));
}

// Pre-#466 archives have no graph key at all, so this synthesizes an empty
// zone-root per zone for that (very old, best-effort) fallback. DEPLOYMENT_CONFIG
// no longer carries a receptacle_id (#582 — receptacles self-register), so a
// placeholder root id is synthesized here instead; no live receptacle data
// exists for these archives regardless.
function zonesRecord(): GraphInput['zones'] {
  const record: GraphInput['zones'] = {};
  DEPLOYMENT_CONFIG.ZONES.forEach((z) => {
    record[z.zone_code] = { ...z, receptacle_ids: [`ROOT-${z.zone_code}`] };
  });
  return record;
}

type RenderMode = 'live' | 'snapshot' | 'best-effort';

interface LoadedGraph {
  mode: RenderMode;
  input: GraphInput;
  /** Deployment status — authoring is only offered while the deployment is still being set up. */
  status?: string;
  season?: string;
}

const EDITABLE_STATUSES = ['pre-deployment', 'active_setup'];

// Node positions are a per-viewer layout preference, so they live in localStorage (not DDB).
type Positions = Record<string, { x: number; y: number }>;
const posKey = (id: string) => `deployments-graph-pos:${id}`;
function loadPositions(id: string): Positions {
  try {
    return JSON.parse(localStorage.getItem(posKey(id)) || '{}') as Positions;
  } catch {
    return {};
  }
}
function savePositions(id: string, positions: Positions) {
  try {
    localStorage.setItem(posKey(id), JSON.stringify(positions));
  } catch {
    /* storage unavailable — positions just won't persist */
  }
}

async function loadGraph(deploymentId: string): Promise<LoadedGraph> {
  const depRes = await getDeployment(deploymentId);
  // getDeployment always wraps the record as { metadata }; read status/season from there.
  const meta = depRes?.data?.metadata ?? depRes?.data;
  const status = meta?.status;
  const season = meta?.season;

  if (status === 'archived') {
    const histRes = await getHistoricalDeployment(deploymentId);
    const graph = histRes?.data?.graph;
    if (graph?.snapshot) return { mode: 'snapshot', input: graph.snapshot };
    if (graph?.live) return { mode: 'best-effort', input: graph.live };
    // No graph key at all (very old archive, pre-#466 historical handler) — treat as empty.
    return { mode: 'best-effort', input: { zones: zonesRecord(), items: {}, connections: [], placements: [] } };
  }

  const graphRes = await getDeploymentGraph(deploymentId);
  return { mode: 'live', input: graphRes.data as GraphInput, status, season };
}

function ModeChip({ mode }: { mode: RenderMode }) {
  if (mode === 'snapshot') {
    return (
      <Chip size="sm" variant="flat" color="secondary">
        Snapshot on completion
      </Chip>
    );
  }
  if (mode === 'best-effort') {
    return (
      <Chip size="sm" variant="flat" color="warning">
        Best-effort (pre-snapshot archive)
      </Chip>
    );
  }
  return (
    <Chip size="sm" variant="flat" color="success">
      Live view
    </Chip>
  );
}

export default function DeploymentSchematic({ embedded = false }: { embedded?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedGraph | null>(null);
  const [selection, setSelection] = useState<GraphSelection>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveRequest | null>(null);
  const [removing, setRemoving] = useState(false);
  // Accessories added to the canvas from the picker before they're wired (client-only until connected).
  // Accessories added from the picker, each pinned to the zone view it was added in.
  const [pending, setPending] = useState<Record<string, { item: GraphItem; zone: string }>>({});
  const [accessoryOptions, setAccessoryOptions] = useState<GraphItem[]>([]);
  const [accessoryQuery, setAccessoryQuery] = useState('');
  const [positions, setPositions] = useState<Positions>(() => (id ? loadPositions(id) : {}));
  const [flowNodes, setFlowNodes] = useState<Node<GraphNodeData>[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelection(null);
    loadGraph(id)
      .then((result) => {
        if (!cancelled) setLoaded(result);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || 'Failed to load deployment graph.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const editable = !!loaded && loaded.mode === 'live' && EDITABLE_STATUSES.includes(loaded.status || '');

  // One graph per zone (#638). Read-only views (completed / archived) also get an "All" option.
  const zoneCodes = useMemo(() => {
    const codes = Object.keys(loaded?.input.zones || {});
    const order = DEPLOYMENT_CONFIG.ZONES.map((z) => z.zone_code);
    return codes.length ? [...codes].sort((a, b) => order.indexOf(a) - order.indexOf(b)) : order;
  }, [loaded]);
  const zoneParam = params.get('zone');
  const zone = zoneParam === 'ALL' && !editable ? 'ALL' : zoneCodes.includes(zoneParam || '') ? zoneParam! : zoneCodes[0] || 'FY';

  // Whole-deployment input with the picker's pending accessories merged in (items resolved too).
  const fullInput = useMemo<GraphInput | null>(() => {
    if (!loaded) return null;
    const entries = Object.entries(pending);
    return entries.length === 0
      ? loaded.input
      : { ...loaded.input, items: { ...loaded.input.items, ...Object.fromEntries(entries.map(([k, v]) => [k, v.item])) } };
  }, [loaded, pending]);

  // What the canvas actually renders: the selected zone only (or everything, read-only).
  const effectiveInput = useMemo<GraphInput | null>(() => {
    if (!fullInput) return null;
    if (zone === 'ALL') return fullInput;
    const pendingHere = Object.entries(pending).filter(([, v]) => v.zone === zone).map(([k]) => k);
    return filterToZone(fullInput, zone, pendingHere);
  }, [fullInput, pending, zone]);

  const zoneTabs = useMemo(
    () => (fullInput ? zoneCodes.map((code) => ({ code, ...zoneSummary(fullInput, code) })) : []),
    [fullInput, zoneCodes],
  );

  const { nodes, edges, nodeLabels } = useMemo(() => {
    if (!loaded) return { nodes: [] as Node<GraphNodeData>[], edges: [] as Edge<GraphEdgeData>[], nodeLabels: {} as Record<string, string> };
    const derived = deriveGraph(effectiveInput!);
    const laidOutNodes = decorateNodes(layoutGraph(derived.nodes, derived.edges), effectiveInput!, editable);
    const labels = Object.fromEntries(laidOutNodes.map((n) => [n.id, n.data.label]));
    return { nodes: laidOutNodes, edges: styleEdges(derived.edges), nodeLabels: labels };
  }, [effectiveInput, loaded, editable]);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setLoaded(await loadGraph(id));
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to refresh the graph');
    }
  }, [id, toast]);

  // Drag port -> port. Ports are auto-assigned: first free Female_N on the source,
  // Male_1 / Power_Inlet on the target. This is the only path that writes a CONNECTION- record.
  const onConnect = useCallback(
    async (c: Connection) => {
      if (!id || !loaded || !c.source || !c.target) return;
      const input = effectiveInput!;
      try {
        if (c.sourceHandle === 'illum-s') {
          const powering = connectionPoweringLight(c.source, input);
          if (!powering?.connection_id) throw new Error('That light has no power connection to attach illumination to');
          const next = Array.from(new Set([...(powering.illuminates || []), c.target]));
          await updateConnection(id, powering.connection_id, { illuminates: next });
          toast.showSuccess('Illuminates added');
        } else {
          const fromPort = freeFemalePorts(c.source, input)[0];
          const toPort = targetPortFor(input.items[c.target]);
          if (!fromPort || !toPort || zone === 'ALL') throw new Error('No free port available for that connection');
          await createConnection(id, {
            zone_code: zone,
            from_item_id: c.source,
            from_port: fromPort,
            to_item_id: c.target,
            to_port: toPort,
            illuminates: [],
            notes: '',
          });
          toast.showSuccess('Connection created');
        }
        await refresh();
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to connect');
      }
    },
    [id, loaded, effectiveInput, zone, refresh, toast],
  );

  const isValidConnection = useCallback((c: Connection | Edge) => {
    if (!c.source || !c.target || c.source === c.target) return false;
    // Power handles pair with power handles, illuminates with illuminates — never crossed.
    return c.sourceHandle === 'illum-s' ? c.targetHandle === 'illum-t' : c.targetHandle === 't-t';
  }, []);

  // Derived layout -> controlled React Flow nodes, with any saved/dragged position winning.
  useEffect(() => {
    setFlowNodes(nodes.map((n) => ({ ...n, position: positions[n.id] || n.position })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<GraphNodeData>>[]) => setFlowNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  );

  const onNodeDragStop = useCallback(() => {
    if (!id) return;
    const next: Positions = { ...positions };
    flowNodes.forEach((n) => {
      next[n.id] = n.position;
    });
    setPositions(next);
    savePositions(id, next);
  }, [id, positions, flowNodes]);

  // Accessory picker: cords/plugs/adapters are always wire-able without being declared.
  useEffect(() => {
    if (!editable || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await searchItems({ season: loaded?.season, connection_building: 'true' });
        const all: GraphItem[] = (res?.data?.items || []).filter(
          (i: any) => i.class === 'Accessory' && i.class_type !== 'Receptacle',
        );
        if (!cancelled) setAccessoryOptions(all);
      } catch (err) {
        console.error('[Schematic] accessory list failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editable, id, loaded?.season]);

  const availableAccessories = useMemo(() => {
    const inUse = fullInput ? itemsInUse(fullInput) : new Set<string>();
    const pinned = new Set(Object.keys(pending));
    return accessoryOptions.filter((a) => !inUse.has(a.id) && !pinned.has(a.id));
  }, [accessoryOptions, fullInput, pending]);

  function addAccessory(itemId: string) {
    const item = accessoryOptions.find((a) => a.id === itemId);
    if (item && zone !== 'ALL') setPending((prev) => ({ ...prev, [itemId]: { item, zone } }));
    setAccessoryQuery('');
  }

  async function confirmRemove() {
    if (!id || !removeTarget) return;
    setRemoving(true);
    try {
      const conn = loaded?.input.connections.find((c) => c.connection_id === removeTarget.connectionId);
      if (!conn?.connection_id) throw new Error('Connection not found');
      if (removeTarget.kind === 'illuminates') {
        await updateConnection(id, conn.connection_id, {
          illuminates: (conn.illuminates || []).filter((x) => x !== removeTarget.litId),
        });
      } else {
        await removeConnection(id, conn.connection_id);
      }
      setRemoveTarget(null);
      setSelection(null);
      await refresh();
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to remove');
    } finally {
      setRemoving(false);
    }
  }

  if (!id) return null;

  return (
    <>
      {!embedded && (
        <>
          <Breadcrumbs
            crumbs={[
              { label: 'Deployments', to: '/' },
              { label: 'Graphs', to: '/graphs' },
              { label: id },
            ]}
          />
          <PageHeader title={id} subtitle={loaded ? undefined : 'Power-topology schematic'} />
        </>
      )}
      {loaded && zoneTabs.length > 0 && (
        <Tabs
          aria-label="Zone"
          size="sm"
          className="mb-3"
          selectedKey={zone}
          onSelectionChange={(k) => {
            setSelection(null);
            setParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.set('zone', String(k));
                return next;
              },
              { replace: true },
            );
          }}
        >
          {[
            ...zoneTabs.map((z) => (
              <Tab
                key={z.code}
                data-testid={`graph-zone-${z.code}`}
                title={
                  <span className="flex items-center gap-2">
                    {DEPLOYMENT_CONFIG.ZONES.find((d) => d.zone_code === z.code)?.zone_name || z.code}
                    <Chip size="sm" variant="flat">
                      {z.items}
                    </Chip>
                    {z.unwired > 0 && (
                      <Chip size="sm" variant="flat" color="warning">
                        {z.unwired} unwired
                      </Chip>
                    )}
                  </span>
                }
              />
            )),
            ...(editable ? [] : [<Tab key="ALL" title="All zones" data-testid="graph-zone-ALL" />]),
          ]}
        </Tabs>
      )}
      {editable && (
        <p className="mb-3 text-sm text-default-500">
          Drag from an outlet or cord&apos;s bottom handle to a declared item&apos;s top handle to connect them.
          Drag from a light&apos;s right handle to a prop&apos;s left handle to mark what it illuminates.
          Select a line to inspect or remove it. Drag any item to arrange the canvas. Each zone is its own graph. Unwired
          items sit in the bottom row; cords and plugs aren&apos;t declared — add them here when you need one.
        </p>
      )}
      {editable && (
        <Autocomplete
          label="Add accessory"
          placeholder="Search cords, plugs, adapters…"
          size="sm"
          className="mb-3 max-w-sm"
          inputValue={accessoryQuery}
          onInputChange={setAccessoryQuery}
          selectedKey={null}
          onSelectionChange={(k) => k && addAccessory(String(k))}
          data-testid="graph-add-accessory"
        >
          {availableAccessories.map((a) => (
            <AutocompleteItem key={a.id} textValue={`${a.short_name || a.id} ${a.id}`}>
              {a.short_name || a.id} <span className="text-xs text-default-400">{a.class_type}</span>
            </AutocompleteItem>
          ))}
        </Autocomplete>
      )}

      {loading ? (
        <LoadingState label="Loading schematic…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : !loaded || nodes.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No topology data for this deployment yet"
          message={embedded ? 'Declare items on the Declare tab to add them here' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_280px]">
          <div className="order-2 lg:order-1">
            <GraphLegend />
          </div>

          <div className="order-1 h-[600px] rounded-medium border border-default-200 lg:order-2">
            <div className="flex items-center justify-end border-b border-default-200 p-2">
              <ModeChip mode={loaded.mode} />
            </div>
            <div className="h-[calc(100%-45px)]">
              <ReactFlow
                nodes={flowNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => setSelection({ type: 'node', node: node as Node<GraphNodeData> })}
                onEdgeClick={(_, edge) => setSelection({ type: 'edge', edge: edge as Edge<GraphEdgeData> })}
                onPaneClick={() => setSelection(null)}
                nodesConnectable={editable}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                deleteKeyCode={null}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable
                zoomOnScroll
                panOnDrag
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          </div>

          <div className="order-3 h-[600px] overflow-y-auto">
            <DetailPanel
              selection={selection}
              connections={effectiveInput!.connections}
              placements={effectiveInput!.placements}
              nodeLabels={nodeLabels}
              onRemove={editable ? (req) => setRemoveTarget(req) : undefined}
            />
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!removeTarget}
        title={removeTarget?.kind === 'illuminates' ? 'Remove illuminates?' : 'Remove connection?'}
        body={
          <>
            <p className="font-medium">{removeTarget?.description}</p>
            <p className="mt-2 text-sm">
              {removeTarget?.kind === 'illuminates'
                ? 'The prop stays declared; it just stops being marked as lit by this light.'
                : 'This deletes the connection. Both items stay declared and become wire-able again.'}
            </p>
          </>
        }
        confirmLabel="Remove"
        isDestructive
        isLoading={removing}
        onConfirm={confirmRemove}
        onClose={() => setRemoveTarget(null)}
        confirmTestId="graph-edge-remove-confirm"
      />
    </>
  );
}
