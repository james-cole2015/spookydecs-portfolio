/**
 * One sub's validation checks (#623): what the browser suite proves, the Lambda suites behind it, the command to
 * re-run it, and the last recorded result. Stage 1 is read-only; "Run all" arrives with the live checks.
 */
import { Button, Card, CardBody, CardHeader, Chip, Snippet } from '@heroui/react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageHeader, isDemoEnv } from '@spookydecs/ui';
import { findValidationSub } from '../config/validationRegistry';

export default function ValidationSubPage() {
  const { sub: subId } = useParams();
  const navigate = useNavigate();
  const sub = findValidationSub(subId);

  if (isDemoEnv()) return <Navigate to="/" replace />;
  if (!sub) return <Navigate to="/validation" replace />;

  const ok = sub.lastRun.passed === sub.lastRun.total;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={sub.name}
        subtitle={sub.description}
        actions={
          <Button variant="flat" startContent={<ArrowLeft size={16} />} onPress={() => navigate('/validation')}>
            All subs
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        {sub.readiness && (
          <Card shadow="sm">
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">Last health check</span>
              <Chip color={sub.readiness.passed === sub.readiness.total ? 'success' : 'warning'} variant="flat">
                {sub.readiness.passed}/{sub.readiness.total} passed · {sub.readiness.date} · {sub.readiness.environment}
              </Chip>
            </CardHeader>
          </Card>
        )}
        <Card shadow="sm">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">Last recorded run</span>
            <Chip color={ok ? 'success' : 'danger'} variant="flat">
              {sub.lastRun.passed}/{sub.lastRun.total} passed · {sub.lastRun.date} · {sub.lastRun.environment}
            </Chip>
          </CardHeader>
          <CardBody className="gap-2">
            <p className="text-small text-default-500">Re-run from the Portfolio repo with:</p>
            <Snippet hideSymbol size="sm" variant="flat">
              {sub.browserCommand}
            </Snippet>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader className="font-semibold">Browser checks</CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-divider">
              {sub.browserChecks.map((check) => (
                <li key={check} className="flex items-start gap-3 px-4 py-3">
                  {ok ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-label="Passed" />
                  ) : (
                    <XCircle size={18} className="mt-0.5 shrink-0 text-danger" aria-label="Failed" />
                  )}
                  <span className="text-small">{check}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader className="font-semibold">Lambda unit suites</CardHeader>
          <CardBody className="gap-1">
            {sub.unitSuites.map((suite) => (
              <p key={suite} className="text-small">
                {suite}
              </p>
            ))}
            <p className="text-tiny text-default-400">Run in the lambdas repo with pytest; they run on every pull request.</p>
          </CardBody>
        </Card>

        <p className="text-tiny text-default-400">
          The live read-only health check for every sub runs from the Run Validation page. <Link to="/validation" className="text-primary underline">Back to all subs</Link>
        </p>
      </div>
    </div>
  );
}
