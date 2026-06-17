// FilterBar — status + search + sort controls for the season list view.
import { useEffect, useRef, useState } from 'react';
import { Input, Select, SelectItem } from '@heroui/react';
import { Search } from 'lucide-react';
import { STATUSES, SORT_OPTIONS } from '../config/ideasConfig';

export interface FilterState {
  status: string;
  sort: string;
  search: string;
}

export function FilterBar({
  state,
  onChange,
  resultCount,
}: {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  resultCount: number;
}) {
  // Local search mirror so typing stays responsive; commit on a 300ms debounce.
  const [search, setSearch] = useState(state.search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setSearch(state.search), [state.search]);

  function handleSearch(value: string) {
    setSearch(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange({ search: value }), 300);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Status"
        size="sm"
        labelPlacement="outside"
        selectedKeys={[state.status]}
        onChange={(e) => onChange({ status: e.target.value || 'all' })}
        className="w-44"
        disallowEmptySelection
      >
        {[{ key: 'all', label: 'All Statuses' }, ...STATUSES.map((s) => ({ key: s, label: s }))].map(
          (o) => (
            <SelectItem key={o.key}>{o.label}</SelectItem>
          ),
        )}
      </Select>

      <Input
        label="Search"
        size="sm"
        labelPlacement="outside"
        placeholder="Search title, tags…"
        value={search}
        onValueChange={handleSearch}
        startContent={<Search size={16} className="text-default-400" />}
        isClearable
        onClear={() => handleSearch('')}
        className="min-w-[200px] flex-1"
      />

      <Select
        label="Sort"
        size="sm"
        labelPlacement="outside"
        selectedKeys={[state.sort]}
        onChange={(e) => onChange({ sort: e.target.value || 'newest' })}
        className="w-44"
        disallowEmptySelection
      >
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.value}>{o.label}</SelectItem>
        ))}
      </Select>

      <span className="pb-2 text-small text-default-500">
        {resultCount} idea{resultCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
