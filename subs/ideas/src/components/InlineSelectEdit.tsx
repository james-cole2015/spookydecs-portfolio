/**
 * InlineSelectEdit — click-to-reveal Select for enum-valued fields (season,
 * etc.), sibling to InlineEdit. Click the value to reveal the dropdown;
 * choosing an option saves immediately via onSave.
 */
import { useState } from 'react';
import { Select, SelectItem } from '@heroui/react';

export function InlineSelectEdit({
  value,
  options,
  onSave,
  displayClassName,
}: {
  value: string;
  options: readonly string[];
  onSave: (next: string) => Promise<void>;
  displayClassName?: string;
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
        selectedKeys={[value]}
        disallowEmptySelection
        onChange={(e) => {
          // HeroUI's hidden native <select> shim can fire an intermediate
          // change event with a partial/garbage value before the real one
          // (observed: a single-character "C" ahead of "Christmas") — only
          // commit values that are actually one of the valid options.
          if (options.includes(e.target.value)) void commit(e.target.value);
        }}
        onBlur={() => setEditing(false)}
      >
        {options.map((o) => (
          <SelectItem key={o}>{o}</SelectItem>
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
      <span className={displayClassName ?? 'text-small text-foreground/80'}>{value}</span>
    </div>
  );
}
