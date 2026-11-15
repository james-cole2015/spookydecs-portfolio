import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { Breadcrumbs, ErrorState, LoadingState, PageHeader } from '@spookydecs/ui';
import { getDeployment } from '../api/deploymentsApi';
import { DeploymentDates } from '../components/DeploymentDates';
import { StatusChip } from '../components/StatusChip';
import DeploymentSchematic from './DeploymentSchematic';

/**
 * /builder/:id — the live deployment workspace (#638). One graph per zone: items are added to
 * a zone from the picker (which declares them), wired by dragging, and managed from the side
 * panel. Staging, Complete and Teardown stay their own pages.
 */
export default function DeploymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const deploymentId = id!;

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
            <Button variant="flat" onPress={() => navigate(`/builder/${deploymentId}/items`)} data-testid="admin-card-items">
              Items &amp; Photos
            </Button>
            <Button variant="flat" onPress={() => navigate(`/builder/${deploymentId}/staging`)} data-testid="admin-card-staging">
              Staging
            </Button>
            <Button variant="flat" onPress={() => navigate(`/builder/${deploymentId}/complete`)} data-testid="admin-card-complete">
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
      <DeploymentDates
        deploymentId={deploymentId}
        startDate={meta.start_date}
        setupCompletedAt={meta.setup_completed_at}
        readOnly={status === 'archived'}
        onSaved={load}
      />
      <DeploymentSchematic embedded />
    </>
  );
}
