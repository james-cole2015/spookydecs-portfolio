// FilterBar — useSearchParams-driven filter controls (#332)
// Local state mirrors props so selections are immediate; syncs from URL on external nav.
// Selects use key+defaultSelectedKeys (remount on change) to avoid HeroUI controlled-state issues.
import { useEffect, useState } from 'react';
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
  const [local, setLocal] = useState<Filters>(filters);

  // Sync when URL changes externally (browser back/forward, landing-page nav)
  useEffect(() => {
    setLocal(filters);
  }, [
    filters.search, filters.season, filters.class,
    filters.class_type, filters.status, filters.maintenance,
  ]);

  function update(patch: Partial<Filters>) {
    const next = { ...local, ...patch };
    if ('class' in patch) next.class_type = '';
    setLocal(next);
    onChange(next);
  }

  function clearAll() {
    const empty: Filters = { search: '', season: '', class: '', class_type: '', status: '', maintenance: '' };
    setLocal(empty);
    onChange(empty);
  }

  const isActive = FILTER_KEYS.some((k) => local[k] !== '');

  function pick(key: keyof Filters) {
    return (keys: any) => {
      const value = (keys instanceof Set ? [...keys][0] : undefined) as string ?? '';
      update({ [key]: value } as Partial<Filters>);
    };
  }

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-default-200 bg-content1 p-4 sm:grid-cols-3 lg:grid-cols-5">
      <Input
        size="sm"
        variant="bordered"
        label="Search"
        placeholder="Search by name or ID..."
        value={local.search}
        onValueChange={(v) => {
          setLocal((prev) => ({ ...prev, search: v }));
          clearTimeout((FilterBar as any)._debounce);
          (FilterBar as any)._debounce = setTimeout(() => update({ search: v.trim() }), 300);
        }}
        isClearable
        onClear={() => update({ search: '' })}
      />
      <Select
        key={`status-${local.status}`}
        size="sm"
        variant="bordered"
        label="Status"
        defaultSelectedKeys={new Set(local.status ? [local.status] : [])}
        onSelectionChange={pick('status')}
      >
        {ITEM_STATUS.map((s) => <SelectItem key={s.value}>{s.label}</SelectItem>)}
      </Select>
      <Select
        key={`season-${local.season}`}
        size="sm"
        variant="bordered"
        label="Season"
        defaultSelectedKeys={new Set(local.season ? [local.season] : [])}
        onSelectionChange={pick('season')}
      >
        {SEASONS.map((s) => <SelectItem key={s.value} textValue={s.label}>{s.icon} {s.label}</SelectItem>)}
      </Select>
      <Select
        key={`class-${local.class}`}
        size="sm"
        variant="bordered"
        label="Class"
        defaultSelectedKeys={new Set(local.class ? [local.class] : [])}
        onSelectionChange={pick('class')}
      >
        {Object.keys(CLASS_HIERARCHY).map((cls) => (
          <SelectItem key={cls} textValue={cls}>{CLASS_HIERARCHY[cls].icon} {cls}</SelectItem>
        ))}
      </Select>
      <Select
        key={`maintenance-${local.maintenance}`}
        size="sm"
        variant="bordered"
        label="Maintenance"
        defaultSelectedKeys={new Set(local.maintenance ? [local.maintenance] : [])}
        onSelectionChange={pick('maintenance')}
      >
        <SelectItem key="needs_repair">Needs Repair</SelectItem>
        <SelectItem key="non_operational">Non-Operational</SelectItem>
      </Select>
      {isActive && (
        <div className="flex items-center">
          <Button size="sm" variant="flat" color="secondary" onPress={clearAll}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
