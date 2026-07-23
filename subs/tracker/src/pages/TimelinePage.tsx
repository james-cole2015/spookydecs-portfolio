import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Chip, Spinner, Switch } from '@heroui/react';
import { PageHeader, ErrorState, priorityChipColor, stateChipColor, type ChipColor } from '@spookydecs/ui';
import TrackerApi from '../api/trackerApi';
import { asArray } from '../lib/unwrap';
import { EFFORT_POINTS, MILESTONES, toSlug, type Effort, type Epic, type Issue } from '../config/trackerConfig';

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 };

// Serpentine geometry (px). Node box + the gaps that leave room for connectors.
const NODE_W = 190;
const NODE_H = 96;
const GAP_X = 60;
const GAP_Y = 72;
// Edge colour via a HeroUI CSS var (no hardcoded hex — design rule F5).
const EDGE_STROKE = 'hsl(var(--heroui-default-300))';

// One node per milestone, in the canonical milestone-list order. `epic` is the
// live DDB record when one exists (else a future milestone with no epic yet).
interface TimelineNode {
  slug: string;
  name: string;
  epic: Epic | null;
  state?: string;
  issues: Issue[];
}

interface EpicNodeData extends Record<string, unknown> {
  label: string;
  seq: number;
  state?: string;
  epicExists: boolean;
  done: number;
  total: number;
  isActive: boolean;
}

// State → chip (ported from EpicsListPage's local stateChip; not a shared helper).
function stateChip(state?: string): { label: string; color: ChipColor } {
  switch (state) {
    case 'active':
      return { label: 'Active', color: 'primary' };
    case 'planned':
    case 'planning_complete':
      return { label: 'Planned', color: 'secondary' };
    case 'planning':
      return { label: 'Planning', color: 'secondary' };
    case 'unplanned':
      return { label: 'Future', color: 'default' };
    case 'completed':
      return { label: 'Completed', color: 'success' };
    default:
      return { label: 'Future', color: 'default' };
  }
}

// State conveyed by typography on the segment title (user decision):
// completed = greyed + italic, active = bold, everything else = normal weight.
function titleClass(state?: string): string {
  if (state === 'completed') return 'italic text-default-400';
  if (state === 'active') return 'font-bold text-foreground';
  return 'font-normal text-foreground';
}

function sortByRank(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const ar = a.priority_rank ?? Infinity;
    const br = b.priority_rank ?? Infinity;
    if (ar !== br) return ar - br;
    return (PRIORITY_ORDER[a.priority as string] ?? 3) - (PRIORITY_ORDER[b.priority as string] ?? 3);
  });
}

function totalPoints(issues: Issue[]): number {
  return issues.reduce((sum, i) => sum + (EFFORT_POINTS[i.effort as Effort] ?? 0), 0);
}

// Custom React Flow node = the epic card. Six invisible handles (one source +
// one target per relevant side) let serpentine edges attach on the correct edge.
function EpicNode({ data, selected }: NodeProps<Node<EpicNodeData>>) {
  const chip = stateChip(data.state);
  const ring = selected ? 'ring-2 ring-secondary' : data.isActive ? 'ring-2 ring-primary' : '';
  return (
    <div
      style={{ width: NODE_W, height: NODE_H }}
      className={`flex cursor-pointer flex-col gap-1 rounded-lg border border-divider bg-content1 p-3 text-left transition-shadow hover:shadow-md ${ring}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-default-400">{data.seq}</span>
        <Chip size="sm" variant="flat" color={chip.color}>
          {chip.label}
        </Chip>
      </div>
      <span className={`truncate text-sm ${titleClass(data.state)}`} title={data.label}>
        {data.label}
      </span>
      {data.epicExists ? (
        <span className="text-xs text-default-400">
          {data.total > 0 ? `${data.done}/${data.total} done` : 'no issues'}
        </span>
      ) : (
        <span className="text-xs text-default-300">not started</span>
      )}

      {/* Invisible connection points. */}
      <Handle id="l-t" type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0 }} />
      <Handle id="l-s" type="source" position={Position.Left} isConnectable={false} style={{ opacity: 0 }} />
      <Handle id="r-t" type="target" position={Position.Right} isConnectable={false} style={{ opacity: 0 }} />
      <Handle id="r-s" type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0 }} />
      <Handle id="t-t" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0 }} />
      <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { epic: EpicNode };

// Build serpentine node positions + consecutive edges for a filtered list.
function buildGraph(list: TimelineNode[], cols: number): { nodes: Node<EpicNodeData>[]; edges: Edge[]; rows: number } {
  const nodes: Node<EpicNodeData>[] = list.map((n, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const displayCol = row % 2 === 0 ? col : cols - 1 - col; // odd rows run right→left
    const done = n.issues.filter((x) => x.state === 'completed').length;
    return {
      id: n.slug,
      type: 'epic',
      position: { x: displayCol * (NODE_W + GAP_X), y: row * (NODE_H + GAP_Y) },
      data: {
        label: n.name,
        seq: i + 1,
        state: n.state,
        epicExists: !!n.epic,
        done,
        total: n.issues.length,
        isActive: n.state === 'active',
      },
      draggable: false,
      selectable: true,
    };
  });

  const edges: Edge[] = [];
  for (let i = 0; i < list.length - 1; i++) {
    const ri = Math.floor(i / cols);
    const rj = Math.floor((i + 1) / cols);
    let sourceHandle: string, targetHandle: string;
    if (ri === rj) {
      // same row: even rows flow →, odd rows flow ←
      [sourceHandle, targetHandle] = ri % 2 === 0 ? ['r-s', 'l-t'] : ['l-s', 'r-t'];
    } else {
      // row turn: drop straight down (next row's first node sits directly below)
      [sourceHandle, targetHandle] = ['b-s', 't-t'];
    }
    edges.push({
      id: `${list[i].slug}->${list[i + 1].slug}`,
      source: list[i].slug,
      target: list[i + 1].slug,
      sourceHandle,
      targetHandle,
      type: 'smoothstep',
      style: { stroke: EDGE_STROKE, strokeWidth: 2 },
    });
  }

  const rows = Math.ceil(list.length / cols);
  return { nodes, edges, rows };
}

export default function TimelinePage() {
  const navigate = useNavigate();
  const [allNodes, setAllNodes] = useState<TimelineNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [cols, setCols] = useState(4);

  // Responsive column count drives how tight the serpentine snakes.
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setCols(w >= 1024 ? 4 : w >= 640 ? 3 : 2);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const epicList = asArray<Epic>(await TrackerApi.epics.list());
        const bySlug = new Map<string, Epic>();
        epicList.forEach((e) => {
          const name = (e.epic_name as string) || (e.id as string) || e.slug;
          if (name) bySlug.set(toSlug(name), e);
        });

        const matched = MILESTONES.map((m) => ({ m, epic: bySlug.get(toSlug(m.name)) ?? null }));
        const fetched = await Promise.allSettled(
          matched
            .filter((x) => x.epic)
            .map(({ m, epic }) => {
              const name = (epic!.epic_name as string) || (epic!.id as string) || epic!.slug;
              return TrackerApi.issues.list({ epic: name }).then((d) => ({
                slug: toSlug(m.name),
                items: asArray<Issue>(d),
              }));
            }),
        );
        const issuesBySlug: Record<string, Issue[]> = {};
        fetched.forEach((r) => {
          if (r.status === 'fulfilled') issuesBySlug[r.value.slug] = r.value.items;
        });

        const built: TimelineNode[] = matched.map(({ m, epic }) => {
          const slug = toSlug(m.name);
          return {
            slug,
            name: epic?.title || m.name,
            epic,
            state: epic?.state,
            issues: issuesBySlug[slug] ?? [],
          };
        });
        if (!cancelled) setAllNodes(built);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load timeline');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completedCount = useMemo(() => allNodes.filter((n) => n.state === 'completed').length, [allNodes]);

  // Default view hides completed epics — the timeline is about what's scheduled.
  const visible = useMemo(
    () => (showCompleted ? allNodes : allNodes.filter((n) => n.state !== 'completed')),
    [allNodes, showCompleted],
  );

  const { nodes, edges, rows } = useMemo(() => buildGraph(visible, cols), [visible, cols]);

  // Reflect selection into React Flow's `selected` flag so the node ring updates.
  const rfNodes = useMemo(
    () => nodes.map((n) => ({ ...n, selected: n.id === selected })),
    [nodes, selected],
  );

  const active = useMemo(() => allNodes.find((n) => n.slug === selected) || null, [allNodes, selected]);
  // Selecting a hidden (completed) node is impossible, but guard the panel anyway.
  const panelVisible = active && (showCompleted || active.state !== 'completed') ? active : null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading timeline…" />
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;

  const canvasHeight = rows > 0 ? rows * NODE_H + (rows - 1) * GAP_Y + 32 : 200;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Timeline" subtitle="Epics in delivery sequence — click one to see its issues" />

      <div className="mb-3 flex justify-end">
        <Switch size="sm" isSelected={showCompleted} onValueChange={setShowCompleted}>
          <span className="text-sm text-default-500">Show completed ({completedCount})</span>
        </Switch>
      </div>

      {/* Static serpentine roadmap — no pan/zoom/drag; it reads as a fixed diagram. */}
      <div style={{ height: canvasHeight }} className="rounded-lg border border-divider bg-content2/40">
        <ReactFlow
          nodes={rfNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelected((cur) => (cur === node.id ? null : node.id))}
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnDrag={false}
          panOnScroll={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        />
      </div>

      {/* Expanded epic panel */}
      {panelVisible && (
        <div className="mt-4 rounded-lg border border-divider bg-content1 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className={`text-lg ${titleClass(panelVisible.state)}`}>{panelVisible.name}</h2>
            {panelVisible.epic ? (
              <span className="text-sm text-default-500">
                {panelVisible.issues.length} issue{panelVisible.issues.length !== 1 ? 's' : ''}
                {panelVisible.issues.length > 0 && (
                  <>
                    {' · '}
                    {panelVisible.issues.filter((x) => x.state === 'completed').length}/{panelVisible.issues.length} done
                    {' · '}
                    {totalPoints(panelVisible.issues)} pts
                  </>
                )}
              </span>
            ) : (
              <span className="text-sm text-default-400">
                No epic record yet — this milestone hasn't started.
              </span>
            )}
          </div>

          {panelVisible.epic && panelVisible.issues.length > 0 && (
            <div className="flex flex-col gap-2">
              {sortByRank(panelVisible.issues).map((issue) => (
                <button
                  key={issue.issue_number}
                  type="button"
                  onClick={() => navigate(`/epics/${encodeURIComponent(panelVisible.slug)}/${issue.issue_number}`)}
                  className={`flex w-full items-center gap-3 rounded-lg border border-divider bg-content1 px-3 py-2 text-left transition-colors hover:bg-content2 ${
                    issue.state === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <span className="font-mono text-xs text-default-400">#{issue.issue_number}</span>
                  <span className="flex-1 truncate text-sm text-foreground">{issue.title}</span>
                  {issue.priority ? (
                    <Chip size="sm" variant="flat" color={priorityChipColor(issue.priority)}>
                      {issue.priority}
                    </Chip>
                  ) : null}
                  <Chip size="sm" variant="flat" color={stateChipColor(issue.state)}>
                    {issue.state || 'backlog'}
                  </Chip>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
