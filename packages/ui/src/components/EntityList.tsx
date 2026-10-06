/**
 * EntityList — a filterable, scrollable list for choosing one record from a short
 * set. Shows every candidate at once (so a record can be scanned for, not guessed
 * by name), with a text search and toggle chips built from each option's tags.
 *
 * Chips combine with AND: selecting "inspection" and "scheduled" shows only
 * scheduled inspections. Use EntityPicker instead for large sets that need a
 * server-side search.
 */
import { useMemo, useState } from 'react';
import { Chip, Input } from '@heroui/react';
import type { PickerOption } from './EntityPicker';

export interface EntityListOption extends PickerOption {
  /** Filter chips for this row (e.g. record type, status). */
  tags?: string[];
}

export interface EntityListProps {
  options: EntityListOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchLabel?: string;
  emptyText?: string;
  loading?: boolean;
}

export function EntityList({
  options,
  selectedId,
  onSelect,
  searchLabel = 'Filter',
  emptyText = 'Nothing to show',
  loading = false,
}: EntityListProps) {
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Distinct tags across all options, in first-seen order, for the chip row.
  const allTags = useMemo(() => {
    const seen: string[] = [];
    for (const o of options) {
      for (const t of o.tags ?? []) if (!seen.includes(t)) seen.push(t);
    }
    return seen;
  }, [options]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter((o) => {
      if (activeTags.some((t) => !(o.tags ?? []).includes(t))) return false;
      if (!needle) return true;
      return (
        o.label.toLowerCase().includes(needle) ||
        o.id.toLowerCase().includes(needle) ||
        (o.description ?? '').toLowerCase().includes(needle)
      );
    });
  }, [options, query, activeTags]);

  const toggleTag = (tag: string) =>
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div className="flex flex-col gap-3">
      <Input
        label={searchLabel}
        variant="bordered"
        value={query}
        onValueChange={setQuery}
        isClearable
        onClear={() => setQuery('')}
      />

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter chips">
          {allTags.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <Chip
                key={tag}
                as="button"
                type="button"
                size="sm"
                variant={active ? 'solid' : 'bordered'}
                color={active ? 'primary' : 'default'}
                aria-pressed={active}
                onClick={() => toggleTag(tag)}
                className="cursor-pointer"
              >
                {tag}
              </Chip>
            );
          })}
        </div>
      )}

      <div className="text-tiny text-default-500" aria-live="polite">
        {loading ? 'Loading…' : `${visible.length} of ${options.length}`}
      </div>

      <div
        role="listbox"
        aria-label={searchLabel}
        className="flex max-h-96 flex-col overflow-y-auto rounded-medium border border-default-200"
      >
        {!loading && visible.length === 0 && (
          <div className="px-4 py-6 text-center text-small text-default-500">{emptyText}</div>
        )}
        {visible.map((option) => {
          const selected = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(option.id)}
              className={`flex flex-col items-start gap-0.5 border-b border-default-100 px-4 py-2 text-left text-foreground last:border-b-0 hover:bg-default-100 ${
                selected ? 'bg-primary/20 font-medium' : ''
              }`}
            >
              <span className="text-small text-foreground">{option.label}</span>
              {option.description && (
                <span className="text-tiny text-default-500">{option.description}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
