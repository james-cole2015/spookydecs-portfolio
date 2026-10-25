/**
 * StatusEdit — click-to-reveal Select for the idea status (#683). Offers only
 * the current status plus its legal next states; blocked targets (gate fields
 * missing, build cap) are shown disabled with the reason. Picking a status
 * hands off to the caller's existing transition function — nothing is saved here.
 */
import { useState } from 'react';
import { Select, SelectItem } from '@heroui/react';
import type { Status } from '../config/ideasConfig';

export function StatusEdit({
  value,
  next,
  blocked,
  onSelect,
}: {
  value: Status;
  next: Status[];
  blocked: Partial<Record<Status, string>>;
  onSelect: (next: Status) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (next.length === 0) return <span className="px-2 py-1 text-small text-foreground/80">{value}</span>;

  if (editing) {
    const options = [value, ...next];
    return (
      <Select
        autoFocus
        size="sm"
        aria-label="Change status"
        className="max-w-40"
        selectedKeys={[value]}
        disallowEmptySelection
        disabledKeys={Object.keys(blocked)}
        onChange={(e) => {
          setEditing(false);
          if (e.target.value !== value && (next as string[]).includes(e.target.value)) {
            onSelect(e.target.value as Status);
          }
        }}
        onBlur={() => setEditing(false)}
      >
        {options.map((o) => (
          <SelectItem key={o} description={blocked[o as Status]}>
            {o}
          </SelectItem>
        ))}
      </Select>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      title="Click to change status"
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') setEditing(true);
      }}
      className="cursor-pointer rounded-medium px-2 py-1 transition-colors hover:bg-default-100"
    >
      <span className="text-small text-foreground/80">{value}</span>
    </div>
  );
}
