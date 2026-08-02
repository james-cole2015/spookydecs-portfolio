/**
 * Tracker configuration — typed port of the vanilla js/data/milestones.js plus
 * the enum/colour helpers the pages used inline. Domain types (Epic, Issue,
 * Task, Attachment) model the sd_tracker_handler DDB schema.
 */

export type { ChipColor } from '@spookydecs/ui';

// ── Enums ─────────────────────────────────────────────────────────────────
export const ISSUE_STATES = ['backlog', 'ready', 'open', 'blocked', 'completed'] as const;
export type IssueState = (typeof ISSUE_STATES)[number];

export const PRIORITIES = ['P0', 'P1', 'P2'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const EFFORTS = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type Effort = (typeof EFFORTS)[number];

/** Effort → story points, matching the tracker skill's epic budgeting. */
export const EFFORT_POINTS: Record<Effort, number> = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };

// ── Domain types ────────────────────────────────────────────────────────────
export interface Task {
  task_id: string;
  task_number: string;
  title: string;
  state: string;
  description?: string;
  tags?: string[];
  notes?: string[];
  task_created?: string;
  task_updated?: string;
}

export interface Attachment {
  id: string;
  attachment_type?: 'photo' | 'document';
  filename?: string;
  url?: string;
  thumb_url?: string;
  photo_id?: string;
  s3_key?: string;
  [key: string]: unknown;
}

export interface Issue {
  id: string;
  issue_number: string;
  title: string;
  description?: string;
  state: IssueState | string;
  priority?: Priority | string;
  effort?: Effort | string;
  parent_epic?: string;
  tags?: string[];
  tasks?: Record<string, Task>;
  acceptance_criteria?: string[];
  blocked_by?: string[];
  notes?: string[];
  resolution?: string;
  priority_rank?: number;
  start_date?: string;
  issue_opened?: string;
  issue_updated?: string;
  [key: string]: unknown;
}

export interface Epic {
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  state?: string;
  started_at?: string;
  completed_at?: string;
  [key: string]: unknown;
}

// Chip colours (state/priority/effort) now come from the shared @spookydecs/ui
// source — import { stateChipColor, priorityChipColor, effortChipColor } from '@spookydecs/ui'.

// ── Milestones (port of js/data/milestones.js) ───────────────────────────────
export interface Milestone {
  name: string;
  status: string;
}

/** Canonical slug function (e.g. "Crystal Lake" → "crystal-lake"). */
export function toSlug(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Static milestone data — derived from app_docs/milestone_names.json.
// Known drift risk vs DDB epics; kept verbatim from the vanilla port (#340).
export const MILESTONES: Milestone[] = [
  { name: 'MVP 1', status: 'completed' },
  { name: 'Overlook', status: 'in_progress' },
  { name: 'Crystal Lake', status: 'planned' },
  { name: 'Haddonfield', status: 'planning' },
  { name: 'Nostromo', status: 'not_planned' },
  { name: 'Bates Hotel', status: 'in_progress' },
  { name: 'Elm Street', status: 'not_planned' },
  { name: 'Dakota', status: 'not_planned' },
  { name: 'Erebus', status: 'not_planned' },
  { name: 'Bodega Bay', status: 'not_planned' },
  { name: 'Paxin', status: 'not_planned' },
  { name: 'Castle Rock', status: 'not_planned' },
  { name: 'Woodsboro', status: 'not_planned' },
  { name: 'Nakatomi', status: 'not_planned' },
  { name: 'Winnetka', status: 'not_planned' },
  { name: 'Rockefeller', status: 'not_planned' },
  { name: 'Klaus', status: 'not_planned' },
  { name: 'Whoville', status: 'not_planned' },
  { name: 'Bedford Falls', status: 'not_planned' },
  { name: 'Hohman', status: 'not_planned' },
  { name: 'Cratchit', status: 'not_planned' },
  { name: 'Graceland', status: 'not_planned' },
  { name: "Macy's", status: 'not_planned' },
  { name: 'Christmastown', status: 'not_planned' },
  { name: 'The Express', status: 'not_planned' },
  { name: 'Griswold', status: 'not_planned' },
  { name: 'Zuzu', status: 'not_planned' },
];

export function getAllMilestones(): Milestone[] {
  return MILESTONES;
}

export function getMilestoneBySlug(slug: string): Milestone | null {
  return MILESTONES.find((m) => toSlug(m.name) === slug) || null;
}
