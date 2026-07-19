import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Button, Chip, Input, Link, Spinner, Tabs, Tab, Textarea } from '@heroui/react';
import { ErrorState, useToast, effortChipColor, priorityChipColor, stateChipColor } from '@spookydecs/ui';
import TrackerApi from '../api/trackerApi';
import { asArray } from '../lib/unwrap';
import { type Epic, type Issue } from '../config/trackerConfig';

const PRIORITY_TIERS: Array<Issue['priority'] | ''> = ['P0', 'P1', 'P2', ''];
const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 };

// Dates are stored as UTC; render in UTC so a UTC-midnight date doesn't roll back
// a day in western timezones (ported from epic-detail.js).
function fmtDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function daysBetween(startIso?: string, endIso?: string): number | null {
  if (!startIso) return null;
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return days < 0 ? 0 : days;
}

function epicTimeline(epic: Epic): string | null {
  const startStr = fmtDate(epic.started_at);
  if (!startStr) return null;
  const endStr = fmtDate(epic.completed_at);
  const days = daysBetween(epic.started_at, epic.completed_at);
  const target = endStr || 'in progress';
  const duration = days === null ? '' : ` · ${days} day${days === 1 ? '' : 's'}${endStr ? '' : ' ongoing'}`;
  return `${startStr} → ${target}${duration}`;
}

function IssueRow({ issue, epicSlug }: { issue: Issue; epicSlug: string }) {
  const navigate = useNavigate();
  const tasks = Object.values(issue.tasks || {});
  const total = tasks.length;
  const done = tasks.filter((t) => t.state === 'completed').length;
  const completed = issue.state === 'completed';

  return (
    <button
      type="button"
      onClick={() => navigate(`/epics/${encodeURIComponent(epicSlug)}/${issue.issue_number}`)}
      className={`flex w-full items-center gap-3 rounded-lg border border-divider bg-content1 px-3 py-2 text-left transition-colors hover:bg-content2 ${
        completed ? 'opacity-60' : ''
      }`}
    >
      <span className="font-mono text-xs text-default-400">#{issue.issue_number}</span>
      <span className="flex-1 truncate text-sm text-foreground">{issue.title}</span>
      <div className="flex items-center gap-1.5">
        {issue.added_mid_epic === true && (
          <Chip size="sm" variant="flat" color="warning" title="Ad hoc — added after the epic was already active">
            AdHoc
          </Chip>
        )}
        {total > 0 && <span className="text-xs text-default-400">{done}/{total} ✓</span>}
        {issue.priority ? (
          <Chip size="sm" variant="flat" color={priorityChipColor(issue.priority)}>
            {issue.priority}
          </Chip>
        ) : null}
        {issue.effort ? (
          <Chip size="sm" variant="bordered" color={effortChipColor(issue.effort)}>
            {issue.effort}
          </Chip>
        ) : null}
        <Chip size="sm" variant="flat" color={stateChipColor(issue.state)}>
          {issue.state || 'backlog'}
        </Chip>
      </div>
    </button>
  );
}

export default function EpicDetailPage() {
  const { slug = '' } = useParams();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'priority' ? 'priority' : 'rank';

  const [epic, setEpic] = useState<Epic | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline-edit state
  const [editingDue, setEditingDue] = useState(false);
  const [dueValue, setDueValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data: any = await TrackerApi.epics.get(slug);
        const ep: Epic | null = data?.epic ?? data ?? null;
        const iss: Issue[] = data?.issues ? asArray<Issue>(data.issues) : [];
        if (cancelled) return;
        if (!ep) {
          setError(`Epic "${slug}" not found.`);
        } else {
          setEpic(ep);
          setIssues(iss);
          setDueValue((ep.due_date as string) || '');
          setDescValue(ep.description || '');
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load epic');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const setView = (v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v === 'rank') next.delete('view');
        else next.set('view', v);
        return next;
      },
      { replace: true },
    );

  const saveDue = async (val: string) => {
    try {
      await TrackerApi.epics.update(slug, { due_date: val || null } as Partial<Epic>);
      setEpic((e) => (e ? { ...e, due_date: val || undefined } : e));
      setEditingDue(false);
    } catch (err: any) {
      toast.showError(`Failed to update due date: ${err?.message}`);
      setEditingDue(false);
    }
  };

  const saveDesc = async () => {
    setSavingDesc(true);
    try {
      await TrackerApi.epics.update(slug, { description: descValue.trim() });
      setEpic((e) => (e ? { ...e, description: descValue.trim() } : e));
      setEditingDesc(false);
    } catch (err: any) {
      toast.showError(`Failed to update description: ${err?.message}`);
    } finally {
      setSavingDesc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading epic…" />
      </div>
    );
  }
  if (error || !epic) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link as={RouterLink} to="/epics" size="sm" color="foreground" className="mb-4 inline-block">
          ← Epics
        </Link>
        <ErrorState message={error || 'Epic not found'} />
      </div>
    );
  }

  const openIssues = issues
    .filter((i) => i.state !== 'completed')
    .sort((a, b) => {
      const ar = a.priority_rank ?? Infinity;
      const br = b.priority_rank ?? Infinity;
      if (ar !== br) return ar - br;
      return (PRIORITY_ORDER[a.priority as string] ?? 3) - (PRIORITY_ORDER[b.priority as string] ?? 3);
    });
  const completedIssues = issues.filter((i) => i.state === 'completed');

  const added = issues.filter((i) => i.added_mid_epic === true).length;
  const baseline = issues.length - added;
  const timeline = epicTimeline(epic);

  return (
    <div className="mx-auto max-w-5xl">
      <Link as={RouterLink} to="/epics" size="sm" color="foreground" className="mb-4 inline-block">
        ← Epics
      </Link>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground">{epic.title || slug}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-default-500">
          <span>
            {issues.length} issue{issues.length !== 1 ? 's' : ''}
          </span>
          {issues.length > 0 && (
            <span>
              {baseline} baseline{added > 0 ? ` · ${added} ad hoc` : ''}
            </span>
          )}
          {timeline && (
            <span>
              <span className="text-default-400">Timeline:</span> {timeline}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="text-default-400">Due:</span>
            {editingDue ? (
              <Input
                type="date"
                size="sm"
                className="w-40"
                value={dueValue}
                onValueChange={setDueValue}
                onBlur={() => saveDue(dueValue)}
                autoFocus
              />
            ) : (
              <>
                <span className={epic.due_date ? '' : 'text-default-400'}>
                  {(epic.due_date as string) || 'not set'}
                </span>
                <button type="button" className="text-xs text-secondary" onClick={() => setEditingDue(true)}>
                  edit
                </button>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6 rounded-lg border border-divider bg-content1 p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-default-500">Description</span>
          {!editingDesc && (
            <button type="button" className="text-xs text-secondary" onClick={() => setEditingDesc(true)}>
              edit
            </button>
          )}
        </div>
        {editingDesc ? (
          <div className="flex flex-col gap-2">
            <Textarea minRows={3} value={descValue} onValueChange={setDescValue} variant="bordered" />
            <div className="flex gap-2">
              <Button size="sm" color="secondary" isLoading={savingDesc} onPress={saveDesc}>
                Save
              </Button>
              <Button
                size="sm"
                variant="light"
                onPress={() => {
                  setDescValue(epic.description || '');
                  setEditingDesc(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className={`text-sm ${epic.description ? 'text-foreground' : 'text-default-400'}`}>
            {epic.description || 'No description.'}
          </p>
        )}
      </div>

      {/* Issues */}
      <div className="mb-3">
        <Tabs aria-label="Issue lists" variant="underlined" color="secondary">
          <Tab key="open" title={`Open (${openIssues.length})`}>
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <Tabs
                  aria-label="View mode"
                  size="sm"
                  selectedKey={view}
                  onSelectionChange={(k) => setView(String(k))}
                >
                  <Tab key="rank" title="Rank" />
                  <Tab key="priority" title="Priority" />
                </Tabs>
              </div>
              {openIssues.length === 0 ? (
                <div className="py-8 text-center text-sm text-default-400">No open issues.</div>
              ) : view === 'priority' ? (
                PRIORITY_TIERS.map((tier) => {
                  const group = openIssues.filter((i) => (i.priority || '') === tier);
                  if (!group.length) return null;
                  return (
                    <div key={tier || 'none'} className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-default-500">
                        {tier || 'None'}
                      </span>
                      {group.map((i) => (
                        <IssueRow key={i.issue_number} issue={i} epicSlug={slug} />
                      ))}
                    </div>
                  );
                })
              ) : (
                openIssues.map((i) => <IssueRow key={i.issue_number} issue={i} epicSlug={slug} />)
              )}
            </div>
          </Tab>
          <Tab key="completed" title={`Completed (${completedIssues.length})`}>
            <div className="flex flex-col gap-2">
              {completedIssues.length === 0 ? (
                <div className="py-8 text-center text-sm text-default-400">No completed issues.</div>
              ) : (
                completedIssues.map((i) => <IssueRow key={i.issue_number} issue={i} epicSlug={slug} />)
              )}
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
