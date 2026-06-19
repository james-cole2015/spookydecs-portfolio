import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, Chip } from '@heroui/react';
import { ClipboardList } from 'lucide-react';
import { Breadcrumbs, EmptyState, ErrorState, LoadingState, PageHeader } from '@spookydecs/ui';
import { getDeployment, getSession } from '../api/deploymentsApi';
import type { Deployment, Zone, Session } from '../config/deploymentsConfig';

function truncateSessionId(sessionId: string): string {
  const parts = sessionId.split('-');
  return parts[1]?.substring(0, 6) || sessionId;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${seconds}s`;
}

function MetaCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-default-500">{label}</div>
        <div className="text-base font-medium text-foreground">{value}</div>
        {sub && <div className="text-sm text-default-500">{sub}</div>}
      </CardBody>
    </Card>
  );
}

export default function SessionDetailPage() {
  const { id, zone: zoneCode, sessionId } = useParams();
  const navigate = useNavigate();
  const deploymentId = id!;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [deploymentResponse, sessionResponse] = await Promise.all([
          getDeployment(deploymentId, ['zones']),
          getSession(deploymentId, sessionId!),
        ]);
        const data = deploymentResponse.data;
        const dep = data.metadata || data;
        const zones: Zone[] = data.zones || [];
        const found = zones.find((z) => z.zone_code === zoneCode);
        if (!found) throw new Error(`Zone ${zoneCode} not found in deployment`);
        if (cancelled) return;
        setDeployment(dep);
        setZone(found);
        setSession(sessionResponse.data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deploymentId, zoneCode, sessionId]);

  if (loading) return <LoadingState label="Loading session details…" />;
  if (error || !session || !zone || !deployment)
    return (
      <ErrorState
        message={error || 'Session not found'}
        onRetry={() => navigate(`/deployments/builder/${deploymentId}/zones/${zoneCode}`)}
      />
    );

  const s: any = session;
  const start = new Date(s.start_time);
  const end = s.end_time ? new Date(s.end_time) : null;
  const items: string[] = s.items_deployed || [];
  const connectionIds: string[] = s.connections_created || [];

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Zones', to: `/deployments/builder/${deploymentId}/zones` },
          { label: zone.zone_name, to: `/deployments/builder/${deploymentId}/zones/${zoneCode}` },
          { label: `Session ${truncateSessionId(session.session_id)}` },
        ]}
      />
      <PageHeader
        title={`Session ${truncateSessionId(session.session_id)}`}
        icon={<ClipboardList size={24} />}
        actions={
          <Chip color={end ? 'success' : 'primary'} variant="flat">
            {end ? 'Completed' : 'Active'}
          </Chip>
        }
      />

      <h2 className="mb-3 text-lg font-semibold text-foreground">Session Details</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaCard
          label="Started"
          value={start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          sub={start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        />
        <MetaCard
          label="Ended"
          value={end ? end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
          sub={end ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'In progress'}
        />
        <MetaCard label="Duration" value={formatDuration(s.duration_seconds)} />
        <MetaCard label="Session ID" value={session.session_id} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Items Deployed</h2>
        <span className="text-sm text-default-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      {items.length === 0 ? (
        <EmptyState icon="📦" title="No items deployed in this session" />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((itemId) => (
            <Card key={itemId}>
              <CardBody className="flex-row items-center gap-3">
                <span className="text-2xl">📦</span>
                <span className="font-mono text-sm text-foreground">{itemId}</span>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Connections Created</h2>
        <span className="text-sm text-default-500">
          {connectionIds.length} {connectionIds.length === 1 ? 'connection' : 'connections'}
        </span>
      </div>
      {connectionIds.length === 0 ? (
        <EmptyState icon="🔌" title="No connections created in this session" />
      ) : (
        <div className="mb-6 flex flex-col gap-2">
          {connectionIds.map((connId) => (
            <a
              key={connId}
              href={`/deployments/builder/${deploymentId}/${session.session_id}/${connId}`}
              className="flex items-center gap-3 rounded-medium border border-default-200 p-3 hover:border-secondary"
            >
              <span className="text-xl">🔌</span>
              <div className="flex flex-col">
                <span className="font-mono text-sm text-foreground">{connId}</span>
                <span className="text-xs text-secondary">View Details →</span>
              </div>
            </a>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Notes</h2>
      {s.notes ? (
        <Card>
          <CardBody className="text-sm text-foreground">{s.notes}</CardBody>
        </Card>
      ) : (
        <p className="text-sm text-default-500">No notes recorded for this session</p>
      )}
    </>
  );
}
