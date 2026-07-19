import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { PageHeader, LoadingState, ErrorState, EmptyState, FilterBar, useToast, type FilterOption } from '@spookydecs/ui';
import { FileSearch, RotateCcw, Download } from 'lucide-react';
import { getRecords, getAllTypes, getAllRecordsForExport, getEnvironment } from '../api/auditApi';
import { recordsToCsv, downloadFile, DEFAULT_PAGE_SIZE, ENTITY_TYPES, OPERATIONS } from '../lib/format';
import type { AuditRecord } from '../types/audit';
import { RecordsTable } from './components/RecordsTable';
import { RecordDetailModal } from './components/RecordDetailModal';
import { ExportFormatPrompt } from './components/ExportFormatPrompt';

// Export-only toolbar (no search) rendered through the shared @spookydecs/ui
// FilterBar (#429): two config-driven selects + a Reset/Export action slot.
const AUDIT_FILTER_OPTIONS: Record<string, FilterOption[]> = {
  entityType: [
    { value: '', label: 'All types' },
    ...Object.entries(ENTITY_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
  ],
  operation: [
    { value: '', label: 'All operations' },
    ...Object.entries(OPERATIONS).map(([k, v]) => ({ value: k, label: v.label })),
  ],
};

const AUDIT_FILTER_LABELS: Record<string, string> = { entityType: 'Type', operation: 'Operation' };

export default function RecordListPage() {
  const toast = useToast();

  // Filters live in the URL (shareable). Pagination cursors do not — they're
  // opaque + ephemeral DDB tokens, so they stay in local state and reset on
  // any filter change.
  const [searchParams, setSearchParams] = useSearchParams();
  const entityType = searchParams.get('entityType') || '';
  const operation = searchParams.get('operation') || '';
  const allTypes = entityType === '';

  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nextToken, setNextToken] = useState<string | null>(null);
  const [prevStack, setPrevStack] = useState<(string | null)[]>([]);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<AuditRecord | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportRecords, setExportRecords] = useState<AuditRecord[] | null>(null);

  const load = useCallback(
    async (token: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const result = allTypes
          ? await getAllTypes({ operation })
          : await getRecords({ entityType, operation, nextToken: token, limit: DEFAULT_PAGE_SIZE });
        setRecords(result.records);
        setNextToken(result.nextToken);
      } catch (e: any) {
        setRecords([]);
        setNextToken(null);
        setError(e?.message || 'Failed to load records.');
        toast.showError('Failed to load records. Check the console for details.');
        console.error('Failed to load audit records:', e);
      } finally {
        setLoading(false);
      }
    },
    [allTypes, entityType, operation, toast],
  );

  // Reset pagination + reload first page whenever the filters change.
  useEffect(() => {
    setPrevStack([]);
    setCurrentToken(null);
    setPage(1);
    load(null);
  }, [load]);

  function updateFilters(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    next.entityType ? params.set('entityType', next.entityType) : params.delete('entityType');
    next.operation ? params.set('operation', next.operation) : params.delete('operation');
    setSearchParams(params);
  }

  async function handleNext() {
    if (!nextToken) return;
    setPrevStack((s) => [...s, currentToken]);
    setCurrentToken(nextToken);
    setPage((p) => p + 1);
    await load(nextToken);
  }

  async function handlePrev() {
    if (prevStack.length === 0) return;
    const token = prevStack[prevStack.length - 1];
    setPrevStack((s) => s.slice(0, -1));
    setCurrentToken(token);
    setPage((p) => p - 1);
    await load(token);
  }

  async function handleBulkExport() {
    setExporting(true);
    toast.showInfo('Fetching all records for export…');
    try {
      const all = await getAllRecordsForExport({ entityType, operation });
      if (!all.length) {
        toast.showWarning('No records to export.');
        return;
      }
      setExportRecords(all);
    } catch (e) {
      console.error('Bulk export failed:', e);
      toast.showError('Export failed. Check the console for details.');
    } finally {
      setExporting(false);
    }
  }

  function doExport(format: 'json' | 'csv') {
    const all = exportRecords;
    setExportRecords(null);
    if (!all) return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const label = [entityType || 'all', operation || 'all', getEnvironment()].filter(Boolean).join('-');
    if (format === 'json') {
      downloadFile(JSON.stringify(all, null, 2), `audit-export-${label}-${ts}.json`, 'application/json');
    } else {
      downloadFile(recordsToCsv(all), `audit-export-${label}-${ts}.csv`, 'text/csv');
    }
    toast.showSuccess(`Exported ${all.length} records.`);
  }

  return (
    <div>
      <PageHeader
        title="Audit Records"
        icon={<FileSearch size={26} />}
        subtitle="Read-only trail of create / update / delete events across inventory, maintenance, violations, and deployments."
      />

      <FilterBar
        search={false}
        filters={{ entityType, operation }}
        show={['entityType', 'operation']}
        options={AUDIT_FILTER_OPTIONS}
        labels={AUDIT_FILTER_LABELS}
        onChange={updateFilters}
        actions={
          <>
            <Button
              size="sm"
              variant="light"
              onPress={() => setSearchParams(new URLSearchParams())}
              startContent={<RotateCcw size={16} />}
            >
              Reset
            </Button>
            <Button
              size="sm"
              color="secondary"
              variant="flat"
              onPress={handleBulkExport}
              isLoading={exporting}
              startContent={!exporting && <Download size={16} />}
            >
              Export all
            </Button>
          </>
        }
      />

      {loading ? (
        <LoadingState label="Loading records…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(currentToken)} />
      ) : records.length === 0 ? (
        <EmptyState icon="📋" title="No audit records" message="No audit records found for the current filters." />
      ) : (
        <RecordsTable
          records={records}
          allTypes={allTypes}
          page={page}
          hasNext={!!nextToken}
          hasPrev={prevStack.length > 0}
          onRowClick={setSelected}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}

      <RecordDetailModal
        record={selected}
        onClose={() => setSelected(null)}
        onExported={(m) => toast.showSuccess(m)}
      />

      <ExportFormatPrompt
        isOpen={exportRecords !== null}
        count={exportRecords?.length ?? 0}
        onChoose={doExport}
        onCancel={() => setExportRecords(null)}
      />
    </div>
  );
}
