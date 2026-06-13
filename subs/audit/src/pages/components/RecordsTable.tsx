import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
} from '@heroui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditRecord } from '../../types/audit';
import { entityTypeBadge, operationBadge, formatTimestamp } from '../../lib/format';

const COLUMNS = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'entityType', label: 'Entity Type' },
  { key: 'operation', label: 'Operation' },
  { key: 'entityId', label: 'Entity ID' },
  { key: 'changedFields', label: 'Changed Fields' },
  { key: 'user', label: 'User' },
];

function ChangedFieldChips({ fields }: { fields: string[] }) {
  if (!fields.length) return <span className="text-default-400">—</span>;
  const shown = fields.slice(0, 5);
  const overflow = fields.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((f) => (
        <Chip key={f} size="sm" variant="flat" className="font-mono text-xs">
          {f}
        </Chip>
      ))}
      {overflow > 0 && (
        <Chip size="sm" variant="flat" color="default" className="text-xs">
          +{overflow}
        </Chip>
      )}
    </div>
  );
}

function renderCell(record: AuditRecord, columnKey: string) {
  switch (columnKey) {
    case 'timestamp':
      return <span className="whitespace-nowrap text-default-600">{formatTimestamp(record.timestamp)}</span>;
    case 'entityType': {
      const badge = entityTypeBadge(record.entityType);
      return (
        <Chip size="sm" variant="flat" color={badge.color}>
          {badge.label}
        </Chip>
      );
    }
    case 'operation': {
      const badge = operationBadge(record.operation);
      return (
        <Chip size="sm" variant="flat" color={badge.color}>
          {badge.label}
        </Chip>
      );
    }
    case 'entityId':
      return (
        <span className="block max-w-[14rem] truncate font-mono text-xs text-default-500" title={record.entityId || ''}>
          {record.entityId || '—'}
        </span>
      );
    case 'changedFields':
      return <ChangedFieldChips fields={record.changedFields || []} />;
    case 'user':
      return <span className="text-default-600">{record.userId || '—'}</span>;
    default:
      return null;
  }
}

export function RecordsTable({
  records,
  allTypes,
  page,
  hasNext,
  hasPrev,
  onRowClick,
  onNext,
  onPrev,
}: {
  records: AuditRecord[];
  allTypes: boolean;
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
  onRowClick: (record: AuditRecord) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="rounded-xl border border-default-200 bg-content1">
      <Table
        aria-label="Audit records"
        removeWrapper
        selectionMode="none"
        onRowAction={(key) => onRowClick(records[Number(key)])}
        classNames={{ tr: 'cursor-pointer' }}
      >
        <TableHeader columns={COLUMNS}>
          {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
        </TableHeader>
        <TableBody>
          {records.map((record, i) => (
            <TableRow key={i}>
              {COLUMNS.map((col) => (
                <TableCell key={col.key}>{renderCell(record, col.key)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default-200 px-4 py-3">
        <span className="text-sm text-default-500">
          {allTypes ? `Showing most recent ${records.length} records across all types` : `Page ${page}`}
        </span>
        {!allTypes && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              isDisabled={!hasPrev}
              onPress={onPrev}
              startContent={<ChevronLeft size={16} />}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="flat"
              isDisabled={!hasNext}
              onPress={onNext}
              endContent={<ChevronRight size={16} />}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
