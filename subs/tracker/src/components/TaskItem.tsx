/**
 * TaskItem — a single task row in the issue detail (toggle, expand, inline
 * description edit, state select, append-only notes). Ported from the per-row
 * wiring in issue-detail.js renderTasks/buildTaskRow. Mutations are delegated to
 * the parent via callbacks that resolve with the updated task.
 */
import { useState } from 'react';
import { Button, Select, SelectItem, Textarea } from '@heroui/react';
import { ChevronRight } from 'lucide-react';
import type { Task } from '../config/trackerConfig';

// Detail-panel state options, preserved verbatim from the vanilla select (note
// 'planned' rather than 'ready' — an existing quirk, kept as-is).
const TASK_STATES = ['backlog', 'planned', 'open', 'blocked', 'completed'];

function fmtDate(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

interface TaskItemProps {
  task: Task;
  onPatch: (taskId: string, partial: Partial<Task>) => Promise<Task | null>;
  onAddNote: (taskId: string, text: string) => Promise<Task | null>;
}

export default function TaskItem({ task, onPatch, onAddNote }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(task.description || '');
  const [savingDesc, setSavingDesc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const taskId = task.task_id || (task as any).id || '';
  const taskNum = taskId.includes('#') ? '#' + taskId.split('#')[1] : '';
  const done = task.state === 'completed';
  const notes = Array.isArray(task.notes) ? task.notes : [];
  const tags = Array.isArray(task.tags) ? task.tags : [];
  const createdStr = fmtDate(task.task_created);
  const closedStr = fmtDate((task as any).task_closed);

  const toggle = async () => {
    setBusy(true);
    try {
      await onPatch(taskId, { state: done ? 'open' : 'completed' });
    } finally {
      setBusy(false);
    }
  };

  const saveDesc = async () => {
    setSavingDesc(true);
    try {
      await onPatch(taskId, { description: descDraft.trim() });
      setEditingDesc(false);
    } finally {
      setSavingDesc(false);
    }
  };

  const submitNote = async () => {
    const text = noteDraft.trim();
    if (!text) return;
    setAddingNote(true);
    try {
      await onAddNote(taskId, text);
      setNoteDraft('');
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className={`rounded-lg border border-divider bg-content1 ${done ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
            done ? 'border-success bg-success/20 text-success' : 'border-default-300 text-default-400'
          }`}
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        >
          {done ? '✓' : '○'}
        </button>
        {taskNum && <span className="font-mono text-xs text-default-400">{taskNum}</span>}
        <span className={`flex-1 text-sm ${done ? 'text-default-400 line-through' : 'text-foreground'}`}>
          {task.title || task.description}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label="Expand task"
          className="text-default-400"
        >
          <ChevronRight size={16} className={expanded ? 'rotate-90 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-divider px-3 py-3">
          {/* Description */}
          <div>
            {editingDesc ? (
              <div className="flex flex-col gap-2">
                <Textarea minRows={3} value={descDraft} onValueChange={setDescDraft} variant="bordered" autoFocus />
                <div className="flex gap-2">
                  <Button size="sm" color="secondary" isLoading={savingDesc} onPress={saveDesc}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setDescDraft(task.description || '');
                      setEditingDesc(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <span className={`text-sm ${task.description ? 'text-foreground' : 'text-default-400'}`}>
                  {task.description || 'No description.'}
                </span>
                <button type="button" className="shrink-0 text-xs text-secondary" onClick={() => setEditingDesc(true)}>
                  edit
                </button>
              </div>
            )}
          </div>

          {/* Meta: state + tags + timestamps */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-default-400">
            <div className="flex items-center gap-1.5">
              <span>State</span>
              <Select
                aria-label="Task state"
                size="sm"
                className="w-32"
                selectedKeys={[task.state]}
                onChange={(e) => e.target.value && onPatch(taskId, { state: e.target.value })}
              >
                {TASK_STATES.map((s) => (
                  <SelectItem key={s}>{s}</SelectItem>
                ))}
              </Select>
            </div>
            {tags.length > 0 && <span>{tags.join(', ')}</span>}
            {createdStr && <span>created {createdStr}</span>}
            {closedStr && <span>closed {closedStr}</span>}
          </div>

          {/* Notes */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-default-500">Notes</div>
            <div className="flex flex-col gap-1.5">
              {notes.length ? (
                notes.map((n: any, i: number) => (
                  <div key={i} className="rounded bg-content2 px-2 py-1">
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
                placeholder="Add a note…"
                value={noteDraft}
                onValueChange={setNoteDraft}
                variant="bordered"
              />
              <Button size="sm" color="secondary" isLoading={addingNote} onPress={submitNote}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
