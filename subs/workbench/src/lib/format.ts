/**
 * Pure formatting + color-mapping helpers ported from the vanilla js/utils.js
 * and the inline maps in js/seasonal-view.js. Sub-specific (not library-worthy):
 * the status/criticality palettes are workbench's own. HeroUI Chip colors
 * replace the vanilla badge-status / badge-criticality CSS classes.
 */

export type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

/** "in_progress" -> "In Progress". Mirrors seasonal-view.js formatStatus(). */
export function formatStatus(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "2025-10-31" -> "Oct 31, 2025"; empty/invalid -> "N/A". From utils.js. */
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Status -> Chip color. Covers idea statuses (lowercased, spaces/dashes
 * normalized to underscores) and maintenance statuses (todo/in_progress/
 * completed). Replaces the vanilla getStatusColor() + badge-status-- classes.
 */
export function statusChipColor(status?: string): ChipColor {
  const key = (status ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  switch (key) {
    case 'completed':
    case 'complete':
    case 'done':
      return 'success';
    case 'in_progress':
    case 'in_review':
      return 'primary';
    case 'blocked':
    case 'on_hold':
      return 'warning';
    case 'todo':
    case 'not_started':
    case 'backlog':
      return 'default';
    default:
      return 'secondary';
  }
}

/**
 * Criticality -> Chip color. Mirrors the vanilla getPriorityColor() intent
 * (high=red, medium=amber, low=green). Replaces badge-criticality-- classes.
 */
export function criticalityChipColor(criticality?: string): ChipColor {
  switch ((criticality ?? '').toLowerCase()) {
    case 'high':
    case 'critical':
      return 'danger';
    case 'medium':
    case 'moderate':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
}
