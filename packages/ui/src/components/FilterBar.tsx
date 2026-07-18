/**
 * Shared filter bar — the single fleet-wide search + select toolbar
 * (design.md §6 finding F3). Generalized from storage's config-driven model:
 * `options` and `labels` are now props (the sub passes them from its own config)
 * instead of importing a specific sub's config, which is what lets the other
 * subs reuse it.
 *
 * Superset surface proven by storage here: a search input, N config-driven
 * `<Select>`s, and a Clear button. Optional debounced search (off by default —
 * storage flushes immediately) and an optional result count are baked in for
 * the subs that want them (items/ideas/images) during the #429 rollout.
 *
 * Deliberately NOT in the pilot: gallery's popover mode and audit's
 * export-only/no-search variant — those become slots/props when rolled out.
 */
import { useEffect, useRef, useState } from 'react';
import { Select, SelectItem, Input, Button } from '@heroui/react';
import { X } from 'lucide-react';

export type Filters = Record<string, string>;

const DEFAULT_LABELS: Record<string, string> = {
  season: 'Season',
  location: 'Location',
  class_type: 'Type',
  status: 'Status',
  size: 'Size',
};

export interface FilterBarProps {
  /** Current filter state, keyed by filter name (plus `search`). */
  filters: Filters;
  /** Which select keys to render, in order. */
  show: string[];
  /** key → option list (each list typically leads with `'All'`). */
  options: Record<string, string[]>;
  /** key → display label (falls back to a built-in map, then the raw key). */
  labels?: Record<string, string>;
  onChange: (next: Filters) => void;
  /** Render the search input. Default true. */
  search?: boolean;
  searchPlaceholder?: string;
  /** Debounce search emits by N ms. Default 0 (emit immediately). */
  searchDebounceMs?: number;
  /** Optional result count shown inline in the bar. */
  resultCount?: number;
}

export function FilterBar({
  filters,
  show,
  options,
  labels,
  onChange,
  search = true,
  searchPlaceholder = 'Search by name, ID, location…',
  searchDebounceMs = 0,
  resultCount,
}: FilterBarProps) {
  // Keep latest props reachable from the debounce timer without stale closures.
  const onChangeRef = useRef(onChange);
  const filtersRef = useRef(filters);
  onChangeRef.current = onChange;
  filtersRef.current = filters;

  // Local search mirror so typing stays responsive even when emits are debounced.
  const [draft, setDraft] = useState(filters.search ?? '');
  useEffect(() => {
    setDraft(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    if (searchDebounceMs <= 0) return;
    if (draft === (filtersRef.current.search ?? '')) return;
    const t = setTimeout(() => onChangeRef.current({ ...filtersRef.current, search: draft }), searchDebounceMs);
    return () => clearTimeout(t);
  }, [draft, searchDebounceMs]);

  function emitSearch(v: string) {
    setDraft(v);
    if (searchDebounceMs <= 0) onChangeRef.current({ ...filtersRef.current, search: v });
  }

  const isActive = (filters.search ?? '') !== '' || show.some((k) => (filters[k] ?? 'All') !== 'All');

  function clear() {
    const reset: Filters = { search: '' };
    show.forEach((k) => {
      reset[k] = 'All';
    });
    setDraft('');
    onChange(reset);
  }

  const label = (key: string) => labels?.[key] ?? DEFAULT_LABELS[key] ?? key;

  return (
    <div className="mb-6 grid grid-cols-1 gap-x-8 gap-y-5 rounded-xl border border-default-200 bg-content1 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {search && (
        <Input
          size="sm"
          variant="bordered"
          label="Search"
          placeholder={searchPlaceholder}
          value={draft}
          onValueChange={emitSearch}
          isClearable
          onClear={() => emitSearch('')}
        />
      )}
      {show.map((key) => {
        const opts = options[key] ?? ['All'];
        return (
          <Select
            key={key}
            size="sm"
            variant="bordered"
            label={label(key)}
            selectedKeys={filters[key] && filters[key] !== 'All' ? [filters[key]] : []}
            onChange={(e) => onChange({ ...filters, [key]: e.target.value || 'All' })}
          >
            {opts.map((opt) => (
              <SelectItem key={opt}>{opt}</SelectItem>
            ))}
          </Select>
        );
      })}
      {(isActive || typeof resultCount === 'number') && (
        <div className="flex items-center gap-3">
          {isActive && (
            <Button variant="flat" color="secondary" onPress={clear} startContent={<X size={16} />}>
              Clear
            </Button>
          )}
          {typeof resultCount === 'number' && (
            <span className="text-small text-default-500">{resultCount} results</span>
          )}
        </div>
      )}
    </div>
  );
}
