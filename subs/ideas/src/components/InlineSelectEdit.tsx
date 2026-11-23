/**
 * InlineSelectEdit — click-to-reveal Select for enum-valued fields (season,
 * etc.), sibling to InlineEdit. Click the value to reveal the dropdown;
 * choosing an option saves immediately via onSave.
 */
import { useState } from 'react';
import { Select, SelectItem } from '@heroui/react';

const CLEAR_KEY = '__clear__';

export function InlineSelectEdit({
  value,
  options,
  onSave,
  displayClassName,
  clearLabel,
  placeholder = 'Not set',
}: {
  value: string;
  options: readonly string[];
  onSave: (next: string) => Promise<void>;
  displayClassName?: string;
  /** When set, adds a leading option with this label that saves an empty string. */
  clearLabel?: string;
  /** Shown in place of the value when it is empty. */
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function commit(next: string) {
    setEditing(false);
    if (next === value) return;
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Select
        autoFocus
        size="sm"
        aria-label="Edit value"
        className="max-w-40"
        selectedKeys={[value || CLEAR_KEY]}
        disallowEmptySelection
        onChange={(e) => {
          // HeroUI's hidden native <select> shim can fire an intermediate
          // change event with a partial/garbage value before the real one
          // (observed: a single-character "C" ahead of "Christmas") — only
          // commit values that are actually one of the valid options.
          if (clearLabel && e.target.value === CLEAR_KEY) void commit('');
          else if (options.includes(e.target.value)) void commit(e.target.value);
        }}
        onBlur={() => setEditing(false)}
      >
        {[
          ...(clearLabel ? [{ key: CLEAR_KEY, label: clearLabel }] : []),
          ...options.map((o) => ({ key: o, label: o })),
        ].map((o) => (
          <SelectItem key={o.key}>{o.label}</SelectItem>
        ))}
      </Select>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      title="Click to edit"
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') setEditing(true);
      }}
      className={`cursor-pointer rounded-medium px-2 py-1 transition-colors hover:bg-default-100 ${
        saving ? 'opacity-50' : ''
      }`}
    >
      {value ? (
        <span className={displayClassName ?? 'text-small text-foreground/80'}>{value}</span>
      ) : (
        <span className="text-small text-default-400">{placeholder}</span>
      )}
    </div>
  );
}
