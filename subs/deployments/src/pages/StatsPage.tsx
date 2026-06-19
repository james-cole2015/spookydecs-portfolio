import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
} from '@heroui/react';
import { Breadcrumbs, EmptyState, ErrorState, LoadingState, PageHeader } from '@spookydecs/ui';
import { listDeployments } from '../api/deploymentsApi';
import { StatusChip } from '../components/StatusChip';
import type { Deployment } from '../config/deploymentsConfig';

function durationMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}
function formatMinutes(minutes: number): string {
  if (minutes < 0) minutes = 0;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function seasonBadge(season?: string) {
  const map: Record<string, { icon: string }> = {
    Halloween: { icon: '🎃' },
    Christmas: { icon: '🎄' },
    Shared: { icon: '📅' },
  };
  const s = map[season || ''] || { icon: '📅' };
  return (
    <Chip size="sm" variant="flat">
      {s.icon} {season}
    </Chip>
  );
}

export default function StatsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await listDeployments();
      setDeployments(response.data || []);
    } catch (e: any) {
      console.error('[Stats] Error loading stats:', e);
      setError(e?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? deployments : deployments.filter((d) => d.season === filter)),
    [deployments, filter],
  );

  const summary = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter((d) => d.status === 'completed' || d.status === 'archived');
    const avgItems =
      total === 0
        ? 0
        : Math.round(
            filtered.reduce((sum, d) => sum + ((d.statistics as any)?.total_items || 0), 0) / total,
          );
    const setupTimes = completed
      .filter((d: any) => d.setup_started_at && d.setup_completed_at)
      .map((d: any) => durationMinutes(d.setup_started_at, d.setup_completed_at));
    const avgSetup =
      setupTimes.length === 0 ? null : Math.round(setupTimes.reduce((a, b) => a + b, 0) / setupTimes.length);
    const totalSessions = filtered.reduce(
      (sum, d) => sum + ((d.statistics as any)?.total_sessions || 0),
      0,
    );
    return { total, avgItems, avgSetup, totalSessions };
  }, [filtered]);

  if (loading) return <LoadingState label="Loading deployment stats…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const sorted = [...filtered].sort(
    (a, b) => new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime(),
  );

  return (
    <>
      <Breadcrumbs crumbs={[{ label: 'Deployments', to: '/deployments' }, { label: 'Stats' }]} />
      <PageHeader
        title="📊 Deployment Stats"
        subtitle="Performance metrics and history across all deployments"
      />

      <Tabs
        aria-label="Season filter"
        selectedKey={filter}
        onSelectionChange={(k) => setFilter(String(k))}
        className="mb-4"
      >
        <Tab key="all" title="All Seasons" />
        <Tab key="Halloween" title="🎃 Halloween" />
        <Tab key="Christmas" title="🎄 Christmas" />
      </Tabs>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: '🚀', label: 'Total Deployments', value: summary.total },
          { icon: '📦', label: 'Avg Items / Deployment', value: summary.avgItems },
          { icon: '⏱️', label: 'Avg Setup Time', value: summary.avgSetup !== null ? formatMinutes(summary.avgSetup) : '—' },
          { icon: '🔧', label: 'Total Sessions', value: summary.totalSessions },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="flex-row items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="text-xl font-semibold text-foreground">{s.value}</div>
                <div className="text-xs text-default-500">{s.label}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Deployments</h2>
        <span className="text-sm text-default-500">
          {filtered.length} deployment{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No deployments found"
          message="No deployments match the selected season filter."
        />
      ) : (
        <Table
          aria-label="Deployments"
          selectionMode="single"
          onRowAction={(key) => navigate(`/deployments/stats/${key}`)}
        >
          <TableHeader>
            <TableColumn>DEPLOYMENT</TableColumn>
            <TableColumn>SEASON</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ITEMS</TableColumn>
            <TableColumn>SETUP TIME</TableColumn>
            <TableColumn>TEARDOWN</TableColumn>
          </TableHeader>
          <TableBody>
            {sorted.map((d: any) => {
              const setupDuration =
                d.setup_started_at && d.setup_completed_at
                  ? formatMinutes(durationMinutes(d.setup_started_at, d.setup_completed_at))
                  : '—';
              const teardownDuration =
                d.teardown_started_at && d.teardown_completed_at
                  ? formatMinutes(durationMinutes(d.teardown_started_at, d.teardown_completed_at))
                  : '—';
              return (
                <TableRow key={d.deployment_id} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium text-foreground">{d.deployment_id}</div>
                    <div className="text-xs text-default-500">
                      {d.year} · Created {formatDate(d.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>{seasonBadge(d.season)}</TableCell>
                  <TableCell>
                    <StatusChip status={d.status} />
                  </TableCell>
                  <TableCell>{d.statistics?.total_items ?? 0}</TableCell>
                  <TableCell>{setupDuration}</TableCell>
                  <TableCell>{teardownDuration}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
