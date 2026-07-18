/**
 * Pure formatting + color-mapping helpers ported from the vanilla js/utils.js
 * and the inline maps in js/seasonal-view.js. Sub-specific (not library-worthy):
 * the status/criticality palettes are workbench's own. HeroUI Chip colors
 * replace the vanilla badge-status / badge-criticality CSS classes.
 */

export type { ChipColor } from '@spookydecs/ui';
import type { ChipColor } from '@spookydecs/ui';

/** "in_progress" -> "In Progress". Mirrors seasonal-view.js formatStatus(). */
export function formatStatus(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize a status/criticality string to a color-map key (lowercase, underscored). */
export function statusKey(value?: string): string {
  return (value ?? '').toLowerCase().replace(/[\s-]+/g, '_');
}

/** "2025-10-31" -> "Oct 31, 2025"; empty/invalid -> "N/A". From utils.js. */
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Status -> Chip color map (domain data, consumed via the shared `<StatusChip>`).
 * Covers idea statuses and maintenance statuses (todo/in_progress/completed).
 * Keys are the normalized form from `statusKey()`. Unknown statuses fall back to
 * StatusChip's `default` (was `secondary` under the old helper).
 */
export const WORKBENCH_STATUS_COLORS: Record<string, ChipColor> = {
  completed: 'success',
  complete: 'success',
  done: 'success',
  in_progress: 'primary',
  in_review: 'primary',
  blocked: 'warning',
  on_hold: 'warning',
  todo: 'default',
  not_started: 'default',
  backlog: 'default',
};

/**
 * Criticality -> Chip color map (domain data). Mirrors the vanilla
 * getPriorityColor() intent (high=red, medium=amber, low=green). Keys are
 * lowercased criticality values.
 */
export const WORKBENCH_CRITICALITY_COLORS: Record<string, ChipColor> = {
  high: 'danger',
  critical: 'danger',
  medium: 'warning',
  moderate: 'warning',
  low: 'success',
};
