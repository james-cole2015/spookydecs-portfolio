/**
 * Shared shape constants for the seasonal monitor — the buckets, the work
 * sections within each bucket, the available-year window, and the default-season
 * heuristic. Ported from js/seasonal-view.js.
 */
import type { SeasonalSummary, SeasonBucket, SeasonKey } from '../types/workbench';
import type { ChipColor } from '../lib/format';

export const CURRENT_YEAR = new Date().getFullYear();

export interface SectionDef {
  key: 'ideas' | 'inspections' | 'repairs' | 'maintenance_tasks';
  label: string;
}

export const SECTIONS: SectionDef[] = [
  { key: 'ideas', label: 'Ideas' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'repairs', label: 'Repairs' },
  { key: 'maintenance_tasks', label: 'Maintenance Tasks' },
];

export interface BucketDef {
  key: SeasonKey;
  label: string;
  /** Short label for the mobile season tabs (drops the leading year). */
  shortLabel: string;
  color: ChipColor;
}

/** The three season columns, in display order. */
export function getBuckets(year: number): BucketDef[] {
  return [
    { key: 'off_season', label: `${year} Off-Season`, shortLabel: 'Off-Season', color: 'secondary' },
    { key: 'halloween', label: `${year} Halloween`, shortLabel: 'Halloween', color: 'warning' },
    { key: 'christmas', label: `${year} Christmas`, shortLabel: 'Christmas', color: 'success' },
  ];
}

/** Current year ± 1. */
export function getAvailableYears(): number[] {
  return [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
}

/** Number of active (non-completed) items across a bucket's four sections. */
export function bucketActiveCount(bucket: SeasonBucket): number {
  return SECTIONS.reduce((sum, s) => sum + (bucket[s.key]?.length ?? 0), 0);
}

/**
 * Default season for the mobile tabs: the first bucket with active work, else a
 * month-based guess (Oct/Nov → halloween, Dec/Jan → christmas, else off_season).
 */
export function getDefaultSeason(summary: SeasonalSummary, buckets: BucketDef[]): SeasonKey {
  const active = buckets.find((b) => bucketActiveCount(summary[b.key] ?? {}) > 0);
  if (active) return active.key;
  const month = new Date().getMonth();
  if (month === 9 || month === 10) return 'halloween';
  if (month === 11 || month === 0) return 'christmas';
  return 'off_season';
}
