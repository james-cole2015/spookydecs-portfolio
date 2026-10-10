import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Tab, Tabs } from '@heroui/react';
import { Breadcrumbs, ErrorState, LoadingState, PageHeader } from '@spookydecs/ui';
import { getDeployment } from '../api/deploymentsApi';
import { StatusChip } from '../components/StatusChip';
import DeclarePage from './DeclarePage';

const DeploymentSchematic = lazy(() => import('./DeploymentSchematic'));

type TabKey = 'declare' | 'connect';

/**
 * /builder/:id — the live deployment workspace (#638). Declare and Connect are tabs,
 * not routes, because setups get rearranged continuously: bouncing between them must
 * be a no-navigation switch. Staging, Complete and Teardown stay their own pages.
 */
export default function DeploymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const deploymentId = id!;
  const tab: TabKey = params.get('tab') === 'connect' ? 'connect' : 'declare';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const res = await getDeployment(deploymentId, ['zones']);
      if (!res?.success) throw new Error('Failed to load deployment');
      setMeta(res.data.metadata || res.data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load deployment');
    } finally {
      setLoading(false);
    }
  }, [deploymentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading deployment…" />;
  if (error || !meta) return <ErrorState message={error || 'Deployment not found'} onRetry={() => navigate('/')} />;

  const status = meta.status || 'unknown';
  const teardownEnabled = ['completed', 'active_teardown', 'archived'].includes(status);

  return (
    <>
      <Breadcrumbs crumbs={[{ label: 'Deployments', to: '/' }, { label: meta.deployment_id || deploymentId }]} />
      <PageHeader
        title={meta.deployment_id || deploymentId}
        subtitle={`${meta.season || 'Unknown'} · ${meta.year ?? 'N/A'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={status} size="md" />
            <Button variant="flat" onPress={() => navigate(`/builder/${deploymentId}/staging`)} data-testid="admin-card-staging">
              Staging
            </Button>
            <Button variant="flat" onPress={() => navigate(`/builder/${deploymentId}/zones/complete`)} data-testid="admin-card-complete">
              Review &amp; Complete
            </Button>
            <Button
              variant="flat"
              isDisabled={!teardownEnabled}
              onPress={() => navigate(`/builder/${deploymentId}/teardown`)}
              data-testid="admin-card-teardown"
            >
              Teardown
            </Button>
          </div>
        }
      />

      <Tabs
        aria-label="Deployment workspace"
        selectedKey={tab}
        onSelectionChange={(k) => setParams(k === 'connect' ? { tab: 'connect' } : {}, { replace: true })}
        className="mb-4"
      >
        <Tab key="declare" title="Declare" />
        <Tab key="connect" title="Connect" />
      </Tabs>

      {tab === 'declare' ? (
        <DeclarePage
          deploymentId={deploymentId}
          season={String(meta.season)}
          year={meta.year}
          onChanged={load}
        />
      ) : (
        <Suspense fallback={<LoadingState />}>
          <DeploymentSchematic />
        </Suspense>
      )}
    </>
  );
}
