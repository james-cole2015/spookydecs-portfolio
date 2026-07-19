import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, Chip } from '@heroui/react';
import { Breadcrumbs, ErrorState, LoadingState, PageHeader } from '@spookydecs/ui';
import { getDeployment } from '../api/deploymentsApi';
import { StatsChart } from '../components/StatsChart';
import { StatusChip } from '../components/StatusChip';
import type { Deployment, Zone } from '../config/deploymentsConfig';

const ZONE_ICON: Record<string, string> = { FY: '🏡', BY: '🌳', SY: '🏠' };

function durationMinutes(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}
function formatMinutes(minutes?: number | null): string {
  if (minutes == null || minutes <= 0) return minutes === 0 ? '0m' : '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function formatTimestamp(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <Card>
      <CardBody className="flex-row items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-xl font-semibold text-foreground">{value}</div>
          <div className="text-xs text-default-500">{label}</div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function StatsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const deploymentId = id!;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await getDeployment(deploymentId, ['zones']);
      const data = response.data;
      setDeployment(data.metadata || data);
      setZones(data.zones || []);
    } catch (e: any) {
      console.error('[StatsDetail] Error:', e);
      setError(e?.message || 'Failed to load deployment');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentId]);

  if (loading) return <LoadingState label="Loading deployment details…" />;
  if (error || !deployment)
    return <ErrorState message={error || 'Failed to load'} onRetry={() => navigate('/deployments/stats')} />;

  const d: any = deployment;
  const stats = d.statistics || {};
  const setupMins = durationMinutes(d.setup_started_at, d.setup_completed_at);
  const teardownMins = durationMinutes(d.teardown_started_at, d.teardown_completed_at);
  const totalMins = durationMinutes(d.setup_started_at, d.teardown_completed_at);

  const totalSetupMinutes = zones.reduce(
    (sum, z) => sum + ((z as any).statistics?.total_setup_minutes || 0),
    0,
  );
  const totalItems = stats.total_items || 0;
  const totalSessions = stats.total_sessions || 0;
  const minsPerItem =
    totalItems > 0 && totalSetupMinutes > 0 ? (totalSetupMinutes / totalItems).toFixed(1) : null;
  const avgSessionMins =
    totalSessions > 0 && totalSetupMinutes > 0 ? Math.round(totalSetupMinutes / totalSessions) : null;
  const activeZones = zones.filter((z) => ((z as any).statistics?.item_count || 0) > 0).length;
  const totalSessAll = zones.reduce((sum, z) => sum + ((z as any).statistics?.session_count || 0), 0);

  const timestamps = [
    { label: 'Setup Started', value: d.setup_started_at },
    { label: 'Setup Completed', value: d.setup_completed_at },
    { label: 'Teardown Started', value: d.teardown_started_at },
    { label: 'Teardown Completed', value: d.teardown_completed_at },
  ];

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/deployments' },
          { label: 'Stats', to: '/deployments/stats' },
          { label: d.deployment_id },
        ]}
      />
      <PageHeader
        title={d.deployment_id}
        subtitle={String(d.year)}
        actions={<StatusChip status={d.status} size="md" />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {timestamps.map((t) => (
          <Card key={t.label}>
            <CardBody>
              <div className="text-xs uppercase tracking-wide text-default-500">{t.label}</div>
              <div className={t.value ? 'text-sm text-foreground' : 'text-sm text-default-400'}>
                {t.value ? formatTimestamp(t.value) : '—'}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="🏗️" label="Setup Duration" value={formatMinutes(setupMins)} />
        <StatCard icon="📦" label="Teardown Duration" value={formatMinutes(teardownMins)} />
        <StatCard icon="🕐" label="Total Elapsed" value={formatMinutes(totalMins)} />
        <StatCard icon="📦" label="Items Deployed" value={stats.total_items ?? 0} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Zone Breakdown</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => {
          const s = (zone as any).statistics || {};
          return (
            <Card key={zone.zone_code}>
              <CardBody className="gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ZONE_ICON[zone.zone_code] || '📍'}</span>
                  <h3 className="font-semibold text-foreground">{zone.zone_name}</h3>
                  <Chip size="sm" variant="flat">
                    {zone.zone_code}
                  </Chip>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-lg font-semibold text-foreground">{s.item_count ?? 0}</div>
                    <div className="text-xs text-default-500">Items</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">{s.session_count ?? 0}</div>
                    <div className="text-xs text-default-500">Sessions</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {formatMinutes(s.total_setup_minutes ?? 0)}
                    </div>
                    <div className="text-xs text-default-500">Total Time</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {formatMinutes(s.longest_session_minutes ?? 0)}
                    </div>
                    <div className="text-xs text-default-500">Longest Session</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Item Composition</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardBody className="gap-2">
            <h3 className="text-base font-semibold text-foreground">By Class</h3>
            <StatsChart data={stats.by_class || {}} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="gap-2">
            <h3 className="text-base font-semibold text-foreground">By Class Type</h3>
            <StatsChart data={stats.by_class_type || {}} />
          </CardBody>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Efficiency Metrics</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { value: minsPerItem !== null ? `${minsPerItem}m` : '—', label: 'Minutes per Item', sub: 'Based on zone setup time' },
          { value: avgSessionMins !== null ? formatMinutes(avgSessionMins) : '—', label: 'Avg Session Length', sub: 'Across all zones' },
          { value: `${activeZones} / ${zones.length}`, label: 'Zones Used', sub: 'Zones with items deployed' },
          { value: totalSessAll, label: 'Total Sessions', sub: 'Across all zones' },
        ].map((c) => (
          <Card key={c.label}>
            <CardBody className="items-center text-center">
              <div className="text-2xl font-semibold text-foreground">{c.value}</div>
              <div className="text-sm text-default-600">{c.label}</div>
              <div className="text-xs text-default-400">{c.sub}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
