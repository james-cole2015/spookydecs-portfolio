// Maintenance sub — domain types, display helpers, and schedule logic.
// Ported from the vanilla js/utils/{formatters,helpers,scheduleHelpers}.js. The
// formatters that previously returned HTML pill strings now return { label, color }
// so callers can render a HeroUI <Chip>; the underlying value/label/color maps are
// preserved verbatim. Schedule date math is ported logic-for-logic.

import type { ChipProps } from '@heroui/react';

export type ChipColor = NonNullable<ChipProps['color']>;

// ============================================
// DOMAIN TYPES
// ============================================

export type RecordType = 'repair' | 'maintenance' | 'inspection';
export type RecordStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type Criticality = 'low' | 'medium' | 'high' | 'critical' | null;
export type Season = 'Halloween' | 'Christmas' | 'Shared';
export type Frequency = 'annual' | 'seasonal' | 'quarterly' | 'monthly' | 'pre_season' | 'post_season';
export type ScheduleStatus = 'upcoming' | 'due' | 'overdue' | 'completed_pending_next';

export interface MaintenanceRecord {
  record_id: string;
  item_id: string;
  record_type: RecordType;
  status: RecordStatus;
  title?: string;
  description?: string;
  criticality?: Criticality;
  category?: string;
  total_cost?: number;
  estimated_cost?: number;
  date_scheduled?: string;
  date_performed?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  performed_by?: string;
  materials_used?: Material[];
  cost_record_ids?: string[];
  attachments?: Record<string, Array<{ photo_id: string; photo_type?: string }>>;
  schedule_id?: string;
  schedule_title?: string;
  occurrence_number?: number;
  notes?: string;
  inspection_result?: string;
  [key: string]: unknown;
}

export interface Material {
  item?: string;
  quantity?: string | number;
  unit?: string;
  [key: string]: unknown;
}

export interface Item {
  item_id?: string;
  id?: string;
  name?: string;
  short_name?: string;
  season?: string;
  class_type?: string;
  status?: string;
  enabled?: boolean;
  primary_photo_id?: string;
  [key: string]: unknown;
}

export interface ScheduleTemplate {
  schedule_id: string;
  class_type?: string;
  record_type?: RecordType;
  category?: string;
  short_name?: string;
  title?: string;
  description?: string;
  frequency?: Frequency;
  season?: Season;
  item_id?: string;
  enabled?: boolean;
  is_default?: boolean;
  status?: ScheduleStatus;
  next_due_date?: string;
  estimated_cost?: number;
  estimated_duration_minutes?: number;
  days_before_reminder?: number;
  [key: string]: unknown;
}

export interface Photo {
  photo_id?: string;
  id?: string;
  url?: string;
  thumbnail_url?: string;
  [key: string]: unknown;
}

export interface ItemCosts {
  costs: Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
  count?: number;
}

export interface Option {
  value: string;
  label: string;
}

// ============================================
// DISPLAY MAPS (value → { label, color }) for HeroUI <Chip>
// ============================================

export function getStatusChip(status?: string): { label: string; color: ChipColor } {
  const map: Record<string, { label: string; color: ChipColor }> = {
    scheduled: { label: 'Scheduled', color: 'primary' },
    in_progress: { label: 'In Progress', color: 'warning' },
    completed: { label: 'Completed', color: 'success' },
    cancelled: { label: 'Cancelled', color: 'danger' },
  };
  return map[status ?? ''] ?? { label: status ?? 'Unknown', color: 'default' };
}

export function getCriticalityChip(criticality?: string | null): { label: string; color: ChipColor } {
  if (!criticality || criticality === 'null') return { label: 'None', color: 'default' };
  const map: Record<string, { label: string; color: ChipColor }> = {
    low: { label: 'Low', color: 'success' },
    medium: { label: 'Medium', color: 'warning' },
    high: { label: 'High', color: 'danger' },
    critical: { label: 'Critical', color: 'danger' },
  };
  return map[criticality] ?? { label: criticality, color: 'default' };
}

export function getRecordTypeChip(type?: string): { label: string; color: ChipColor } {
  const map: Record<string, { label: string; color: ChipColor }> = {
    repair: { label: 'Repair', color: 'danger' },
    maintenance: { label: 'Maintenance', color: 'primary' },
    inspection: { label: 'Inspection', color: 'secondary' },
  };
  return map[type ?? ''] ?? { label: type ?? 'Unknown', color: 'default' };
}

export function getScheduleStatusChip(status?: string): { label: string; color: ChipColor } {
  const map: Record<string, { label: string; color: ChipColor }> = {
    upcoming: { label: 'Upcoming', color: 'primary' },
    due: { label: 'Due Soon', color: 'warning' },
    overdue: { label: 'Overdue', color: 'danger' },
    completed_pending_next: { label: 'Completed', color: 'success' },
  };
  return map[status ?? ''] ?? { label: status ?? 'Unknown', color: 'default' };
}

export function formatRecordType(type?: string): string {
  const labels: Record<string, string> = {
    repair: 'Repair',
    maintenance: 'Maintenance',
    inspection: 'Inspection',
  };
  return labels[type ?? ''] ?? (type ?? '');
}

// ============================================
// VALUE FORMATTERS (ported from formatters.js)
// ============================================

export function formatDate(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format a date_scheduled value, which may be a season bucket string
 * ("2026 Halloween") or a legacy ISO date string.
 */
export function formatScheduledDate(value?: string): string {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCurrency(amount?: number | null): string {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return 'N/A';
  }
}

export function formatOccurrence(occurrenceNumber?: number): string {
  if (!occurrenceNumber) return '';
  return `#${occurrenceNumber}`;
}

// ============================================
// SCHEDULE HELPERS (ported from scheduleHelpers.js)
// ============================================

export function getSeasonalDueDate(season: string | null, year: number, isInspection: boolean): Date {
  switch (season) {
    case 'Halloween':
      return isInspection ? new Date(year, 9, 15) : new Date(year, 7, 1);
    case 'Christmas':
      return isInspection ? new Date(year, 11, 15) : new Date(year, 4, 1);
    case 'Shared':
      return new Date(year, 3, 1);
    default:
      return new Date(year, 3, 1);
  }
}

export function adjustToWorkWindow(date: Date): Date {
  const year = date.getFullYear();
  const workStart = new Date(year, 3, 1); // April 1
  const workEnd = new Date(year, 8, 30); // Sept 30
  if (date < workStart) return workStart;
  if (date > workEnd) return new Date(year + 1, 3, 1);
  return date;
}

export function calculateNextDueDate(
  frequency: Frequency | string,
  fromDate: Date | string,
  season: string | null = null,
  taskType: string = 'maintenance',
): Date {
  const date = new Date(fromDate);
  const isInspection =
    taskType === 'inspection' || taskType === 'fabric_check' || taskType === 'electrical_check';

  let nextDate: Date;
  switch (frequency) {
    case 'annual':
      nextDate = new Date(date);
      nextDate.setFullYear(date.getFullYear() + 1);
      break;
    case 'seasonal':
      nextDate = getSeasonalDueDate(season, date.getFullYear(), isInspection);
      if (nextDate < new Date()) nextDate = getSeasonalDueDate(season, date.getFullYear() + 1, isInspection);
      break;
    case 'quarterly':
      nextDate = new Date(date);
      nextDate.setMonth(date.getMonth() + 3);
      break;
    case 'monthly':
      nextDate = new Date(date);
      nextDate.setMonth(date.getMonth() + 1);
      break;
    case 'pre_season':
      nextDate = getSeasonalDueDate(season, date.getFullYear(), false);
      if (nextDate < new Date()) nextDate = getSeasonalDueDate(season, date.getFullYear() + 1, false);
      break;
    case 'post_season':
      nextDate = new Date(date.getFullYear(), 3, 1);
      if (nextDate < new Date()) nextDate = new Date(date.getFullYear() + 1, 3, 1);
      break;
    default:
      nextDate = new Date(date);
      nextDate.setFullYear(date.getFullYear() + 1);
  }

  if (!isInspection && frequency !== 'seasonal') nextDate = adjustToWorkWindow(nextDate);
  return nextDate;
}

export function getDaysUntilDue(dueDate: Date | string): number {
  const due = new Date(dueDate);
  const diffTime = due.getTime() - Date.now();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getStatusFromDueDate(dueDate: Date | string, reminderDays = 7): ScheduleStatus {
  const daysUntil = getDaysUntilDue(dueDate);
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= reminderDays) return 'due';
  return 'upcoming';
}

export function formatFrequency(frequency?: string, season: string | null = null): string {
  const map: Record<string, string> = {
    annual: 'Annual',
    seasonal: season ? `Seasonal (${season})` : 'Seasonal',
    quarterly: 'Quarterly',
    monthly: 'Monthly',
    pre_season: season ? `Pre-Season (${season})` : 'Pre-Season',
    post_season: 'Post-Season',
  };
  return map[frequency ?? ''] ?? (frequency ?? '');
}

export function getCategoryLabel(category?: string): string {
  const map: Record<string, string> = {
    exterior_inspection: 'Exterior Inspection',
    mechanical_check: 'Mechanical Check',
    paint_inspection: 'Paint Inspection',
    cleaning: 'Cleaning',
    repaint: 'Repaint',
    lubrication: 'Lubrication',
    replacement: 'Replacement',
    repair: 'Repair',
    inspection: 'Inspection',
    battery_replacement: 'Battery Replacement',
    fabric_check: 'Fabric Check',
    electrical_check: 'Electrical Check',
    custom: 'Custom',
  };
  return map[category ?? ''] ?? (category ?? '');
}

// Backwards-compatible alias (vanilla getTaskTypeLabel delegated to getCategoryLabel).
export const getTaskTypeLabel = getCategoryLabel;

export function getTaskTypeIcon(taskTypeOrCategory?: string): string {
  const map: Record<string, string> = {
    inspection: '🔍',
    maintenance: '🔧',
    repair: '🔨',
    exterior_inspection: '🔍',
    mechanical_check: '⚙️',
    paint_inspection: '🎨',
    cleaning: '🧹',
    repaint: '🎨',
    lubrication: '🛢️',
    replacement: '🔄',
    battery_replacement: '🔋',
    fabric_check: '🧵',
    electrical_check: '⚡',
    custom: '🔧',
  };
  return map[taskTypeOrCategory ?? ''] ?? '📋';
}

export function formatDueDate(dueDate: Date | string, status?: string): string {
  const date = new Date(dueDate);
  const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const daysUntil = getDaysUntilDue(dueDate);
  if (status === 'overdue') return `${formatted} (${Math.abs(daysUntil)} days overdue)`;
  if (status === 'due') return `${formatted} (${daysUntil} days)`;
  return formatted;
}

/**
 * Ordered season bucket options: historical buckets (from existing records)
 * followed by the standard window of current year through current year + 2.
 */
export function generateSeasonBuckets(existingBuckets: string[] = []): string[] {
  const currentYear = new Date().getFullYear();
  const typeOrder: Record<string, number> = { 'Off-Season': 0, Halloween: 1, Christmas: 2 };
  const standardBuckets: string[] = [];

  for (let year = currentYear; year <= currentYear + 2; year++) {
    standardBuckets.push(`${year} Off-Season`, `${year} Halloween`, `${year} Christmas`);
  }

  const standardSet = new Set(standardBuckets);
  const historical = [...new Set(existingBuckets.filter((b) => b && !standardSet.has(b)))];

  historical.sort((a, b) => {
    const [aYear, ...aTypeParts] = a.split(' ');
    const [bYear, ...bTypeParts] = b.split(' ');
    const aType = aTypeParts.join(' ');
    const bType = bTypeParts.join(' ');
    if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
    return (typeOrder[aType] ?? 99) - (typeOrder[bType] ?? 99);
  });

  return [...historical, ...standardBuckets];
}

export function getDefaultBucket(itemSeason?: string): string {
  const year = new Date().getFullYear();
  if (itemSeason === 'Halloween') return `${year} Halloween`;
  if (itemSeason === 'Christmas') return `${year} Christmas`;
  return `${year} Off-Season`;
}

export interface ScheduleValidation {
  valid: boolean;
  errors: string[];
}

export function validateScheduleData(data: Partial<ScheduleTemplate>): ScheduleValidation {
  const errors: string[] = [];
  if (!data.class_type) errors.push('Class type is required');
  if (!data.record_type) errors.push('Record type is required');
  if (!data.category || data.category === 'Uncategorized') errors.push('Category is required');
  if (!data.short_name) errors.push('Short name is required');
  if (!data.title) errors.push('Title is required');
  if (!data.frequency) errors.push('Frequency is required');
  if (data.frequency === 'seasonal' && !data.season) errors.push('Season is required for seasonal frequency');
  if (data.frequency === 'pre_season' && !data.season) errors.push('Season is required for pre-season frequency');
  if (data.estimated_cost != null && data.estimated_cost < 0) errors.push('Estimated cost cannot be negative');
  if (data.estimated_duration_minutes != null && data.estimated_duration_minutes < 0)
    errors.push('Estimated duration cannot be negative');
  if (data.days_before_reminder != null && data.days_before_reminder < 0)
    errors.push('Days before reminder cannot be negative');
  if (data.short_name && !/^[A-Z0-9_]+$/.test(data.short_name))
    errors.push('Short name must contain only uppercase letters, numbers, and underscores');
  return { valid: errors.length === 0, errors };
}

// ============================================
// OPTION LISTS (ported from scheduleHelpers.js)
// ============================================

export function getRecordTypeOptions(): Option[] {
  return [
    { value: 'inspection', label: 'Inspection' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'repair', label: 'Repair' },
  ];
}

export function getCategoryOptions(recordType?: string): Option[] {
  const map: Record<string, Option[]> = {
    inspection: [
      { value: 'exterior_inspection', label: 'Exterior Inspection' },
      { value: 'mechanical_check', label: 'Mechanical Check' },
      { value: 'paint_inspection', label: 'Paint Inspection' },
    ],
    maintenance: [
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'repaint', label: 'Repaint' },
      { value: 'lubrication', label: 'Lubrication' },
    ],
    repair: [
      { value: 'replacement', label: 'Replacement' },
      { value: 'repair', label: 'Repair' },
    ],
  };
  return map[recordType ?? ''] ?? [];
}

export function getFrequencyOptions(): Option[] {
  return [
    { value: 'annual', label: 'Annual' },
    { value: 'seasonal', label: 'Seasonal' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'pre_season', label: 'Pre-Season' },
    { value: 'post_season', label: 'Post-Season' },
  ];
}

export function getSeasonOptions(): Option[] {
  return [
    { value: 'Halloween', label: 'Halloween' },
    { value: 'Christmas', label: 'Christmas' },
    { value: 'Shared', label: 'Shared' },
  ];
}

export const RECORD_STATUSES: Option[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
