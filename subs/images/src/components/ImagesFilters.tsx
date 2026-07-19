/**
 * ImagesFilters — thin configuration of the shared @spookydecs/ui `FilterBar`
 * (#429). Not a bar of its own: it renders through the shared component's
 * collapsible variant, passing images' option lists and a `custom` numeric Year
 * input. Two pages (images-list, photo-browser) render an identical bar, so the
 * wiring lives here rather than being duplicated at both call sites.
 */
import { Input } from '@heroui/react';
import { FilterBar } from '@spookydecs/ui';
import {
  IMAGES_CONFIG,
  IMAGE_FILTER_SELECT_KEYS,
  IMAGE_FILTER_LABELS,
  type ImageUiFilters,
} from '../config/imagesConfig';

interface Props {
  filters: ImageUiFilters;
  onChange: (next: ImageUiFilters) => void;
}

export function ImagesFilters({ filters, onChange }: Props) {
  const yearInput = (
    <Input
      size="sm"
      variant="bordered"
      label="Year"
      type="number"
      placeholder="YYYY"
      min={2020}
      max={2030}
      value={filters.year}
      onValueChange={(v) => onChange({ ...filters, year: v })}
    />
  );

  return (
    <FilterBar
      collapsible
      filters={filters}
      show={IMAGE_FILTER_SELECT_KEYS}
      options={IMAGES_CONFIG.FILTER_OPTIONS}
      labels={IMAGE_FILTER_LABELS}
      custom={{ year: yearInput }}
      onChange={(next) => onChange(next as ImageUiFilters)}
      searchPlaceholder="Search by ID or caption…"
      searchDebounceMs={300}
    />
  );
}
