/**
 * Shared filter bar — the single fleet-wide search + select toolbar
 * (design.md §6 finding F3). Generalized from storage's config-driven model:
 * `options` and `labels` are props (the sub passes them from its own config)
 * instead of importing a specific sub's config, which is what lets every sub
 * reuse it.
 *
 * The #429 rollout grew it to absorb the divergences the #506 pilot deferred:
 *   - `{ value, label, icon? }` options (value ≠ label; emoji/icon prefixes)
 *   - `actions` slot — a trailing action cluster (audit's Reset + Export), which
 *     replaces the built-in Clear button when present
 *   - `collapsible` mode — a "Filters" toggle + an always-visible search box, with
 *     the selects hidden until opened (images)
 *   - `custom` — render a bespoke control for a key instead of the auto `<Select>`
 *     (images' numeric year Input), still seated in the canonical grid cell
 *
 * Canonical layout/spacing/control sizes are held constant across every variant so
 * all subs' bars look and feel identical (AC-3); only the data differs.
 *
 * Not folded in: gallery's popover + tag-chip manager — a different interaction
 * model, kept local as a sanctioned design.md §8 exception.
 *
 * Sentinel convention: the FIRST entry in each key's `options` list is its
 * "all/any" reset value. This is backward-compatible with storage (lists lead with
 * `'All'`) and supports the other subs' `''` / `'all'` conventions with no per-sub
 * config on the component.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Select, SelectItem, Input, Button } from '@heroui/react';
import { X, SlidersHorizontal } from 'lucide-react';

export type Filters = Record<string, string>;

/** A select option: a bare string (value === label) or a value/label/icon triple. */
export type FilterOption = string | { value: string; label: string; icon?: ReactNode };

const DEFAULT_LABELS: Record<string, string> = {
  season: 'Season',
  location: 'Location',
  class_type: 'Type',
  status: 'Status',
  size: 'Size',
};

function normalize(opt: FilterOption): { value: string; label: string; icon?: ReactNode } {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

export interface FilterBarProps {
  /** Current filter state, keyed by filter name (plus `search`). */
  filters: Filters;
  /** Which select keys to render, in order. */
  show: string[];
  /** key → option list. The first entry is the key's "all/any" reset sentinel. */
  options: Record<string, FilterOption[]>;
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
  /** Noun for the result count (pluralized with a trailing 's'). Default 'result'. */
  resultNoun?: string;
  /** Trailing action cluster (e.g. Reset + Export). Replaces the built-in Clear when present. */
  actions?: ReactNode;
  /** Collapse the selects behind a "Filters" toggle; search stays always-visible. */
  collapsible?: boolean;
  /** key → bespoke control rendered instead of the auto `<Select>` (e.g. a numeric input). */
  custom?: Record<string, ReactNode>;
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
  resultNoun = 'result',
  actions,
  collapsible = false,
  custom,
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

  // Collapsible selects visibility.
  const [open, setOpen] = useState(false);

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

  // The first option per key is its "all/any" reset sentinel. Keys with no options
  // (a `custom` control, e.g. a numeric input) reset to ''.
  const sentinel = (key: string) => (options[key]?.[0] !== undefined ? normalize(options[key][0]).value : '');

  const isActive =
    (filters.search ?? '') !== '' || show.some((k) => (filters[k] ?? sentinel(k)) !== sentinel(k));

  function clear() {
    const reset: Filters = { search: '' };
    show.forEach((k) => {
      reset[k] = sentinel(k);
    });
    setDraft('');
    onChange(reset);
  }

  const label = (key: string) => labels?.[key] ?? DEFAULT_LABELS[key] ?? key;

  const searchInput = search && (
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
  );

  const selectField = (key: string) => {
    if (custom?.[key]) return <div key={key}>{custom[key]}</div>;
    const opts = (options[key] ?? []).map(normalize);
    const current = filters[key];
    return (
      <Select
        key={key}
        size="sm"
        variant="bordered"
        label={label(key)}
        selectedKeys={current && current !== sentinel(key) ? [current] : []}
        onChange={(e) => onChange({ ...filters, [key]: e.target.value })}
      >
        {opts.map((opt) => (
          <SelectItem key={opt.value} textValue={opt.label}>
            {opt.icon ? (
              <span className="flex items-center gap-1.5">
                {opt.icon}
                {opt.label}
              </span>
            ) : (
              opt.label
            )}
          </SelectItem>
        ))}
      </Select>
    );
  };

  const actionRow = (actions || (isActive && !actions) || typeof resultCount === 'number') && (
    <div className="flex items-center gap-3">
      {actions
        ? actions
        : isActive && (
            <Button variant="flat" color="secondary" onPress={clear} startContent={<X size={16} />}>
              Clear
            </Button>
          )}
      {typeof resultCount === 'number' && (
        <span className="text-small text-default-500">
          {resultCount} {resultNoun}
          {resultCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );

  const gridClasses =
    'grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';

  if (collapsible) {
    return (
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={open ? 'solid' : 'flat'}
            color={open ? 'secondary' : 'default'}
            startContent={<SlidersHorizontal size={16} />}
            onPress={() => setOpen((o) => !o)}
          >
            Filters
          </Button>
          {search && <div className="min-w-[240px] max-w-sm flex-1">{searchInput}</div>}
        </div>
        {open && (
          <div className={`rounded-xl border border-default-200 bg-content1 p-5 ${gridClasses}`}>
            {show.map(selectField)}
            {actionRow}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`mb-6 rounded-xl border border-default-200 bg-content1 p-5 ${gridClasses}`}>
      {searchInput}
      {show.map(selectField)}
      {actionRow}
    </div>
  );
}
