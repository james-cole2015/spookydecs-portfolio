import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardBody, Input, Select, SelectItem, Chip, Spinner } from '@heroui/react';
import { Search } from 'lucide-react';
import { EmptyState, ErrorState } from '@spookydecs/ui';
import TrackerApi from '../api/trackerApi';
import { asArray } from '../lib/unwrap';
import { stateChipColor, ISSUE_STATES, type Issue, type Epic } from '../config/trackerConfig';

const STATE_OPTIONS = ['all', ...ISSUE_STATES];

function epicValue(epic: Epic): string {
  return (epic.epic_name as string) || epic.slug || (epic.id as string);
}

function taskCounts(issue: Issue): { total: number; done: number } {
  const tasks = Object.values(issue.tasks || {});
  return { total: tasks.length, done: tasks.filter((t) => t.state === 'completed').length };
}

export default function PriorityListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state lives in the URL (shareable + survives refresh), mirroring the
  // vanilla State helper. 'all' / '' means "no filter" (param omitted).
  const search = params.get('search') ?? '';
  const epicFilter = params.get('epic') ?? 'all';
  const stateFilter = params.get('state') ?? 'all';

  const setFilter = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === 'all') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [issueData, epicData] = await Promise.all([TrackerApi.issues.list(), TrackerApi.epics.list()]);
        if (cancelled) return;
        setIssues(asArray<Issue>(issueData));
        setEpics(asArray<Epic>(epicData));
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load issues');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return issues.filter((issue) => {
      if (q && !issue.title.toLowerCase().includes(q) && !String(issue.issue_number).includes(q)) return false;
      if (epicFilter !== 'all' && issue.parent_epic !== epicFilter) return false;
      if (stateFilter !== 'all' && issue.state !== stateFilter) return false;
      return true;
    });
  }, [issues, search, epicFilter, stateFilter]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search issues"
          placeholder="Search issues…"
          value={search}
          onValueChange={(v) => setFilter('search', v)}
          startContent={<Search size={15} className="text-default-400" />}
          size="sm"
          className="w-60"
          isClearable
          onClear={() => setFilter('search', '')}
        />
        <Select
          aria-label="Filter by epic"
          size="sm"
          className="w-44"
          selectedKeys={[epicFilter]}
          onChange={(e) => setFilter('epic', e.target.value)}
        >
          {[
            <SelectItem key="all">All epics</SelectItem>,
            ...epics.map((epic) => <SelectItem key={epicValue(epic)}>{epic.title || epicValue(epic)}</SelectItem>),
          ]}
        </Select>
        <Select
          aria-label="Filter by state"
          size="sm"
          className="w-40"
          selectedKeys={[stateFilter]}
          onChange={(e) => setFilter('state', e.target.value)}
        >
          {STATE_OPTIONS.map((s) => (
            <SelectItem key={s}>{s === 'all' ? 'All states' : s}</SelectItem>
          ))}
        </Select>
        {!loading && (
          <span className="text-sm text-default-500">
            {filtered.length} issue{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Loading issues…" />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No issues found" message="Try adjusting your filters." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((issue) => {
            const epicName = issue.parent_epic || null;
            const url = `/epics/${encodeURIComponent(epicName || 'backlog')}/${issue.issue_number}`;
            const { total, done } = taskCounts(issue);
            return (
              <Card
                key={issue.issue_number}
                isPressable
                isHoverable
                shadow="sm"
                onPress={() => navigate(url)}
                className="bg-content1"
              >
                <CardBody className="gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-default-400">#{issue.issue_number}</span>
                    <div className="flex items-center gap-1.5">
                      {issue.added_mid_epic === true && (
                        <Chip size="sm" variant="flat" color="warning" title="Ad hoc — added after the epic was already active">
                          AdHoc
                        </Chip>
                      )}
                      <Chip size="sm" variant="flat" color={stateChipColor(issue.state)}>
                        {issue.state || 'backlog'}
                      </Chip>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-foreground">{issue.title}</div>
                  <div className="flex items-center justify-between text-xs text-default-400">
                    {epicName ? <span>{epicName}</span> : <span />}
                    {total > 0 && <span>{done}/{total} ✓</span>}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
