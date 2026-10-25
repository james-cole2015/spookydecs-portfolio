/**
 * Holiday readiness check (#680): one press runs a GET-only sweep of every sub's read routes with the admin's
 * own session and shows pass/warn/fail per sub plus an overall verdict. Shows labels, status and timing only.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Accordion, AccordionItem, Button, Card, CardBody, CardHeader, Chip, Progress } from '@heroui/react';
import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import { useAuth, useConfig } from '@spookydecs/ui';
import { VALIDATION_SUBS, findValidationSub } from '../config/validationRegistry';
import { createGetOnlyFetch, runReadiness, summarize, type Outcome, type ReadinessReport, type Verdict } from '../lib/readinessRunner';

const VERDICT_COLOR: Record<Verdict, 'success' | 'warning' | 'danger'> = {
  Ready: 'success',
  'Ready with warnings': 'warning',
  'Not ready': 'danger',
  'Session expired': 'warning',
};
const OUTCOME_COLOR: Record<Outcome, 'success' | 'warning' | 'danger' | 'default'> = { pass: 'success', warn: 'warning', fail: 'danger', skipped: 'default' };

function OutcomeIcon({ outcome }: { outcome: Outcome }) {
  const props = { size: 16, 'aria-label': outcome } as const;
  if (outcome === 'pass') return <CheckCircle2 {...props} className="text-success" />;
  if (outcome === 'warn') return <AlertTriangle {...props} className="text-warning" />;
  if (outcome === 'fail') return <XCircle {...props} className="text-danger" />;
  return <MinusCircle {...props} className="text-default-400" />;
}

export default function ReadinessCheck() {
  const { API_ENDPOINT } = useConfig();
  const auth = useAuth();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [ranAt, setRanAt] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const environment = useMemo(() => {
    const claim = auth.claims?.['custom:env'];
    if (claim) return String(claim);
    return window.location.hostname.startsWith('dev-') ? 'dev' : 'prod';
  }, [auth.claims]);

  const run = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setProgress(0);
    setReport(null);
    setCopied(false);
    const allowedPaths = new Set(VALIDATION_SUBS.flatMap((s) => s.readChecks.map((c) => c.path)));
    const fetchGet = createGetOnlyFetch({ baseUrl: API_ENDPOINT, headers: () => auth.buildHeaders(), allowedPaths });
    const total = VALIDATION_SUBS.reduce((n, s) => n + s.readChecks.length, 0);
    const result = await runReadiness(VALIDATION_SUBS, fetchGet, {
      signal: controller.signal,
      onProgress: (done) => setProgress(Math.round((done / total) * 100)),
    });
    if (controller.signal.aborted) return;
    setReport(result);
    setRanAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setRunning(false);
  };

  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(summarize(report, environment, new Date().toISOString().slice(0, 10)));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card shadow="sm" className="mb-4">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Holiday readiness check</p>
          <p className="text-small text-default-500">
            Reads every sub&apos;s list routes with your session, right now. Read-only: it only sends GET requests and never shows record data.
          </p>
        </div>
        <div className="flex gap-2">
          {report && !running && (
            <Button variant="flat" onPress={copy}>
              {copied ? 'Copied' : 'Copy summary'}
            </Button>
          )}
          <Button color="primary" isLoading={running} onPress={run}>
            {report ? 'Re-run' : 'Run readiness check'}
          </Button>
        </div>
      </CardHeader>
      <CardBody className="gap-3">
        {running && <Progress aria-label="Readiness check progress" value={progress} color="primary" size="sm" />}
        {report && (
          <>
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              <Chip size="lg" color={VERDICT_COLOR[report.verdict]} variant="flat">
                {report.verdict}
              </Chip>
              <span className="text-small text-default-500">
                {environment} · {ranAt} · {report.counts.passed}/{report.counts.total} passed
                {report.counts.warned ? ` · ${report.counts.warned} warned` : ''}
                {report.counts.failed ? ` · ${report.counts.failed} failed` : ''}
                {report.counts.skipped ? ` · ${report.counts.skipped} skipped` : ''}
              </span>
            </div>
            {report.verdict === 'Session expired' && (
              <div className="flex flex-wrap items-center gap-3 text-small">
                <span>Your session expired. Log in again, then re-run.</span>
                <Button size="sm" color="primary" variant="flat" onPress={() => void auth.redirectToLogin()}>
                  Log in
                </Button>
              </div>
            )}
            {report.environmentMismatch && <p className="text-small text-warning">This session is scoped to a different environment.</p>}
            <Accordion variant="splitted" selectionMode="multiple">
              {report.subs.map((s) => {
                const name = findValidationSub(s.subId)?.name ?? s.subId;
                const passed = s.routes.filter((r) => r.outcome === 'pass').length;
                return (
                  <AccordionItem
                    key={s.subId}
                    aria-label={name}
                    title={
                      <span className="flex items-center gap-2">
                        <OutcomeIcon outcome={s.outcome} />
                        {name}
                      </span>
                    }
                    startContent={
                      <Chip size="sm" variant="flat" color={OUTCOME_COLOR[s.outcome]}>
                        {passed}/{s.routes.length}
                      </Chip>
                    }
                  >
                    <ul className="flex flex-col gap-1 pb-2">
                      {s.routes.map((r) => (
                        <li key={r.path} className="flex items-center gap-2 text-small">
                          <OutcomeIcon outcome={r.outcome} />
                          <span className="flex-1">{r.label}</span>
                          <span className="text-tiny text-default-400">
                            {r.status ?? '-'}
                            {r.hint ? ` · ${r.hint}` : ''} · {r.ms} ms
                          </span>
                        </li>
                      ))}
                    </ul>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        )}
      </CardBody>
    </Card>
  );
}
