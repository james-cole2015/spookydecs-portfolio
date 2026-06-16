/**
 * InlineEdit — the display ↔ edit toggle the vanilla tracker hand-rolled for every
 * editable field (title, description, AC, resolution, epic description). Click
 * "edit" → input/textarea + Save/Cancel; Save calls `onSave` and shows a spinner.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Input, Textarea } from '@heroui/react';

interface InlineEditProps {
  value: string;
  onSave: (val: string) => Promise<void>;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  emptyText?: string;
  /** Custom display renderer (e.g. grouped AC). Falls back to plain text. */
  renderDisplay?: (value: string) => ReactNode;
  /** Display text classes for the plain-text fallback. */
  displayClassName?: string;
}

export default function InlineEdit({
  value,
  onSave,
  multiline = false,
  rows = 3,
  placeholder,
  emptyText = 'Not set.',
  renderDisplay,
  displayClassName,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  // Keep the draft in sync when the underlying value changes (e.g. after reload).
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        {multiline ? (
          <Textarea minRows={rows} value={draft} onValueChange={setDraft} variant="bordered" autoFocus />
        ) : (
          <Input value={draft} onValueChange={setDraft} variant="bordered" autoFocus />
        )}
        <div className="flex gap-2">
          <Button size="sm" color="secondary" isLoading={saving} onPress={save}>
            Save
          </Button>
          <Button
            size="sm"
            variant="light"
            onPress={() => {
              setDraft(value);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        {renderDisplay ? (
          renderDisplay(value)
        ) : (
          <span className={`${displayClassName ?? 'text-sm text-foreground'} ${value ? '' : 'text-default-400'}`}>
            {value || emptyText}
          </span>
        )}
      </div>
      <button type="button" className="shrink-0 text-xs text-secondary" onClick={() => setEditing(true)}>
        edit
      </button>
    </div>
  );
}
