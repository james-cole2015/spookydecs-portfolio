/**
 * Types for the workbench seasonal summary — the single read-only payload the
 * sub renders. Shape mirrors GET /workbench/summary?year= as consumed by the
 * vanilla seasonal-view.js: three season buckets, each with four work sections
 * plus an optional `completed` roll-up. Arrays are optional because the vanilla
 * code defensively defaulted every section to `[]`.
 */

export interface IdeaRecord {
  idea_id: string;
  title: string;
  status: string;
  description?: string;
  link?: string;
  notes?: string;
}

export interface MaintenanceRecord {
  item_id: string;
  /** Human-readable item name (short_name) resolved by the handler; may be '' if unresolved. */
  item_name?: string;
  record_id: string;
  title?: string;
  status: string;
  date_scheduled?: string;
  criticality?: string;
  description?: string;
}

/** Completed roll-up for a season — same four sections, no further nesting. */
export interface CompletedBucket {
  ideas?: IdeaRecord[];
  inspections?: MaintenanceRecord[];
  repairs?: MaintenanceRecord[];
  maintenance_tasks?: MaintenanceRecord[];
}

export interface SeasonBucket {
  ideas?: IdeaRecord[];
  inspections?: MaintenanceRecord[];
  repairs?: MaintenanceRecord[];
  maintenance_tasks?: MaintenanceRecord[];
  completed?: CompletedBucket;
}

export type SeasonKey = 'off_season' | 'halloween' | 'christmas';

export type SeasonalSummary = Record<SeasonKey, SeasonBucket>;
