/**
 * Audit domain types — the shape of records returned by GET /audit/records.
 * Mirrors the backend `strip_record` RECORD_FIELDS set (sd_audit_handler).
 */

export type EntityType = 'inventory' | 'maintenance_record' | 'violation' | 'deployment';

export type Operation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditRecord {
  auditId?: string;
  entityId?: string;
  entityType?: EntityType | string;
  operation?: Operation | string;
  timestamp?: string;
  userId?: string | null;
  changedFields?: string[];
  /** Pre-change snapshot — absent on CREATE. */
  oldValue?: unknown;
  /** Post-change snapshot — absent on DELETE. */
  newValue?: unknown;
}

/** One server page of records plus the opaque cursor for the next page. */
export interface RecordsPage {
  records: AuditRecord[];
  nextToken: string | null;
}
