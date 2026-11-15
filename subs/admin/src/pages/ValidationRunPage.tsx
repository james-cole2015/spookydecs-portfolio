/**
 * One panel-started validation run (#679): live while it is running, per-test results once it ends.
 */
import { Button } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState, PageHeader, isDemoEnv } from '@spookydecs/ui';
import RunResults, { RunSummaryCard } from '../components/RunResults';
import { useRunPolling } from '../hooks/useValidationRun';
import { VALIDATION_SUBS } from '../config/validationRegistry';
import { subsLabel } from '../lib/validationRunModel';

export default function ValidationRunPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { run, error } = useRunPolling(isDemoEnv() ? null : runId ?? null);

  if (isDemoEnv()) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={run ? `Run: ${subsLabel(run.subs, VALIDATION_SUBS.length)}` : 'Validation run'}
        subtitle={runId}
        actions={
          <Button variant="flat" startContent={<ArrowLeft size={16} />} onPress={() => navigate('/validation/history')}>
            Run history
          </Button>
        }
      />
      {run ? (
        <div className="flex flex-col gap-4">
          <RunSummaryCard run={run} />
          <RunResults run={run} />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <LoadingState />
      )}
    </div>
  );
}
