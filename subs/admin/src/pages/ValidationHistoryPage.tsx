/**
 * Run history (#679): the last 20 panel-started validation runs, newest first. Dev only, never in demo.
 */
import { useEffect, useState } from 'react';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState, PageHeader, isDemoEnv } from '@spookydecs/ui';
import { listRuns } from '../api/validationApi';
import { VALIDATION_SUBS } from '../config/validationRegistry';
import { RUN_STATUS_COLOR, formatDuration, runDurationMs, subsLabel, type RunSummary } from '../lib/validationRunModel';

export default function ValidationHistoryPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoEnv()) return;
    listRuns()
      .then(setRuns)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load run history'));
  }, []);

  if (isDemoEnv()) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Run history"
        subtitle="The last 20 validation runs started from the panel, newest first."
        actions={
          <Button variant="flat" startContent={<ArrowLeft size={16} />} onPress={() => navigate('/validation')}>
            All subs
          </Button>
        }
      />
      {error ? (
        <ErrorState message={error} />
      ) : runs === null ? (
        <LoadingState />
      ) : runs.length === 0 ? (
        <EmptyState title="No runs yet" message="Start one from the Run Validation page." />
      ) : (
        <Card shadow="sm">
          <CardBody className="p-0">
            <ul className="divide-y divide-divider">
              {runs.map((run) => (
                <li key={run.run_id}>
                  <Link
                    to={`/validation/runs/${run.run_id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-content2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{subsLabel(run.subs, VALIDATION_SUBS.length)}</p>
                      <p className="text-tiny text-default-500">
                        {new Date(run.started_at).toLocaleString()} · {run.requested_by} · {formatDuration(runDurationMs(run.started_at, run.finished_at))}
                      </p>
                    </div>
                    <Chip size="sm" variant="flat" color={RUN_STATUS_COLOR[run.status]}>
                      {run.status}
                    </Chip>
                    <ChevronRight size={18} className="text-default-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
