// Acquisitions configuration, constants, and domain types.
// The /acquisitions feature (W3, #494) rides inside the ideas sub deployment and
// consumes the #492 backend (sd_acquisitions_handler, table sd_acquisitions_records_{stage}).
// Structurally mirrors ideasConfig.ts but for the buy-path lifecycle.

import type { ChipColor, FilterOption } from '@spookydecs/ui';

// Canonical chip casing — do NOT lowercase (design-conformance §5; two-season-casings gotcha).
export const SEASONS = ['Halloween', 'Christmas', 'Shared'] as const;
export type Season = (typeof SEASONS)[number];

export const STATUSES = ['Considering', 'Purchased', 'Passed'] as const;
export type AcquisitionStatus = (typeof STATUSES)[number];

// Statuses a user may set in the CRUD form. `Purchased` is deliberately excluded —
// that transition is owned by the W5 purchase wizard (#496), which also creates the
// linked items record + finance cost and stamps item_id/purchased_at. A manual set
// here would orphan a "Purchased" acquisition, so the UI never offers it.
export const USER_STATUSES: AcquisitionStatus[] = ['Considering', 'Passed'];

// Terminal statuses receive muted card treatment and are hidden from the default list.
export const TERMINAL_STATUSES = new Set<AcquisitionStatus>(['Purchased', 'Passed']);

// Maps an acquisition status to a HeroUI Chip color. Passed as data to the shared
// StatusChip (a color map, not a local *ChipColor helper — stays within conformance F1).
export const ACQ_STATUS_COLOR: Record<string, ChipColor> = {
  Considering: 'primary',
  Purchased: 'success',
  Passed: 'default',
};

export const PRIORITIES = ['Must-have', 'Nice-to-have'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'az', label: 'A – Z' },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

// List-view filters for the shared @spookydecs/ui FilterBar.
// Status default is the `active` sentinel (hides terminal Purchased+Passed); an explicit
// selection reveals a specific status, and `all` shows everything including terminal.
// Season default is `all` (acquisitions has no per-season landing hub in W3).
export const FILTER_SELECT_KEYS = ['season', 'status', 'sort'];

export const FILTER_LABELS: Record<string, string> = {
  season: 'Season',
  status: 'Status',
  sort: 'Sort',
};

export const FILTER_OPTIONS: Record<string, FilterOption[]> = {
  season: [{ value: 'all', label: 'All Seasons' }, ...SEASONS.map((s) => ({ value: s, label: s }))],
  status: [
    { value: 'active', label: 'Active (hides Purchased/Passed)' },
    { value: 'Considering', label: 'Considering' },
    { value: 'Purchased', label: 'Purchased' },
    { value: 'Passed', label: 'Passed' },
    { value: 'all', label: 'All Statuses' },
  ],
  sort: SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
};

// Reuse the ideas sub's season placeholder SVGs (same-sub, keyed lowercase).
export { SEASON_PLACEHOLDERS } from './ideasConfig';

export const ITEMS_BASE_URL = 'https://items.spookydecs.com';

// --- Domain type ----------------------------------------------------------

export interface Acquisition {
  acquisition_id: string;
  title: string;
  season: string;
  status: AcquisitionStatus;
  description?: string;
  price?: number | null;
  retailer?: string;
  url?: string;
  quantity?: number;
  priority?: string;
  image?: string;
  notes?: string;
  tags?: string[];
  // Read-only seams managed by later workstreams (W5 wizard / W6-7 agent). Not
  // editable in the W3 CRUD form.
  item_id?: string;
  purchased_at?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  [key: string]: unknown;
}
