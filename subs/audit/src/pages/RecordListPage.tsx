import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingState, ErrorState, EmptyState, useToast } from '@spookydecs/ui';
import { FileSearch } from 'lucide-react';
import { getRecords, getAllTypes, getAllRecordsForExport, getEnvironment } from '../api/auditApi';
import { recordsToCsv, downloadFile, DEFAULT_PAGE_SIZE } from '../lib/format';
import type { AuditRecord } from '../types/audit';
import { FilterBar } from './components/FilterBar';
import { RecordsTable } from './components/RecordsTable';
import { RecordDetailModal } from './components/RecordDetailModal';
import { ExportFormatPrompt } from './components/ExportFormatPrompt';

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

  function updateFilters(next: { entityType?: string; operation?: string }) {
    const params = new URLSearchParams(searchParams);
    if (next.entityType !== undefined) {
      next.entityType ? params.set('entityType', next.entityType) : params.delete('entityType');
    }
    if (next.operation !== undefined) {
      next.operation ? params.set('operation', next.operation) : params.delete('operation');
    }
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
        entityType={entityType}
        operation={operation}
        exporting={exporting}
        onEntityTypeChange={(v) => updateFilters({ entityType: v })}
        onOperationChange={(v) => updateFilters({ operation: v })}
        onReset={() => setSearchParams(new URLSearchParams())}
        onExport={handleBulkExport}
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
