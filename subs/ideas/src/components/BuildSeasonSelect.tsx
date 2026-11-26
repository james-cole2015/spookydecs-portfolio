/**
 * BuildSeasonSelect (#625) — always-rendered Select for an idea's Build Season
 * (`bucket`). Unlike InlineSelectEdit it has no click-to-reveal step: the
 * reveal pattern unmounts its Select as soon as the popover takes focus, which
 * left nothing to pick from. A leading "None" option clears the value.
 */
import { useState } from 'react';
import { Select, SelectItem } from '@heroui/react';

const NONE_KEY = '__none__';

export function BuildSeasonSelect({
  value,
  options,
  onSave,
}: {
  value: string;
  options: readonly string[];
  onSave: (next: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  async function commit(next: string) {
    if (next === value) return;
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select
      size="sm"
      aria-label="Build Season"
      className="max-w-44"
      placeholder="Not set"
      isDisabled={saving}
      selectedKeys={[value || NONE_KEY]}
      disallowEmptySelection
      onChange={(e) => {
        // Ignore HeroUI's intermediate shim events — only commit real options.
        if (e.target.value === NONE_KEY) void commit('');
        else if (options.includes(e.target.value)) void commit(e.target.value);
      }}
    >
      {[{ key: NONE_KEY, label: 'None' }, ...options.map((o) => ({ key: o, label: o }))].map((o) => (
        <SelectItem key={o.key}>{o.label}</SelectItem>
      ))}
    </Select>
  );
}
