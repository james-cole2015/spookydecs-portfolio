/**
 * Audit sub-specific helpers — ported from the vanilla js/utils/audit-config.js.
 *
 * Pure formatting / export utilities (not cross-cutting, so they live here and
 * not in @spookydecs/ui). The badge config no longer emits HTML <span> strings:
 * it maps entity-type / operation to a label + HeroUI Chip color, and the React
 * components render <Chip> directly.
 */
import type { AuditRecord, EntityType, Operation } from '../types/audit';

/** HeroUI's semantic Chip/badge colors. */
export type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

interface BadgeConfig {
  label: string;
  color: ChipColor;
}

export const ENTITY_TYPES: Record<EntityType, BadgeConfig> = {
  inventory: { label: 'Inventory', color: 'primary' },
  maintenance_record: { label: 'Maintenance', color: 'warning' },
  violation: { label: 'Violation', color: 'danger' },
  deployment: { label: 'Deployment', color: 'secondary' },
};

export const OPERATIONS: Record<Operation, BadgeConfig> = {
  CREATE: { label: 'Create', color: 'success' },
  UPDATE: { label: 'Update', color: 'warning' },
  DELETE: { label: 'Delete', color: 'danger' },
};

export const DEFAULT_PAGE_SIZE = 25;

/** Label + color for an entity type, falling back to the raw value for unknowns. */
export function entityTypeBadge(type?: string): BadgeConfig {
  return (type && ENTITY_TYPES[type as EntityType]) || { label: type ?? '—', color: 'default' };
}

/** Label + color for an operation, falling back to the raw value for unknowns. */
export function operationBadge(op?: string): BadgeConfig {
  return (op && OPERATIONS[op as Operation]) || { label: op ?? '—', color: 'default' };
}

export function formatTimestamp(ts?: string): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return ts;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Render a value as pretty-printed JSON with HTML-escaped contents and the keys
 * in `changedFields` wrapped in a `.diff-key-highlight` span. The returned string
 * is injected via dangerouslySetInnerHTML into the diff <pre> panes — every
 * dynamic value is HTML-escaped first, so injection is safe.
 */
export function highlightJsonDiff(value: unknown, changedFields: string[] = []): string {
  if (value === null || value === undefined) {
    return '<span class="diff-empty-inline">—</span>';
  }

  const raw = JSON.stringify(value, null, 2);
  let escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  changedFields.forEach((field) => {
    const pattern = new RegExp(`"(${escapeRegex(field)})"(\\s*:)`, 'g');
    escaped = escaped.replace(pattern, '<span class="diff-key-highlight">"$1"</span>$2');
  });

  return escaped;
}

export function recordsToCsv(records: AuditRecord[]): string {
  const headers = ['auditId', 'timestamp', 'entityType', 'entityId', 'operation', 'changedFields', 'userId'];
  const rows = records.map((r) =>
    [
      r.auditId || '',
      r.timestamp || '',
      r.entityType || '',
      r.entityId || '',
      r.operation || '',
      (r.changedFields || []).join('|'),
      r.userId || '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
