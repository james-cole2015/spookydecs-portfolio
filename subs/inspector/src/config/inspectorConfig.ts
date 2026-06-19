/**
 * Inspector configuration — constants, formatters, domain types, and the
 * violation-reason extractor. Framework-agnostic port of the vanilla
 * `js/utils/inspector-config.js` + the data half of `js/utils/violation-helper.js`
 * (the HTML `render*` functions become React in ViolationDetail). Logic verbatim.
 */

// ==================== Domain types ====================

export type ViolationStatus = 'open' | 'resolved' | 'dismissed';

export interface ViolationDetails {
  message?: string;
  item_short_name?: string;
  item_class?: string;
  notes?: string;
  dismissal_notes?: string;
  missing_fields?: string[];
  // duplicate-detection
  matching_field?: string;
  similarity_score?: number;
  item1_id?: string;
  item1_short_name?: string;
  item1_class?: string;
  item2_id?: string;
  item2_short_name?: string;
  item2_class?: string;
  // photo-reference
  violation_type?: string;
  reference_field?: string;
  reference_value?: string;
  expected_prefix?: string;
  url_field?: string;
  url?: string;
  status_code?: number | string;
  error_message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface Violation {
  violation_id: string;
  rule_id: string;
  entity_id: string;
  entity_type: string;
  status: ViolationStatus;
  dismissible?: boolean;
  detected_at?: string;
  last_evaluated_at?: string;
  resolved_at?: string;
  dismissed_at?: string;
  dismissed_by?: string;
  updated_at?: string;
  updated_by?: string;
  violation_details?: ViolationDetails;
  // IG annotations (Violation.Annotated)
  agent_notes?: string;
  resolution_path?: string;
  requires_confirmation?: boolean;
  awaiting_confirmation?: string;
  [key: string]: unknown;
}

export interface Rule {
  rule_id: string;
  rule_name: string;
  rule_category: string;
  description?: string;
  check_type?: string;
  dismissible?: boolean;
  is_active?: boolean;
  last_executed_at?: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
  [key: string]: unknown;
}

export interface ItemViolationGroup {
  entity_id: string;
  entity_type: string;
  short_name: string;
  violations: Violation[];
}

export interface ViolationStats {
  total: number;
  open: number;
  resolved: number;
  dismissed: number;
}

// ==================== Constants ====================

interface ResolutionModeConfig {
  label: string;
  badge: string;
}
interface StatusConfig {
  label: string;
  color: string;
  badge: string;
}
interface RuleCategoryConfig {
  label: string;
  endpoint: string;
}

export const InspectorConfig = {
  // Resolution mode labels for the stats bar (open violations only)
  RESOLUTION_MODE: {
    unanalyzed: { label: 'Unanalyzed', badge: 'resolution-unanalyzed' },
    auto_resolved: { label: 'Auto-resolved', badge: 'resolution-auto' },
    manual_resolved: { label: 'Manual', badge: 'resolution-manual' },
    dismissed: { label: 'Dismissed', badge: 'resolution-dismissed' },
  } as Record<string, ResolutionModeConfig>,

  STATUS: {
    open: { label: 'Open', color: '#DC2626', badge: 'status-open' },
    resolved: { label: 'Resolved', color: '#10B981', badge: 'status-resolved' },
    dismissed: { label: 'Dismissed', color: '#6B7280', badge: 'status-dismissed' },
  } as Record<string, StatusConfig>,

  RULE_CATEGORIES: {
    field_validation: {
      label: 'Field Validation',
      endpoint: '/admin/inspector/rules/field-validation',
    },
    relationship_eval: {
      label: 'Relationship Evaluation',
      endpoint: '/admin/inspector/rules/relationship-eval',
    },
    duplicate_detection: {
      label: 'Duplicate Detection',
      endpoint: '/admin/inspector/rules/duplicate-detection',
    },
    required_related_entity: {
      label: 'Required Related Entity',
      endpoint: '/admin/inspector/rules/entity_relationship_eval',
    },
  } as Record<string, RuleCategoryConfig>,

  DEFAULT_PAGE_SIZE: 25,

  TABS: {
    BY_RULE: 'by-rule',
    BY_ITEM: 'by-item',
    ORPHANED: 'orphaned',
  },
};

// ==================== Formatters ====================

/** Format date string to human-readable format. */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/** Format date to relative time (e.g., "2 hours ago"). */
export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

/** Format date to date and time only (no relative time). */
export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return 'Never';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'N/A';
  }
}

export interface DismissibleConfig {
  label: string;
  badge: string;
  icon: string;
}

/** Get dismissible badge config for a violation or rule. */
export function getDismissibleConfig(dismissible?: boolean): DismissibleConfig {
  return dismissible === false
    ? { label: 'Non-dismissible', badge: 'badge-non-dismissible', icon: '⛔' }
    : { label: 'Dismissible', badge: 'badge-dismissible', icon: '✅' };
}

/** Get status configuration. */
export function getStatusConfig(status?: string): StatusConfig {
  return InspectorConfig.STATUS[status ?? ''] || InspectorConfig.STATUS.open;
}

/** Get rule category configuration. */
export function getRuleCategoryConfig(category?: string): RuleCategoryConfig | null {
  return InspectorConfig.RULE_CATEGORIES[category ?? ''] || null;
}

/** Truncate text to specified length. */
export function truncateText(text?: string, maxLength = 100): string {
  if (!text || text.length <= maxLength) return text ?? '';
  return text.substring(0, maxLength) + '...';
}

// ==================== Grouping + stats ====================

/** Group violations by rule. */
export function groupViolationsByRule(violations: Violation[]): Record<string, Violation[]> {
  const groups: Record<string, Violation[]> = {};
  violations.forEach((violation) => {
    const ruleId = violation.rule_id;
    if (!groups[ruleId]) groups[ruleId] = [];
    groups[ruleId].push(violation);
  });
  return groups;
}

/** Group violations by item. */
export function groupViolationsByItem(violations: Violation[]): ItemViolationGroup[] {
  const groups: Record<string, ItemViolationGroup> = {};
  violations.forEach((violation) => {
    const entityId = violation.entity_id;
    if (!groups[entityId]) {
      groups[entityId] = {
        entity_id: entityId,
        entity_type: violation.entity_type,
        short_name: violation.violation_details?.item_short_name || entityId,
        violations: [],
      };
    }
    groups[entityId].violations.push(violation);
  });
  return Object.values(groups);
}

/** Calculate status statistics from a local list of violations. */
export function calculateStats(violations: Violation[]): ViolationStats {
  const stats: ViolationStats = { total: violations.length, open: 0, resolved: 0, dismissed: 0 };
  violations.forEach((violation) => {
    const status = violation.status || 'open';
    if (stats[status] !== undefined) stats[status]++;
  });
  return stats;
}

// ==================== Violation reason extractor ====================
// Data-extraction half of violation-helper.js; the rendering moves to React.

export interface MissingFieldItem {
  fullPath: string;
  fieldName: string;
  parent: string | null;
}

export type ViolationReason =
  | { type: 'unknown'; display: string }
  | { type: 'generic'; display: string }
  | { type: 'list'; title?: string; items: MissingFieldItem[]; count: number; display: string }
  | { type: 'field'; field: string; display: string }
  | {
      type: 'photo_reference';
      subtype: string;
      field: string;
      value?: string;
      expectedPrefix?: string;
      urlField?: string;
      url?: string;
      statusCode?: number | string;
      errorMessage?: string;
      error?: string;
      display: string;
      details: string;
    }
  | {
      type: 'duplicate';
      matchingField: string;
      similarityScore: number;
      item1: { id: string; name: string };
      item2: { id: string; name: string };
      display: string;
    };

export function getViolationReason(violation: Violation): ViolationReason {
  const { rule_id, violation_details } = violation;

  if (!violation_details) {
    return { type: 'unknown', display: 'No violation details available' };
  }

  if (violation_details.missing_fields && Array.isArray(violation_details.missing_fields)) {
    return handleMissingFields(violation_details);
  }

  if (rule_id === 'MISSING_PRIMARY_PHOTO') {
    return handleMissingPrimaryPhoto(violation_details);
  }

  if (rule_id === 'DUPLICATE_LIGHTS' || rule_id === 'DUPLICATE_ITEMS') {
    return handleDuplicateLights(violation_details);
  }

  return { type: 'generic', display: violation_details.message || 'Violation detected' };
}

function handleMissingFields(details: ViolationDetails): ViolationReason {
  const missingFields = details.missing_fields || [];

  if (missingFields.length === 0) {
    return { type: 'list', items: [], count: 0, display: 'All required fields are present (unexpected violation state)' };
  }

  const fieldNames: MissingFieldItem[] = missingFields.map((field) => {
    const parts = field.split('.');
    if (parts.length > 1) {
      return {
        fullPath: field,
        fieldName: parts[parts.length - 1],
        parent: parts.slice(0, -1).join('.'),
      };
    }
    return { fullPath: field, fieldName: field, parent: null };
  });

  return {
    type: 'list',
    title: 'Missing Required Fields',
    items: fieldNames,
    count: fieldNames.length,
    display: `Missing ${fieldNames.length} required field${fieldNames.length > 1 ? 's' : ''}`,
  };
}

function handleMissingPrimaryPhoto(details: ViolationDetails): ViolationReason {
  const violationType = details.violation_type;
  const referenceField = details.reference_field || 'images.primary_photo_id';
  const referenceValue = details.reference_value;

  switch (violationType) {
    case 'missing_reference':
      return {
        type: 'photo_reference',
        subtype: 'missing',
        field: referenceField,
        display: `No primary photo ID set`,
        details: `The ${referenceField} field is empty or not set.`,
      };
    case 'invalid_format':
      return {
        type: 'photo_reference',
        subtype: 'invalid_format',
        field: referenceField,
        value: referenceValue,
        expectedPrefix: details.expected_prefix || 'PHOTO',
        display: `Invalid photo ID format: '${referenceValue}'`,
        details: `Expected ID to start with '${details.expected_prefix || 'PHOTO'}', but found '${referenceValue}'.`,
      };
    case 'reference_not_found':
      return {
        type: 'photo_reference',
        subtype: 'not_found',
        field: referenceField,
        value: referenceValue,
        display: `Photo '${referenceValue}' not found in images table`,
        details: `The referenced photo ID does not exist in the images database.`,
      };
    case 'missing_url':
      return {
        type: 'photo_reference',
        subtype: 'missing_url',
        field: referenceField,
        value: referenceValue,
        urlField: details.url_field || 'cloudfront_url',
        display: `Photo '${referenceValue}' has no CloudFront URL`,
        details: `The photo exists in the images table but is missing a ${details.url_field || 'cloudfront_url'}.`,
      };
    case 'url_not_accessible':
      return {
        type: 'photo_reference',
        subtype: 'url_not_accessible',
        field: referenceField,
        value: referenceValue,
        url: details.url,
        statusCode: details.status_code,
        errorMessage: details.error_message,
        display: `Photo URL is not accessible`,
        details: details.error_message || `HTTP ${details.status_code || 'Error'}`,
      };
    case 'validation_error':
      return {
        type: 'photo_reference',
        subtype: 'error',
        field: referenceField,
        value: referenceValue,
        error: details.error,
        display: `Error validating photo reference`,
        details: details.error || 'An unexpected error occurred during validation.',
      };
    default:
      return { type: 'field', field: referenceField, display: `No value for ${referenceField}` };
  }
}

function handleDuplicateLights(details: ViolationDetails): ViolationReason {
  const matchingField = details.matching_field || 'unknown field';
  const similarityScore = details.similarity_score || 0;

  return {
    type: 'duplicate',
    matchingField,
    similarityScore,
    item1: { id: details.item1_id || '', name: details.item1_short_name || 'Unknown Item' },
    item2: { id: details.item2_id || '', name: details.item2_short_name || 'Unknown Item' },
    display: `${Math.round(similarityScore * 100)}% match between '${details.item1_short_name || 'Unknown Item'}' and '${details.item2_short_name || 'Unknown Item'}'`,
  };
}

export default InspectorConfig;
