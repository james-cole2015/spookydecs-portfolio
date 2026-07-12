import { Select, SelectItem, Input, Button } from '@heroui/react';
import { X } from 'lucide-react';
import STORAGE_CONFIG from '../config/storageConfig';

export type Filters = Record<string, string>;

const LABELS: Record<string, string> = {
  season: 'Season',
  location: 'Location',
  class_type: 'Type',
  status: 'Status',
  size: 'Size',
};

export function FilterBar({
  filters,
  show,
  onChange,
}: {
  filters: Filters;
  show: string[];
  onChange: (next: Filters) => void;
}) {
  const isActive = (filters.search ?? '') !== '' || show.some((k) => (filters[k] ?? 'All') !== 'All');

  function clear() {
    const reset: Filters = { search: '' };
    show.forEach((k) => {
      reset[k] = 'All';
    });
    onChange(reset);
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-x-8 gap-y-5 rounded-xl border border-default-200 bg-content1 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Input
        size="sm"
        variant="bordered"
        label="Search"
        placeholder="Search by name, ID, location…"
        value={filters.search ?? ''}
        onValueChange={(v) => onChange({ ...filters, search: v })}
        isClearable
        onClear={() => onChange({ ...filters, search: '' })}
      />
      {show.map((key) => {
        const options = STORAGE_CONFIG.FILTER_OPTIONS[key] ?? ['All'];
        return (
          <Select
            key={key}
            size="sm"
            variant="bordered"
            label={LABELS[key] ?? key}
            selectedKeys={filters[key] && filters[key] !== 'All' ? [filters[key]] : []}
            onChange={(e) => onChange({ ...filters, [key]: e.target.value || 'All' })}
          >
            {options.map((opt) => (
              <SelectItem key={opt}>{opt}</SelectItem>
            ))}
          </Select>
        );
      })}
      {isActive && (
        <div className="flex items-center">
          <Button
            variant="flat"
            color="secondary"
            onPress={clear}
            startContent={<X size={16} />}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
