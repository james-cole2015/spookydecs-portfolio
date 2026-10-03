import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, EmptyState, ErrorState, LoadingState, PageHeader } from '@spookydecs/ui';
import { StatusChip } from '../components/StatusChip';
import { listDeployments, listHistoricalDeployments } from '../api/deploymentsApi';

interface GraphListItem {
  deployment_id: string;
  status: string;
  season?: string;
  year?: number | string;
}

function seasonLabel(season?: string, year?: number | string): string {
  return `${season || '—'} ${year || ''}`.trim();
}

export default function GraphsPage() {
  const navigate = useNavigate();

  const [deployments, setDeployments] = useState<GraphListItem[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [active, archived] = await Promise.all([
          listDeployments(),
          listHistoricalDeployments(),
        ]);
        if (cancelled) return;
        // listDeployments() (no status filter) scans every METADATA record,
        // archived included — drop those here and let listHistoricalDeployments()
        // (a GSI query already scoped to status=archived) own that half of the list.
        const merged: GraphListItem[] = [
          ...(active.data || []).filter((d: any) => d.status !== 'archived'),
          ...(archived.data || []).map((d: any) => ({ ...d, status: d.status || 'archived' })),
        ];
        merged.sort((a, b) => String(b.deployment_id).localeCompare(String(a.deployment_id)));
        setDeployments(merged);
      } catch (err: any) {
        console.error('[Graphs] Failed to load deployment list:', err);
        if (!cancelled) setListError(err?.message || 'Failed to load deployments.');
      } finally {
        if (!cancelled) setListLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Breadcrumbs crumbs={[{ label: 'Deployments', to: '/' }, { label: 'Graphs' }]} />
      <PageHeader
        title="Deployment Graphs"
        subtitle="Pick a deployment to view its interactive power-topology schematic."
      />

      {!listLoaded ? (
        <LoadingState label="Loading deployments…" />
      ) : listError ? (
        <ErrorState message={listError} />
      ) : deployments.length === 0 ? (
        <EmptyState icon="📊" title="No deployments yet" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deployments.map((d) => (
            <button
              key={d.deployment_id}
              onClick={() => navigate(`/graphs/${d.deployment_id}`)}
              className="rounded-medium border border-default-200 p-4 text-left hover:border-default-400"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{d.deployment_id}</span>
                <StatusChip status={d.status} size="sm" />
              </div>
              <div className="text-xs text-default-500">{seasonLabel(d.season, d.year)}</div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
