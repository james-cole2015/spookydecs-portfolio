/**
 * Run Validation hub (#623): the ten holiday-readiness subs with what each does, the checks that guard it,
 * and the last recorded result. Includes the live readiness check (#680). Not available in the demo environment.
 */
import { useState } from 'react';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { ChevronRight, History, Play } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ConfirmDialog, PageHeader, isDemoEnv } from '@spookydecs/ui';
import { VALIDATION_SUBS, overallStatus } from '../config/validationRegistry';
import ReadinessCheck from '../components/ReadinessCheck';
import { useRunnerAvailable, useStartRun } from '../hooks/useValidationRun';

export default function ValidationPage() {
  const navigate = useNavigate();
  const runnerAvailable = useRunnerAvailable();
  const { start, starting, conflictRunId, error } = useStartRun();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isDemoEnv()) return <Navigate to="/" replace />;
  const { passing, total, latest } = overallStatus();

  const runAll = async () => {
    const runId = await start('all');
    setConfirmOpen(false);
    if (runId) navigate(`/validation/runs/${runId}`);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Run Validation"
        subtitle="Check that every sub still works end to end before the season. Pick a sub to see its checks."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Chip color={passing === total ? 'success' : 'warning'} variant="flat">
              {passing} of {total} passing · last run {latest}
            </Chip>
            {runnerAvailable && (
              <>
                <Button variant="flat" startContent={<History size={16} />} onPress={() => navigate('/validation/history')}>
                  Run history
                </Button>
                <Button color="primary" startContent={<Play size={16} />} onPress={() => setConfirmOpen(true)}>
                  Run all suites
                </Button>
              </>
            )}
          </div>
        }
      />
      {error && (
        <Card shadow="sm" className="mb-4 border border-warning">
          <CardBody className="flex-row flex-wrap items-center justify-between gap-2 text-small">
            <span>{error}</span>
            {conflictRunId && (
              <Link to={`/validation/runs/${conflictRunId}`} className="text-primary underline">
                View the active run
              </Link>
            )}
          </CardBody>
        </Card>
      )}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Run all suites on dev?"
        body="This runs every sub's browser and unit suites against the dev stack (about 20 to 30 minutes). The tests create and delete sentinel records in dev. Don't edit dev data or run local suites until it finishes."
        confirmLabel="Start run"
        isLoading={starting}
        onConfirm={runAll}
        onClose={() => setConfirmOpen(false)}
      />
      <ReadinessCheck />
      <Card shadow="sm">
        <CardBody className="p-0">
          <ul className="divide-y divide-divider">
            {VALIDATION_SUBS.map((sub) => {
              const ok = sub.lastRun.passed === sub.lastRun.total;
              return (
                <li key={sub.id}>
                  <Link
                    to={`/validation/${sub.id}`}
                    className="flex items-center gap-4 px-4 py-4 hover:bg-content2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{sub.name}</p>
                      <p className="text-small text-default-500">{sub.description}</p>
                      <p className="mt-1 text-tiny text-default-400">
                        {sub.browserChecks.length} browser check{sub.browserChecks.length === 1 ? '' : 's'} · {sub.unitSuites.length} unit suite
                        {sub.unitSuites.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Chip size="sm" variant="flat" color={ok ? 'success' : 'danger'}>
                      {sub.lastRun.passed}/{sub.lastRun.total} passed
                    </Chip>
                    <ChevronRight size={18} className="text-default-400" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
