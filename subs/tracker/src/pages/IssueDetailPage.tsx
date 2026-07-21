import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import {
  Button,
  Chip,
  Input,
  Link,
  Progress,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from '@heroui/react';
import { ErrorState, useToast, usePhotoUpload, stateChipColor } from '@spookydecs/ui';
import TrackerApi from '../api/trackerApi';
import { asArray, asItem } from '../lib/unwrap';
import {
  ISSUE_STATES,
  PRIORITIES,
  EFFORTS,
  type Attachment,
  type Epic,
  type Issue,
  type Task,
} from '../config/trackerConfig';
import InlineEdit from '../components/InlineEdit';
import AcDisplay from '../components/AcDisplay';
import TaskItem from '../components/TaskItem';

function epicValue(epic: Epic): string {
  return (epic.epic_name as string) || epic.slug || (epic.id as string);
}

export default function IssueDetailPage() {
  const { slug = '', issue: issueParam = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const photoUpload = usePhotoUpload();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTask, setNewTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [issueData, epicData, taskData] = await Promise.all([
          TrackerApi.issues.get(issueParam),
          TrackerApi.epics.list(),
          TrackerApi.tasks.list(issueParam),
        ]);
        const iss = asItem<Issue>(issueData);
        if (!iss) {
          if (!cancelled) setError(`Issue #${issueParam} not found.`);
          return;
        }
        let att: Attachment[] = [];
        try {
          att = asArray<Attachment>(await TrackerApi.attachments.list(issueParam));
        } catch {
          // attachment routes not yet deployed — render empty state
        }
        if (cancelled) return;
        setIssue(iss);
        setEpics(asArray<Epic>(epicData));
        const taskList = asArray<Task>(taskData);
        setTasks(taskList.length ? taskList : Object.values(iss.tasks || {}));
        setAttachments(att);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load issue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issueParam]);

  const patchIssue = async (partial: Partial<Issue>) => {
    try {
      await TrackerApi.issues.update(issueParam, partial);
      setIssue((prev) => (prev ? { ...prev, ...partial } : prev));
    } catch (err: any) {
      toast.showError(`Failed to update: ${err?.message}`);
      throw err;
    }
  };

  const patchTask = async (taskId: string, partial: Partial<Task>): Promise<Task | null> => {
    try {
      const updated = asItem<Task>(await TrackerApi.tasks.update(taskId, partial));
      setTasks((prev) => prev.map((t) => (t.task_id === taskId ? { ...t, ...partial, ...(updated || {}) } : t)));
      return updated;
    } catch (err: any) {
      toast.showError(`Failed to update task: ${err?.message}`);
      return null;
    }
  };

  const addTaskNote = async (taskId: string, text: string): Promise<Task | null> => {
    try {
      const updated = asItem<Task>(await TrackerApi.tasks.addNote(taskId, text));
      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === taskId ? { ...t, notes: updated?.notes ?? [...(t.notes || []), { text } as any] } : t,
        ),
      );
      return updated;
    } catch (err: any) {
      toast.showError(`Failed to add note: ${err?.message}`);
      return null;
    }
  };

  const submitNewTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    setAddingTask(true);
    try {
      const created = asItem<Task>(await TrackerApi.tasks.create({ parent_issue: issueParam, title, description: '' }));
      if (created) setTasks((prev) => [...prev, created]);
      setNewTask('');
    } catch (err: any) {
      toast.showError(`Failed to create task: ${err?.message}`);
    } finally {
      setAddingTask(false);
    }
  };

  const submitNewNote = async () => {
    const text = newNote.trim();
    if (!text) return;
    setAddingNote(true);
    try {
      const updated = asItem<Issue>(await TrackerApi.issues.update(issueParam, { add_note: text } as Partial<Issue>));
      setIssue((prev) => (prev ? { ...prev, notes: updated?.notes ?? [...(prev.notes || []), { text } as any] } : prev));
      setNewNote('');
    } catch (err: any) {
      toast.showError(`Failed to add note: ${err?.message}`);
    } finally {
      setAddingNote(false);
    }
  };

  const reloadAttachments = async () => {
    try {
      setAttachments(asArray<Attachment>(await TrackerApi.attachments.list(issueParam)));
    } catch {
      /* ignore */
    }
  };

  const uploadScreenshot = async () => {
    if (!issue) return;
    const uploaded = await photoUpload.openWithEditor({
      context: 'tracker',
      idField: 'record_id',
      entityId: String(issue.issue_number),
      photo_type: 'screenshot',
      season: 'shared',
    });
    if (!uploaded.length) return;
    const photos = uploaded.map((p) => ({
      photo_id: p.photo_id,
      url: p.cloudfront_url,
      thumb_url: p.thumb_cloudfront_url,
      s3_key: (p as any).s3_key,
    }));
    try {
      await TrackerApi.attachments.create(issueParam, { photos });
      await reloadAttachments();
    } catch (err: any) {
      toast.showError(`Failed to save attachment: ${err?.message}`);
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    try {
      await TrackerApi.attachments.remove(issueParam, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err: any) {
      toast.showError(`Failed to remove attachment: ${err?.message}`);
    }
  };

  const photos = useMemo(() => attachments.filter((a) => (a.attachment_type || 'photo') === 'photo'), [attachments]);
  const docs = useMemo(() => attachments.filter((a) => a.attachment_type === 'document'), [attachments]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading issue…" />
      </div>
    );
  }
  if (error || !issue) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link as={RouterLink} to="/priority" size="sm" color="foreground" className="mb-4 inline-block">
          ← Back to Priority
        </Link>
        <ErrorState message={error || 'Could not load issue'} />
      </div>
    );
  }

  const currentEpic = issue.parent_epic || '';
  const taskTotal = tasks.length;
  const taskDone = tasks.filter((t) => t.state === 'completed').length;
  const taskPct = taskTotal ? Math.round((taskDone / taskTotal) * 100) : 0;
  const notes = (issue.notes as any[]) || [];
  const showResolution = issue.state === 'completed' || Boolean(issue.resolution);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumbs */}
      <div className="mb-4 flex items-center gap-1.5 text-sm text-default-500">
        <Link as={RouterLink} to="/priority" size="sm" color="foreground">
          Priority
        </Link>
        {currentEpic && (
          <>
            <span>›</span>
            <Link as={RouterLink} to={`/epics/${encodeURIComponent(currentEpic)}`} size="sm" color="foreground">
              {currentEpic}
            </Link>
          </>
        )}
        <span>›</span>
        <span className="text-default-400">#{issue.issue_number}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <span className="font-mono text-sm text-default-400">#{issue.issue_number}</span>
        <div className="flex-1">
          <InlineEdit
            value={issue.title}
            onSave={(v) => patchIssue({ title: v.trim() })}
            displayClassName="text-xl font-semibold text-foreground"
          />
          <div className="mt-2 flex items-center gap-1.5">
            <Chip size="sm" variant="flat" color={stateChipColor(issue.state)}>
              {issue.state}
            </Chip>
            {currentEpic && (
              <Chip size="sm" variant="bordered">
                {currentEpic}
              </Chip>
            )}
            {issue.added_mid_epic === true && (
              <Chip size="sm" variant="flat" color="warning" title="Ad hoc — added after the epic was already active">
                AdHoc
              </Chip>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-500">Description</h2>
            <InlineEdit
              value={(issue.description || '').trim()}
              onSave={(v) => patchIssue({ description: v.trim() })}
              multiline
              rows={5}
              emptyText="No description."
            />
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">Tasks</h2>
              <span className="text-xs text-default-400">{taskTotal}</span>
            </div>
            {taskTotal > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <Progress aria-label="Task progress" size="sm" value={taskPct} color="success" className="max-w-xs" />
                <span className="text-xs text-default-400">
                  {taskDone}/{taskTotal} tasks
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {tasks.length ? (
                tasks.map((t) => (
                  <TaskItem key={t.task_id} task={t} onPatch={patchTask} onAddNote={addTaskNote} />
                ))
              ) : (
                <div className="text-sm text-default-400">No tasks yet.</div>
              )}
            </div>
            <div className="mt-3 flex items-end gap-2">
              <Input
                size="sm"
                placeholder="Add a task…"
                value={newTask}
                onValueChange={setNewTask}
                variant="bordered"
                onKeyDown={(e) => e.key === 'Enter' && submitNewTask()}
              />
              <Button size="sm" variant="flat" isLoading={addingTask} onPress={submitNewTask}>
                Add
              </Button>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">Notes</h2>
              <span className="text-xs text-default-400">{notes.length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {notes.length ? (
                notes.map((n, i) => (
                  <div key={i} className="rounded bg-content2 px-2 py-1.5">
                    <div className="text-sm text-foreground">{n.text}</div>
                    {n.created_at && <div className="text-[11px] text-default-400">{n.created_at}</div>}
                  </div>
                ))
              ) : (
                <div className="text-sm text-default-400">No notes yet.</div>
              )}
            </div>
            <div className="mt-2 flex items-end gap-2">
              <Textarea
                size="sm"
                minRows={2}
                placeholder="Add a note or update…"
                value={newNote}
                onValueChange={setNewNote}
                variant="bordered"
              />
              <Button size="sm" variant="flat" isLoading={addingNote} onPress={submitNewNote}>
                Add note
              </Button>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-500">Screenshots</h2>
            <div className="flex flex-wrap gap-2">
              {photos.length ? (
                photos.map((a) => (
                  <div key={a.id} className="relative">
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={a.thumb_url || a.url}
                        alt="screenshot"
                        loading="lazy"
                        className="h-20 w-20 rounded-lg border border-divider object-cover"
                      />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      title="Remove"
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-default-400">No screenshots yet.</div>
              )}
            </div>
            <Button size="sm" variant="flat" className="mt-3" onPress={uploadScreenshot}>
              + Add screenshot
            </Button>
          </section>

          {docs.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-500">Documents</h2>
              <div className="flex flex-col gap-1.5">
                {docs.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded bg-content2 px-2 py-1.5 text-sm">
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-secondary">
                      {a.filename || 'document'}
                    </a>
                    <span className="text-default-400">↗</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      title="Remove"
                      className="ml-auto text-default-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-divider bg-content1 p-4">
            <Select
              label="State"
              size="sm"
              selectedKeys={[issue.state]}
              onChange={(e) => e.target.value && patchIssue({ state: e.target.value })}
            >
              {ISSUE_STATES.map((s) => (
                <SelectItem key={s}>{s}</SelectItem>
              ))}
            </Select>
            <Select
              label="Epic"
              size="sm"
              selectedKeys={currentEpic ? [currentEpic] : []}
              onChange={(e) => patchIssue({ parent_epic: e.target.value || undefined })}
            >
              {[
                <SelectItem key="">— Backlog —</SelectItem>,
                ...epics.map((ep) => <SelectItem key={epicValue(ep)}>{ep.title || epicValue(ep)}</SelectItem>),
              ]}
            </Select>
            <Select
              label="Priority"
              size="sm"
              selectedKeys={issue.priority ? [issue.priority] : []}
              onChange={(e) => patchIssue({ priority: e.target.value || undefined })}
            >
              {[
                <SelectItem key="">–</SelectItem>,
                ...PRIORITIES.map((p) => <SelectItem key={p}>{p}</SelectItem>),
              ]}
            </Select>
            <Select
              label="Effort"
              size="sm"
              selectedKeys={issue.effort ? [issue.effort] : []}
              onChange={(e) => patchIssue({ effort: e.target.value || undefined })}
            >
              {[
                <SelectItem key="">–</SelectItem>,
                ...EFFORTS.map((ef) => <SelectItem key={ef}>{ef}</SelectItem>),
              ]}
            </Select>
            <div className="flex items-center justify-between text-sm">
              <span className="text-default-500">Priority rank</span>
              <span className="text-foreground">{issue.priority_rank != null ? `#${issue.priority_rank}` : '—'}</span>
            </div>
          </div>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-500">Acceptance Criteria</h2>
            <InlineEdit
              value={(issue.acceptance_criteria || []).join('\n')}
              onSave={(v) =>
                patchIssue({
                  acceptance_criteria: v
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              multiline
              rows={6}
              renderDisplay={() => <AcDisplay items={issue.acceptance_criteria || []} />}
            />
          </section>

          {showResolution && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-500">Resolution</h2>
              <InlineEdit
                value={issue.resolution || ''}
                onSave={(v) => patchIssue({ resolution: v.trim() })}
                multiline
                rows={3}
                emptyText="Add a resolution…"
              />
            </section>
          )}
        </div>
      </div>
      {photoUpload.editor}
    </div>
  );
}
