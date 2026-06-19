import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody } from '@heroui/react';
import { Play, Square, ClipboardList, Zap } from 'lucide-react';
import { Breadcrumbs, ErrorState, LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import {
  getDeployment,
  getZoneSessions,
  createSession,
  endSession,
} from '../api/deploymentsApi';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SessionHistoryTable } from '../components/SessionHistoryTable';
import { ZoneItemsDrawer } from '../components/ZoneItemsDrawer';
import type { Session, Zone } from '../config/deploymentsConfig';

const ZONE_ICON: Record<string, string> = { FY: '🏡', BY: '🌳', SY: '🏠' };

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

interface DeploymentInfo {
  deployment_id: string;
}

export default function ZoneDetailPage() {
  const { id, zone: zoneCode } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const deploymentId = id!;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [deploymentResponse, sessionsResponse] = await Promise.all([
        getDeployment(deploymentId, ['zones']),
        getZoneSessions(deploymentId, zoneCode!),
      ]);
      const data = deploymentResponse.data;
      const dep = data.metadata || data;
      const zones: Zone[] = data.zones || [];
      const found = zones.find((z) => z.zone_code === zoneCode);
      if (!found) throw new Error(`Zone ${zoneCode} not found in deployment`);
      const sess: Session[] = sessionsResponse.data || [];
      const active = sess.find((s: any) => s.start_time && !s.end_time) || null;
      setDeployment({ ...dep, deployment_id: dep.deployment_id || deploymentId });
      setZone(found);
      setSessions(sess);
      setActiveSession(active);
    } catch (e: any) {
      console.error('[ZoneDetail] Error loading zone:', e);
      setError(e?.message || 'Failed to load zone');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentId, zoneCode]);

  async function handleStartSession() {
    setBusy(true);
    try {
      await createSession(deploymentId, { zone_code: zoneCode });
      navigate(`/deployments/builder/${deploymentId}/zones/${zoneCode}/session`);
    } catch (e: any) {
      console.error('[ZoneDetail] Error creating session:', e);
      toast.showError(e?.message || 'Failed to start session');
      setBusy(false);
      setStartOpen(false);
    }
  }

  async function handleEndSession() {
    if (!activeSession) return;
    setBusy(true);
    try {
      await endSession(deploymentId, activeSession.session_id, {
        end_time: new Date().toISOString(),
      });
      setEndOpen(false);
      setBusy(false);
      load();
    } catch (e: any) {
      console.error('[ZoneDetail] Error ending session:', e);
      toast.showError('Failed to end session. Please try again.');
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading zone details…" />;
  if (error || !zone || !deployment)
    return (
      <ErrorState
        message={error || 'Zone not found'}
        onRetry={() => navigate(`/deployments/builder/${deploymentId}/zones`)}
      />
    );

  const stats = (zone as any).statistics || {};
  const itemsDeployed: string[] = (zone as any).items_deployed || [];
  const hasItems = itemsDeployed.length > 0;
  const statCards = [
    { icon: '📦', label: 'Items Deployed', value: String(stats.item_count || 0) },
    { icon: '🔧', label: 'Total Sessions', value: String(stats.session_count || 0) },
    { icon: '⏱️', label: 'Total Time', value: formatMinutes(stats.total_setup_minutes || 0) },
    { icon: '⏲️', label: 'Longest Session', value: formatMinutes(stats.longest_session_minutes || 0) },
  ];

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/deployments' },
          { label: deployment.deployment_id, to: `/deployments/builder/${deploymentId}/zones` },
          { label: zone.zone_name },
        ]}
      />
      <PageHeader
        title={`${ZONE_ICON[zone.zone_code] || '📍'} ${zone.zone_name}`}
        subtitle={`${zone.zone_code}${zone.receptacle_id ? ` · 🔌 ${zone.receptacle_id}` : ''}`}
      />

      {activeSession && (
        <Card className="mb-6 border border-primary-200 bg-primary-50/40">
          <CardBody className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Zap className="text-primary" size={24} />
              <div>
                <div className="font-semibold text-foreground">Session in progress</div>
                <div className="text-sm text-default-500">
                  Started at{' '}
                  {new Date((activeSession as any).start_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                color="primary"
                startContent={<Play size={16} />}
                onPress={() =>
                  navigate(`/deployments/builder/${deploymentId}/zones/${zoneCode}/session`)
                }
              >
                Resume Session
              </Button>
              <Button
                variant="flat"
                startContent={<Square size={16} />}
                onPress={() => setEndOpen(true)}
              >
                End Session
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex-row items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {s.icon}
              </span>
              <div>
                <div className="text-xl font-semibold text-foreground">{s.value}</div>
                <div className="text-xs text-default-500">{s.label}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Quick Actions</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!activeSession && (
          <Card isPressable isHoverable onPress={() => setStartOpen(true)}>
            <CardBody className="flex-row items-center gap-3">
              <Play className="text-secondary" size={24} />
              <div>
                <h3 className="font-semibold text-foreground">Start New Session</h3>
                <p className="text-sm text-default-500">
                  Begin deploying items and making connections
                </p>
              </div>
            </CardBody>
          </Card>
        )}
        {hasItems && (
          <Card isPressable isHoverable onPress={() => setDrawerOpen(true)}>
            <CardBody className="flex-row items-center gap-3">
              <ClipboardList className="text-secondary" size={24} />
              <div>
                <h3 className="font-semibold text-foreground">View Items</h3>
                <p className="text-sm text-default-500">
                  See all {itemsDeployed.length} items in this zone
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Session History</h2>
        <span className="text-sm text-default-500">
          {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>
      <SessionHistoryTable
        sessions={sessions}
        onSessionClick={(session) =>
          navigate(
            `/deployments/builder/${deploymentId}/zones/${zoneCode}/sessions/${session.session_id}`,
          )
        }
      />

      <ZoneItemsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        zoneName={zone.zone_name}
        itemIds={itemsDeployed}
      />

      <ConfirmDialog
        isOpen={startOpen}
        title="Start Work Session"
        body={
          <>
            <p>
              Ready to start working on <strong>{zone.zone_name}</strong>?
            </p>
            <p className="mt-2 text-sm">
              You'll be able to add and remove items during this session. Track your work time and
              add notes when you're done.
            </p>
          </>
        }
        confirmLabel="Start Session"
        isLoading={busy}
        onConfirm={handleStartSession}
        onClose={() => setStartOpen(false)}
      />

      <ConfirmDialog
        isOpen={endOpen}
        title="End Session"
        body="Are you sure you want to end this session?"
        confirmLabel="End Session"
        confirmColor="danger"
        isLoading={busy}
        onConfirm={handleEndSession}
        onClose={() => setEndOpen(false)}
      />
    </>
  );
}
