import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, CardFooter, CardHeader, Chip } from '@heroui/react';
import { Package, CheckCircle2, Trash2, Lock, ArrowRight } from 'lucide-react';
import { Breadcrumbs, ErrorState, LoadingState, PageHeader } from '@spookydecs/ui';
import { getDeployment, getActiveSessions } from '../api/deploymentsApi';
import { StatusChip } from '../components/StatusChip';
import type { Zone } from '../config/deploymentsConfig';

const ZONE_ORDER: Record<string, number> = { FY: 1, BY: 2, SY: 3 };
const ZONE_ICON: Record<string, string> = { FY: '🏡', BY: '🌳', SY: '🏠' };

interface DeploymentInfo {
  deployment_id: string;
  season?: string;
  year?: number | string;
  status?: string;
}

export default function ZonesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const deploymentId = id!;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeSessions, setActiveSessions] = useState<Record<string, unknown>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [deploymentResponse, activeSessionsResponse] = await Promise.all([
        getDeployment(deploymentId, ['zones']),
        getActiveSessions(deploymentId).catch(() => ({ data: [] })),
      ]);

      const data = deploymentResponse.data;
      let dep: DeploymentInfo;
      let zoneList: Zone[];
      if (data.metadata && data.zones) {
        dep = data.metadata;
        zoneList = data.zones;
      } else if (Array.isArray(data.zones)) {
        dep = data;
        zoneList = data.zones;
      } else {
        throw new Error('Unexpected deployment data structure');
      }
      if (!zoneList || zoneList.length === 0) throw new Error('No zones found for this deployment');

      const sessions: Record<string, unknown> = {};
      (activeSessionsResponse.data || []).forEach((s: any) => {
        if (s.zone_code) sessions[s.zone_code] = s;
      });

      setDeployment({ ...dep, deployment_id: dep.deployment_id || deploymentId });
      setZones(zoneList);
      setActiveSessions(sessions);
    } catch (e: any) {
      console.error('[ZonesDashboard] Error loading deployment:', e);
      setError(e?.message || 'Failed to load deployment');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentId]);

  if (loading) return <LoadingState label="Loading deployment zones…" />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/deployments')} />;

  const status = deployment?.status || 'unknown';
  const teardownEnabled = ['completed', 'active_teardown', 'archived'].includes(status);

  const sortedZones = [...zones].sort(
    (a, b) => (ZONE_ORDER[a.zone_code] || 99) - (ZONE_ORDER[b.zone_code] || 99),
  );

  const adminCards = [
    {
      key: 'staging',
      icon: <Package className="text-secondary" size={28} />,
      title: 'Staging Area',
      description: 'Prepare totes and items for deployment',
      action: 'Stage Items',
      enabled: true,
      to: `/deployments/builder/${deploymentId}/staging`,
    },
    {
      key: 'complete',
      icon: <CheckCircle2 className="text-success" size={28} />,
      title: 'Complete Deployment',
      description: 'Finalize all records, mark items as deployed, and lock the deployment.',
      action: 'Review & Complete',
      enabled: true,
      to: `/deployments/builder/${deploymentId}/zones/complete`,
    },
    {
      key: 'teardown',
      icon: <Trash2 className="text-warning" size={28} />,
      title: 'Deployment Teardown',
      description: 'Begin removing items after the season ends and return them to storage.',
      action: teardownEnabled ? 'Start Teardown' : 'Available after completion',
      enabled: teardownEnabled,
      to: `/deployments/builder/${deploymentId}/teardown`,
    },
  ];

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/deployments' },
          { label: deployment?.deployment_id || deploymentId },
        ]}
      />
      <PageHeader
        title={deployment?.deployment_id || deploymentId}
        subtitle={`${deployment?.season || 'Unknown'} · ${deployment?.year ?? 'N/A'}`}
        actions={<StatusChip status={status} size="md" />}
      />

      <h2 className="mb-3 text-lg font-semibold text-foreground">Builder Administration</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminCards.map((c) => (
          <Card
            key={c.key}
            isPressable={c.enabled}
            isHoverable={c.enabled}
            onPress={c.enabled ? () => navigate(c.to) : undefined}
            className={`h-full ${c.enabled ? '' : 'opacity-60'}`}
          >
            <CardHeader className="gap-3">
              {c.icon}
              <h3 className="text-base font-semibold text-foreground">{c.title}</h3>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-sm text-default-500">{c.description}</p>
            </CardBody>
            <CardFooter className="pt-0 text-sm font-medium text-secondary">
              {c.enabled ? (
                <span className="flex items-center gap-1">
                  {c.action} <ArrowRight size={14} />
                </span>
              ) : (
                <span className="flex items-center gap-1 text-default-400">
                  {c.action} <Lock size={14} />
                </span>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Deployment Zones</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedZones.map((zone) => {
          const itemCount = (zone as any).statistics?.item_count || 0;
          const sessionCount = (zone as any).statistics?.session_count || 0;
          const hasActiveSession = !!activeSessions[zone.zone_code];
          return (
            <Card
              key={zone.zone_code}
              isPressable
              isHoverable
              onPress={() =>
                navigate(`/deployments/builder/${deploymentId}/zones/${zone.zone_code}`)
              }
              className="h-full"
            >
              <CardHeader className="justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>
                    {ZONE_ICON[zone.zone_code] || '📍'}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{zone.zone_name}</h3>
                    <p className="text-xs text-default-500">{zone.zone_code}</p>
                  </div>
                </div>
                {hasActiveSession && (
                  <Chip color="primary" variant="dot" size="sm">
                    Active
                  </Chip>
                )}
              </CardHeader>
              <CardBody className="pt-0">
                <div className="flex gap-6">
                  <div>
                    <div className="text-xl font-semibold text-foreground">{itemCount}</div>
                    <div className="text-xs text-default-500">Items Deployed</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-foreground">{sessionCount}</div>
                    <div className="text-xs text-default-500">Sessions</div>
                  </div>
                </div>
                {zone.receptacle_id && (
                  <p className="mt-3 text-xs text-default-400">🔌 {zone.receptacle_id}</p>
                )}
              </CardBody>
              <CardFooter className="pt-0 text-sm font-medium text-secondary">
                <span className="flex items-center gap-1">
                  {hasActiveSession ? 'Resume Session' : itemCount > 0 ? 'View Details' : 'Get Started'}
                  <ArrowRight size={14} />
                </span>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </>
  );
}
