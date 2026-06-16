import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Chip, Progress, Spinner } from '@heroui/react';
import { EmptyState, ErrorState } from '@spookydecs/ui';
import TrackerApi from '../api/trackerApi';
import { asArray } from '../lib/unwrap';
import type { ChipColor, Epic, Issue } from '../config/trackerConfig';

interface EpicWithCounts extends Epic {
  epicName: string;
  total: number | null;
  done: number | null;
}

// Band labels + the epic states each band collects (ported from epics-list.js).
const BANDS: { label: string; match: (state?: string) => boolean }[] = [
  { label: 'Active', match: (s) => s === 'active' },
  { label: 'Planned', match: (s) => s === 'planning_complete' || s === 'planned' || s === 'planning' },
  { label: 'Future', match: (s) => s === 'unplanned' },
  { label: 'Completed', match: (s) => s === 'completed' },
];

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
      return { label: state || 'planning', color: 'default' };
  }
}

export default function EpicsListPage() {
  const navigate = useNavigate();
  const [epics, setEpics] = useState<EpicWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const epicList = asArray<Epic>(await TrackerApi.epics.list());

        // Fetch issue counts for all epics in parallel (degrade gracefully).
        const counts = await Promise.allSettled(
          epicList.map((epic) => {
            const name = (epic.epic_name as string) || (epic.id as string);
            return TrackerApi.issues.list({ epic: name }).then((d) => ({ name, items: asArray<Issue>(d) }));
          }),
        );
        const byEpic: Record<string, { total: number; done: number }> = {};
        counts.forEach((r) => {
          if (r.status === 'fulfilled') {
            byEpic[r.value.name] = {
              total: r.value.items.length,
              done: r.value.items.filter((i) => i.state === 'completed').length,
            };
          }
        });

        const merged: EpicWithCounts[] = epicList.map((epic) => {
          const name = (epic.epic_name as string) || (epic.id as string);
          const c = byEpic[name];
          return { ...epic, epicName: name, total: c?.total ?? null, done: c?.done ?? null };
        });
        if (!cancelled) setEpics(merged);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load epics');
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
        <Spinner label="Loading epics…" />
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;

  const populated = BANDS.map((band) => ({ ...band, items: epics.filter((e) => band.match(e.state)) })).filter(
    (b) => b.items.length > 0,
  );

  if (populated.length === 0) return <EmptyState title="No epics yet" />;

  return (
    <div className="mx-auto max-w-5xl">
      {populated.map((band) => (
        <section key={band.label} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-default-500">{band.label}</h2>
            <span className="text-xs text-default-400">{band.items.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {band.items.map((epic) => {
              const chip = stateChip(epic.state);
              const pct = epic.total && epic.total > 0 ? Math.round(((epic.done || 0) / epic.total) * 100) : 0;
              return (
                <Card
                  key={epic.epicName}
                  isPressable
                  isHoverable
                  shadow="sm"
                  onPress={() => navigate(`/epics/${encodeURIComponent(epic.epicName)}`)}
                  className="bg-content1"
                >
                  <CardBody className="gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground">{epic.title || epic.epicName}</span>
                      <Chip size="sm" variant="flat" color={chip.color}>
                        {chip.label}
                      </Chip>
                    </div>
                    {epic.description ? (
                      <p className="line-clamp-2 text-xs text-default-500">{epic.description}</p>
                    ) : null}
                    {(epic.due_date as string) ? (
                      <div className="text-xs text-default-400">Due {String(epic.due_date)}</div>
                    ) : null}
                    {epic.total !== null && (
                      <div className="mt-1">
                        <Progress
                          aria-label="Epic progress"
                          size="sm"
                          value={pct}
                          color="success"
                          className="max-w-full"
                        />
                        <div className="mt-1 text-right text-xs text-default-400">
                          {epic.done} / {epic.total} done
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
