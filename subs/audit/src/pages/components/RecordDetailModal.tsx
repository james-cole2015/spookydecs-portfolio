import { useRef } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Button,
} from '@heroui/react';
import type { AuditRecord } from '../../types/audit';
import {
  entityTypeBadge,
  operationBadge,
  formatTimestamp,
  highlightJsonDiff,
  recordsToCsv,
  downloadFile,
} from '../../lib/format';

/**
 * Before/After JSON diff. The two <pre> panes are the one bespoke block — no
 * HeroUI primitive covers a scroll-synced diff with changed-field key highlight —
 * so they are hand-built: refs + a `syncing` guard mirror scroll between panes,
 * and highlightJsonDiff() emits HTML-escaped JSON with changed keys wrapped in a
 * .diff-key-highlight span (injected via dangerouslySetInnerHTML).
 */
function JsonDiff({
  oldValue,
  newValue,
  changedFields,
  isCreate,
  isDelete,
}: {
  oldValue: unknown;
  newValue: unknown;
  changedFields: string[];
  isCreate: boolean;
  isDelete: boolean;
}) {
  const beforeRef = useRef<HTMLPreElement>(null);
  const afterRef = useRef<HTMLPreElement>(null);
  const syncing = useRef(false);

  function sync(from: HTMLPreElement | null, to: HTMLPreElement | null) {
    if (!from || !to || syncing.current) return;
    syncing.current = true;
    to.scrollTop = from.scrollTop;
    to.scrollLeft = from.scrollLeft;
    syncing.current = false;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="flex flex-col overflow-hidden rounded-lg border border-default-200">
        <div className="border-b border-default-200 bg-content2 px-3 py-2 text-xs font-bold uppercase tracking-wide text-danger">
          Before
        </div>
        {isCreate ? (
          <div className="diff-empty">No previous value — this is a CREATE.</div>
        ) : (
          <pre
            ref={beforeRef}
            className="audit-diff-pane"
            onScroll={() => sync(beforeRef.current, afterRef.current)}
            dangerouslySetInnerHTML={{ __html: highlightJsonDiff(oldValue, changedFields) }}
          />
        )}
      </div>
      <div className="flex flex-col overflow-hidden rounded-lg border border-default-200">
        <div className="border-b border-default-200 bg-content2 px-3 py-2 text-xs font-bold uppercase tracking-wide text-success">
          After
        </div>
        {isDelete ? (
          <div className="diff-empty">No new value — this is a DELETE.</div>
        ) : (
          <pre
            ref={afterRef}
            className="audit-diff-pane"
            onScroll={() => sync(afterRef.current, beforeRef.current)}
            dangerouslySetInnerHTML={{ __html: highlightJsonDiff(newValue, changedFields) }}
          />
        )}
      </div>
    </div>
  );
}

export function RecordDetailModal({
  record,
  onClose,
  onExported,
}: {
  record: AuditRecord | null;
  onClose: () => void;
  onExported: (message: string) => void;
}) {
  const isOpen = record !== null;
  const changedFields = record?.changedFields || [];
  const isCreate = record?.operation === 'CREATE';
  const isDelete = record?.operation === 'DELETE';

  function exportJson() {
    if (!record) return;
    const filename = `audit-record-${record.auditId || record.entityId || 'export'}.json`;
    downloadFile(JSON.stringify(record, null, 2), filename, 'application/json');
    onExported('JSON downloaded.');
  }

  function exportCsv() {
    if (!record) return;
    const filename = `audit-record-${record.auditId || record.entityId || 'export'}.csv`;
    downloadFile(recordsToCsv([record]), filename, 'text/csv');
    onExported('CSV downloaded.');
  }

  const entityBadge = entityTypeBadge(record?.entityType);
  const opBadge = operationBadge(record?.operation);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {record && (
              <>
                <Chip size="sm" variant="flat" color={entityBadge.color}>
                  {entityBadge.label}
                </Chip>
                <Chip size="sm" variant="flat" color={opBadge.color}>
                  {opBadge.label}
                </Chip>
                <span className="font-mono text-sm text-default-500">{record.entityId}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-normal text-default-500">
            <span>
              <span className="font-medium text-default-600">Time:</span> {formatTimestamp(record?.timestamp)}
            </span>
            {record?.userId && (
              <span>
                <span className="font-medium text-default-600">User:</span> {record.userId}
              </span>
            )}
            {record?.auditId && (
              <span className="font-mono">
                <span className="font-sans font-medium text-default-600">Audit ID:</span> {record.auditId}
              </span>
            )}
          </div>
        </ModalHeader>
        <ModalBody>
          {changedFields.length > 0 && (
            <div className="rounded-lg border border-default-200 bg-content2 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-default-500">Changed Fields</div>
              <div className="flex flex-wrap gap-1">
                {changedFields.map((f) => (
                  <Chip key={f} size="sm" variant="flat" color="warning" className="font-mono text-xs">
                    {f}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-default-500">Value Diff</div>
            {record && (
              <JsonDiff
                oldValue={record.oldValue}
                newValue={record.newValue}
                changedFields={changedFields}
                isCreate={isCreate}
                isDelete={isDelete}
              />
            )}
          </div>
        </ModalBody>
        <ModalFooter className="justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-default-500">Export record:</span>
            <Button size="sm" variant="flat" onPress={exportJson}>
              JSON
            </Button>
            <Button size="sm" variant="flat" onPress={exportCsv}>
              CSV
            </Button>
          </div>
          <Button size="sm" variant="light" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
