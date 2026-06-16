// FilterBar — useSearchParams-driven filter controls (#332)
// Receptacles excluded from class list (per ALLOWED_CLASSES); connection_building preserved.
import { useState } from 'react';
import { Select, SelectItem, Input, Button } from '@heroui/react';
import { CLASS_HIERARCHY, SEASONS, ITEM_STATUS } from '../config/itemsConfig';

export interface Filters {
  search: string;
  season: string;
  class: string;
  class_type: string;
  status: string;
  maintenance: string;
}

export const FILTER_KEYS = ['search', 'season', 'class', 'class_type', 'status', 'maintenance'] as const;

export function readFilters(params: URLSearchParams): Filters {
  return {
    search:      params.get('search')      ?? '',
    season:      params.get('season')      ?? '',
    class:       params.get('class')       ?? '',
    class_type:  params.get('class_type')  ?? '',
    status:      params.get('status')      ?? '',
    maintenance: params.get('maintenance') ?? '',
  };
}

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
}

export function FilterBar({ filters, onChange }: Props) {
  const [search, setSearch] = useState(filters.search);
  const classTypes = filters.class ? CLASS_HIERARCHY[filters.class]?.types ?? [] : [];

  function update(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    if ('class' in patch) next.class_type = '';
    onChange(next);
  }

  function clearAll() {
    setSearch('');
    onChange({ search: '', season: '', class: '', class_type: '', status: '', maintenance: '' });
  }

  return (
    <div className="flex flex-wrap gap-3 mb-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search by name or ID..."
          value={search}
          onValueChange={(v) => {
            setSearch(v);
            clearTimeout((FilterBar as any)._debounce);
            (FilterBar as any)._debounce = setTimeout(() => update({ search: v.trim() }), 300);
          }}
          size="sm"
        />
      </div>
      <Select
        placeholder="Status"
        selectedKeys={filters.status ? [filters.status] : []}
        onSelectionChange={(keys) => update({ status: [...keys][0] as string ?? '' })}
        size="sm"
        className="w-36"
      >
        {ITEM_STATUS.map((s) => <SelectItem key={s.value}>{s.label}</SelectItem>)}
      </Select>
      <Select
        placeholder="Season"
        selectedKeys={filters.season ? [filters.season] : []}
        onSelectionChange={(keys) => update({ season: [...keys][0] as string ?? '' })}
        size="sm"
        className="w-36"
      >
        {SEASONS.map((s) => <SelectItem key={s.value}>{s.icon} {s.label}</SelectItem>)}
      </Select>
      <Select
        placeholder="Class"
        selectedKeys={filters.class ? [filters.class] : []}
        onSelectionChange={(keys) => update({ class: [...keys][0] as string ?? '' })}
        size="sm"
        className="w-36"
      >
        {Object.keys(CLASS_HIERARCHY).map((cls) => (
          <SelectItem key={cls}>{CLASS_HIERARCHY[cls].icon} {cls}</SelectItem>
        ))}
      </Select>
      {classTypes.length > 0 && (
        <Select
          placeholder="Type"
          selectedKeys={filters.class_type ? [filters.class_type] : []}
          onSelectionChange={(keys) => update({ class_type: [...keys][0] as string ?? '' })}
          size="sm"
          className="w-36"
        >
          {classTypes.map((t) => <SelectItem key={t}>{t}</SelectItem>)}
        </Select>
      )}
      <Select
        placeholder="Maintenance"
        selectedKeys={filters.maintenance ? [filters.maintenance] : []}
        onSelectionChange={(keys) => update({ maintenance: [...keys][0] as string ?? '' })}
        size="sm"
        className="w-40"
      >
        <SelectItem key="needs_repair">Needs Repair</SelectItem>
        <SelectItem key="non_operational">Non-Operational</SelectItem>
      </Select>
      <Button size="sm" variant="flat" onPress={clearAll}>
        Clear Filters
      </Button>
    </div>
  );
}
