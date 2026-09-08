import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Chip } from '@heroui/react';
import { Breadcrumbs, EmptyState, ErrorState, LoadingState, PageHeader } from '@spookydecs/ui';
import { getDeployment, getDeploymentGraph, getHistoricalDeployment } from '../api/deploymentsApi';
import { DEPLOYMENT_CONFIG } from '../config/deploymentsConfig';
import { deriveGraph, type GraphInput, type GraphNodeData, type GraphEdgeData } from '../lib/graphDerivation';
import { layoutGraph } from '../lib/graphLayout';
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

function zonesRecord(): GraphInput['zones'] {
  const record: GraphInput['zones'] = {};
  DEPLOYMENT_CONFIG.ZONES.forEach((z) => {
    record[z.zone_code] = z;
  });
  return record;
}

type RenderMode = 'live' | 'snapshot' | 'best-effort';

interface LoadedGraph {
  mode: RenderMode;
  input: GraphInput;
}

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
  return { mode: 'live', input: graphRes.data as GraphInput };
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

export default function DeploymentSchematic() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedGraph | null>(null);
  const [selection, setSelection] = useState<GraphSelection>(null);

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

  const { nodes, edges, nodeLabels } = useMemo(() => {
    if (!loaded) return { nodes: [] as Node<GraphNodeData>[], edges: [] as Edge<GraphEdgeData>[], nodeLabels: {} as Record<string, string> };
    const derived = deriveGraph(loaded.input);
    const laidOutNodes = layoutGraph(derived.nodes, derived.edges);
    const labels = Object.fromEntries(laidOutNodes.map((n) => [n.id, n.data.label]));
    return { nodes: laidOutNodes, edges: styleEdges(derived.edges), nodeLabels: labels };
  }, [loaded]);

  if (!id) return null;

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/' },
          { label: 'Graphs', to: '/graphs' },
          { label: id },
        ]}
      />
      <PageHeader title={id} subtitle={loaded ? undefined : 'Power-topology schematic'} />

      {loading ? (
        <LoadingState label="Loading schematic…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : !loaded || nodes.length === 0 ? (
        <EmptyState icon="📊" title="No topology data for this deployment yet" />
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
            />
          </div>
        </div>
      )}
    </>
  );
}
