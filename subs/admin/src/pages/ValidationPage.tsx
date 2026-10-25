/**
 * Run Validation hub (#623): the ten holiday-readiness subs with what each does, the checks that guard it,
 * and the last recorded result. Includes the live readiness check (#680). Not available in the demo environment.
 */
import { Card, CardBody, Chip } from '@heroui/react';
import { ChevronRight } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { PageHeader, isDemoEnv } from '@spookydecs/ui';
import { VALIDATION_SUBS, overallStatus } from '../config/validationRegistry';
import ReadinessCheck from '../components/ReadinessCheck';

export default function ValidationPage() {
  if (isDemoEnv()) return <Navigate to="/" replace />;
  const { passing, total, latest } = overallStatus();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Run Validation"
        subtitle="Check that every sub still works end to end before the season. Pick a sub to see its checks."
        actions={
          <Chip color={passing === total ? 'success' : 'warning'} variant="flat">
            {passing} of {total} passing · last run {latest}
          </Chip>
        }
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
