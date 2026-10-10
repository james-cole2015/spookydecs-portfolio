import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, type Connection, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Chip } from '@heroui/react';
import { Breadcrumbs, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import {
  createConnection,
  getDeployment,
  getDeploymentGraph,
  getHistoricalDeployment,
  removeConnection,
  updateConnection,
} from '../api/deploymentsApi';
import { DEPLOYMENT_CONFIG } from '../config/deploymentsConfig';
import { deriveGraph, type GraphInput, type GraphNodeData, type GraphEdgeData } from '../lib/graphDerivation';
import { layoutGraph } from '../lib/graphLayout';
import {
  connectionPoweringLight,
  decorateNodes,
  freeFemalePorts,
  targetPortFor,
  zoneOfNode,
} from '../lib/graphPorts';
import HubNode from '../components/graph/HubNode';
import LoadNode from '../components/graph/LoadNode';
import BranchNode from '../components/graph/BranchNode';
import PlaceholderNode from '../components/graph/PlaceholderNode';
import GraphLegend from '../components/graph/GraphLegend';
import DetailPanel, { type GraphSelection } from '../components/graph/DetailPanel';

const nodeTypes = { hub: HubNode, load: LoadNode, branch: BranchNode, placeholder: PlaceholderNode };

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
}

const EDITABLE_STATUSES = ['pre-deployment', 'active_setup'];

async function loadGraph(deploymentId: string): Promise<LoadedGraph> {
  const depRes = await getDeployment(deploymentId);
  const status = depRes?.data?.status;

  if (status === 'archived') {
    const histRes = await getHistoricalDeployment(deploymentId);
    const graph = histRes?.data?.graph;
    if (graph?.snapshot) return { mode: 'snapshot', input: graph.snapshot };
    if (graph?.live) return { mode: 'best-effort', input: graph.live };
    // No graph key at all (very old archive, pre-#466 historical handler) — treat as empty.
    return { mode: 'best-effort', input: { zones: zonesRecord(), items: {}, connections: [], placements: [] } };
  }

  const graphRes = await getDeploymentGraph(deploymentId);
  return { mode: 'live', input: graphRes.data as GraphInput, status };
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedGraph | null>(null);
  const [selection, setSelection] = useState<GraphSelection>(null);
  const [removeTarget, setRemoveTarget] = useState<Edge<GraphEdgeData> | null>(null);
  const [removing, setRemoving] = useState(false);

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

  const { nodes, edges, nodeLabels } = useMemo(() => {
    if (!loaded) return { nodes: [] as Node<GraphNodeData>[], edges: [] as Edge<GraphEdgeData>[], nodeLabels: {} as Record<string, string> };
    const derived = deriveGraph(loaded.input);
    const laidOutNodes = decorateNodes(layoutGraph(derived.nodes, derived.edges), loaded.input, editable);
    const labels = Object.fromEntries(laidOutNodes.map((n) => [n.id, n.data.label]));
    return { nodes: laidOutNodes, edges: styleEdges(derived.edges), nodeLabels: labels };
  }, [loaded, editable]);

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
      const input = loaded.input;
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
          const zone = zoneOfNode(c.source, input) || zoneOfNode(c.target, input);
          if (!fromPort || !toPort || !zone) throw new Error('No free port available for that connection');
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
    [id, loaded, refresh, toast],
  );

  const isValidConnection = useCallback((c: Connection | Edge) => {
    if (!c.source || !c.target || c.source === c.target) return false;
    // Power handles pair with power handles, illuminates with illuminates — never crossed.
    return c.sourceHandle === 'illum-s' ? c.targetHandle === 'illum-t' : c.targetHandle === 't-t';
  }, []);

  async function confirmRemove() {
    if (!id || !removeTarget) return;
    const conn = removeTarget.data?.connection;
    setRemoving(true);
    try {
      if (removeTarget.data?.kind === 'illuminates') {
        if (!conn?.connection_id) throw new Error('Connection not found');
        await updateConnection(id, conn.connection_id, {
          illuminates: (conn.illuminates || []).filter((x) => x !== removeTarget.target),
        });
      } else {
        if (!conn?.connection_id) throw new Error('Connection not found');
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
      {editable && (
        <p className="mb-3 text-sm text-default-500">
          Drag from an outlet or cord&apos;s bottom handle to a declared item&apos;s top handle to connect them.
          Drag from a light&apos;s right handle to a prop&apos;s left handle to mark what it illuminates.
          Select a line to inspect or remove it. Items appear in the bottom row until they&apos;re wired.
        </p>
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
                nodes={nodes}
                edges={edges}
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
              connections={loaded.input.connections}
              placements={loaded.input.placements}
              nodeLabels={nodeLabels}
              onRemoveEdge={editable ? (edge) => setRemoveTarget(edge) : undefined}
            />
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!removeTarget}
        title={removeTarget?.data?.kind === 'illuminates' ? 'Remove illuminates?' : 'Remove connection?'}
        body={
          removeTarget?.data?.kind === 'illuminates'
            ? 'The prop stays declared; it just stops being marked as lit by this light.'
            : 'This deletes the connection. Both items stay declared and become wire-able again.'
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
