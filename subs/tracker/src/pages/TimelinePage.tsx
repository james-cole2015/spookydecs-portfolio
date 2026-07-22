import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip, Spinner } from '@heroui/react';
import { PageHeader, ErrorState, priorityChipColor, stateChipColor, type ChipColor } from '@spookydecs/ui';
import TrackerApi from '../api/trackerApi';
import { asArray } from '../lib/unwrap';
import { EFFORT_POINTS, MILESTONES, toSlug, type Effort, type Epic, type Issue } from '../config/trackerConfig';

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 };

// One node per milestone, in the canonical milestone-list order. `epic` is the
// live DDB record when one exists for the milestone slug (else this is a future
// milestone with no epic yet); `issues` are that epic's issues (empty otherwise).
interface TimelineNode {
  slug: string;
  name: string;
  epic: Epic | null;
  state?: string;
  issues: Issue[];
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

export default function TimelinePage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

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

        // Fetch issues once for every milestone that has a live epic (degrade
        // gracefully — a failed epic just shows no counts). Mirrors EpicsListPage.
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
        if (!cancelled) setNodes(built);
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading timeline…" />
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;

  const active = nodes.find((n) => n.slug === selected) || null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Timeline" subtitle="Epics in delivery sequence — click one to see its issues" />

      {/* Horizontal roadmap strip — sequence flows left (done) → right (future). */}
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max items-stretch">
          {nodes.map((node, i) => {
            const chip = stateChip(node.state);
            const isSelected = node.slug === selected;
            const total = node.issues.length;
            const done = node.issues.filter((x) => x.state === 'completed').length;
            return (
              <Fragment key={node.slug}>
                <button
                  type="button"
                  onClick={() => setSelected(isSelected ? null : node.slug)}
                  className={`flex w-40 shrink-0 flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-secondary bg-content2'
                      : 'border-divider bg-content1 hover:bg-content2'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-default-400">{i + 1}</span>
                    <Chip size="sm" variant="flat" color={chip.color}>
                      {chip.label}
                    </Chip>
                  </div>
                  <span className={`truncate text-sm ${titleClass(node.state)}`} title={node.name}>
                    {node.name}
                  </span>
                  {node.epic ? (
                    <span className="text-xs text-default-400">
                      {total > 0 ? `${done}/${total} done` : 'no issues'}
                    </span>
                  ) : (
                    <span className="text-xs text-default-300">not started</span>
                  )}
                </button>
                {i < nodes.length - 1 && (
                  <div className="mx-1 mt-8 h-px w-5 shrink-0 self-start bg-divider" aria-hidden="true" />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Expanded epic panel */}
      {active && (
        <div className="mt-2 rounded-lg border border-divider bg-content1 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className={`text-lg ${titleClass(active.state)}`}>{active.name}</h2>
            {active.epic ? (
              <span className="text-sm text-default-500">
                {active.issues.length} issue{active.issues.length !== 1 ? 's' : ''}
                {active.issues.length > 0 && (
                  <>
                    {' · '}
                    {active.issues.filter((x) => x.state === 'completed').length}/{active.issues.length} done
                    {' · '}
                    {totalPoints(active.issues)} pts
                  </>
                )}
              </span>
            ) : (
              <span className="text-sm text-default-400">No epic record yet — this milestone hasn't started.</span>
            )}
          </div>

          {active.epic && active.issues.length > 0 && (
            <div className="flex flex-col gap-2">
              {sortByRank(active.issues).map((issue) => (
                <button
                  key={issue.issue_number}
                  type="button"
                  onClick={() => navigate(`/epics/${encodeURIComponent(active.slug)}/${issue.issue_number}`)}
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
