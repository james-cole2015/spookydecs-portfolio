/**
 * Per-test results of a panel-started validation run (#679): a status header plus, per sub and suite, a table of
 * test title, status and duration. Failure text is the first line only (truncated server-side).
 */
import { Card, CardBody, CardHeader, Chip, Progress, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import {
  RUN_STATUS_COLOR,
  SUITE_LABEL,
  TEST_STATUS_COLOR,
  formatDuration,
  isTerminal,
  runDurationMs,
  sortResults,
  totals,
  type RunDetail,
} from '../lib/validationRunModel';

export function RunSummaryCard({ run }: { run: RunDetail }) {
  const t = totals(run.results);
  const active = !isTerminal(run.status);
  return (
    <Card shadow="sm">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Latest run</span>
        <Chip color={RUN_STATUS_COLOR[run.status]} variant="flat">
          {run.status}
        </Chip>
      </CardHeader>
      <CardBody className="gap-2">
        {active && <Progress isIndeterminate size="sm" aria-label="Run in progress" />}
        <p className="text-small text-default-500">
          Started {new Date(run.started_at).toLocaleString()} by {run.requested_by} · {formatDuration(runDurationMs(run.started_at, run.finished_at))}
          {t.total > 0 && ` · ${t.passed}/${t.total} passed${t.failed ? `, ${t.failed} failed` : ''}`}
        </p>
        {run.status === 'errored' && t.total === 0 && <p className="text-small text-warning">The runner ended without producing any results.</p>}
      </CardBody>
    </Card>
  );
}

export default function RunResults({ run }: { run: RunDetail }) {
  const results = sortResults(run.results);
  if (results.length === 0) {
    return <p className="text-small text-default-500">{isTerminal(run.status) ? 'No results were recorded.' : 'Waiting for results…'}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {results.map((r) => (
        <Card shadow="sm" key={`${r.sub}-${r.suite}`}>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">
              {r.sub} · {SUITE_LABEL[r.suite]}
            </span>
            <Chip size="sm" variant="flat" color={r.errored ? 'warning' : r.failed ? 'danger' : 'success'}>
              {r.errored ? 'no report' : `${r.passed}/${r.total} passed`}
            </Chip>
          </CardHeader>
          <CardBody className="p-0">
            {r.errored ? (
              <p className="px-4 py-3 text-small text-warning">{r.error || 'The suite did not produce a report.'}</p>
            ) : (
              <Table removeWrapper aria-label={`${r.sub} ${SUITE_LABEL[r.suite]} results`}>
                <TableHeader>
                  <TableColumn>Test</TableColumn>
                  <TableColumn width={110}>Status</TableColumn>
                  <TableColumn width={100} align="end">
                    Duration
                  </TableColumn>
                </TableHeader>
                <TableBody emptyContent="No tests recorded">
                  {r.tests.map((t, i) => (
                    <TableRow key={`${t.title}-${i}`}>
                      <TableCell>
                        <p className="text-small">{t.title}</p>
                        {t.error && <p className="mt-0.5 text-tiny text-danger">{t.error}</p>}
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={TEST_STATUS_COLOR[t.status]}>
                          {t.status}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-small text-default-500">{formatDuration(t.durationMs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
