import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Textarea, Select, SelectItem } from '@heroui/react';
import { Plus, X } from 'lucide-react';
import { PageHeader, useToast } from '@spookydecs/ui';
import TrackerApi from '../api/trackerApi';
import { asArray, asItem } from '../lib/unwrap';
import type { Epic, Issue } from '../config/trackerConfig';

function epicValue(epic: Epic): string {
  return (epic.epic_name as string) || epic.slug || (epic.id as string);
}

interface TaskRow {
  id: number;
  value: string;
}

export default function CreateIssuePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [epics, setEpics] = useState<Epic[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentEpic, setParentEpic] = useState('');
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nextId, setNextId] = useState(1);

  useEffect(() => {
    let cancelled = false;
    TrackerApi.epics
      .list()
      .then((d) => {
        if (!cancelled) setEpics(asArray<Epic>(d));
      })
      .catch(() => {
        /* proceed with empty dropdown */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addTaskRow = () => {
    setTasks((prev) => [...prev, { id: nextId, value: '' }]);
    setNextId((n) => n + 1);
  };
  const updateTaskRow = (id: number, value: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, value } : t)));
  const removeTaskRow = (id: number) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const submit = async () => {
    setError(null);
    if (!title.trim()) return setError('Title is required.');
    if (!description.trim()) return setError('Description is required.');
    if (!parentEpic) return setError('Please select an epic.');

    setSubmitting(true);
    try {
      const created = asItem<Issue>(
        await TrackerApi.issues.create({ title: title.trim(), description: description.trim(), parent_epic: parentEpic }),
      );
      const issueNumber = created?.issue_number;

      const taskTitles = tasks.map((t) => t.value.trim()).filter(Boolean);
      if (issueNumber && taskTitles.length) {
        await Promise.allSettled(
          taskTitles.map((t) => TrackerApi.tasks.create({ parent_issue: issueNumber, title: t, description: '' })),
        );
      }
      navigate(`/epics/${encodeURIComponent(parentEpic)}/${issueNumber}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create issue. Please try again.');
      toast.showError(err?.message || 'Failed to create issue');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New Issue" />
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <Input
          label="Title"
          isRequired
          placeholder="Short, descriptive title"
          value={title}
          onValueChange={setTitle}
          variant="bordered"
        />
        <Textarea
          label="Description"
          isRequired
          minRows={5}
          placeholder="Describe the issue in detail"
          value={description}
          onValueChange={setDescription}
          variant="bordered"
        />
        <Select
          label="Epic"
          isRequired
          placeholder="— Select an epic —"
          selectedKeys={parentEpic ? [parentEpic] : []}
          onChange={(e) => setParentEpic(e.target.value)}
          variant="bordered"
        >
          {epics.map((epic) => (
            <SelectItem key={epicValue(epic)}>{epic.title || epicValue(epic)}</SelectItem>
          ))}
        </Select>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-default-600">
            Initial tasks <span className="text-default-400">(optional)</span>
          </span>
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <Input
                size="sm"
                placeholder="Task description"
                value={t.value}
                onValueChange={(v) => updateTaskRow(t.id, v)}
                variant="bordered"
              />
              <Button isIconOnly size="sm" variant="light" onPress={() => removeTaskRow(t.id)} aria-label="Remove task">
                <X size={16} />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="flat" startContent={<Plus size={15} />} onPress={addTaskRow} className="self-start">
            Add task
          </Button>
        </div>

        {error && <div className="text-sm text-danger">{error}</div>}

        <div className="flex gap-3">
          <Button type="submit" color="secondary" isLoading={submitting}>
            Create issue
          </Button>
          <Button variant="light" onPress={() => navigate('/')} isDisabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
