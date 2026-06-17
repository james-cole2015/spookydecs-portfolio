/**
 * FilterPanel — typed HeroUI port of js/components/FilterPanel.js (#336).
 * Collapsible filter grid (season, type, year, visibility, references) plus an
 * always-visible debounced search box (300 ms). Filter state lives in the URL via
 * the page's useSearchParams; this component is controlled by `filters`/`onChange`.
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Select, SelectItem } from '@heroui/react';
import { Search } from 'lucide-react';
import { IMAGES_CONFIG } from '../config/imagesConfig';

export interface ImageUiFilters {
  season: string;
  photo_type: string;
  year: string;
  isPublic: string;
  hasReferences: string;
  search: string;
}

export const EMPTY_FILTERS: ImageUiFilters = {
  season: '',
  photo_type: '',
  year: '',
  isPublic: '',
  hasReferences: '',
  search: '',
};

/** Read the UI filter set from URL search params (mirrors state.js getStateFromUrl). */
export function readFilters(params: URLSearchParams): ImageUiFilters {
  return {
    season: params.get('season') || '',
    photo_type: params.get('photo_type') || '',
    year: params.get('year') || '',
    isPublic: params.get('isPublic') || '',
    hasReferences: params.get('hasReferences') || '',
    search: params.get('search') || '',
  };
}

/** Serialize a filter set to URL search params, dropping empty values. */
export function writeFilters(filters: ImageUiFilters): URLSearchParams {
  const params = new URLSearchParams();
  (Object.keys(filters) as (keyof ImageUiFilters)[]).forEach((key) => {
    const v = filters[key];
    if (v) params.set(key, v);
  });
  return params;
}

interface Props {
  filters: ImageUiFilters;
  onChange: (next: ImageUiFilters) => void;
}

export function FilterPanel({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(filters.search);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the local search box in sync when the URL changes underneath us.
  useEffect(() => {
    setSearch(filters.search);
  }, [filters.search]);

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      onChange({ ...filters, search: value });
    }, 300);
  }

  function set<K extends keyof ImageUiFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    setSearch('');
    onChange({ ...EMPTY_FILTERS });
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={open ? 'solid' : 'flat'}
          color={open ? 'secondary' : 'default'}
          startContent={<Search size={16} />}
          onPress={() => setOpen((o) => !o)}
        >
          Filters
        </Button>
        <Input
          className="max-w-sm"
          placeholder="Search by ID or caption…"
          value={search}
          onValueChange={onSearchChange}
          isClearable
          onClear={() => onSearchChange('')}
        />
      </div>

      {open && (
        <div className="rounded-medium border border-default-200 bg-content1 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="Season"
              size="sm"
              selectedKeys={[filters.season]}
              onChange={(e) => set('season', e.target.value)}
            >
              {IMAGES_CONFIG.FILTER_OPTIONS.season.map((opt) => (
                <SelectItem key={opt.value}>{opt.label}</SelectItem>
              ))}
            </Select>

            <Select
              label="Type"
              size="sm"
              selectedKeys={[filters.photo_type]}
              onChange={(e) => set('photo_type', e.target.value)}
            >
              {IMAGES_CONFIG.FILTER_OPTIONS.photo_type.map((opt) => (
                <SelectItem key={opt.value}>{opt.label}</SelectItem>
              ))}
            </Select>

            <Input
              label="Year"
              size="sm"
              type="number"
              placeholder="YYYY"
              min={2020}
              max={2030}
              value={filters.year}
              onValueChange={(v) => set('year', v)}
            />

            <Select
              label="Visibility"
              size="sm"
              selectedKeys={[filters.isPublic]}
              onChange={(e) => set('isPublic', e.target.value)}
            >
              {IMAGES_CONFIG.FILTER_OPTIONS.isPublic.map((opt) => (
                <SelectItem key={opt.value}>{opt.label}</SelectItem>
              ))}
            </Select>

            <Select
              label="References"
              size="sm"
              selectedKeys={[filters.hasReferences]}
              onChange={(e) => set('hasReferences', e.target.value)}
            >
              {IMAGES_CONFIG.FILTER_OPTIONS.hasReferences.map((opt) => (
                <SelectItem key={opt.value}>{opt.label}</SelectItem>
              ))}
            </Select>
          </div>

          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="flat" onPress={clearAll}>
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
