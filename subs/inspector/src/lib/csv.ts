/**
 * CSV export for violation lists — shared by RulesList and RuleDetail. Same
 * columns/quoting as the vanilla exportRuleViolations / exportCurrentTabViolations.
 */
import type { Violation } from '../config/inspectorConfig';

const HEADERS = [
  'violation_id',
  'entity_id',
  'item_name',
  'dismissible',
  'status',
  'detected_at',
  'resolved_at',
  'message',
];

export function exportViolationsCsv(violations: Violation[], filename: string): void {
  const rows = violations.map((v) =>
    [
      v.violation_id,
      v.entity_id,
      v.violation_details?.item_short_name || '',
      v.dismissible === false ? 'false' : 'true',
      v.status,
      v.detected_at || '',
      v.resolved_at || '',
      v.violation_details?.message || '',
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`),
  );

  const csv = [HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
