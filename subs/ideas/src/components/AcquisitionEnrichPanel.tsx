/**
 * AcquisitionEnrichPanel — the "Ask Renfield" UI (W8, #499).
 *
 * A scoped-down fork of the Igor EnrichmentPanel: a single agent (no sub-agent
 * fan-out) against the acquisitions enrichment contract. Trigger → POST
 * /acquisitions/{id}/enrich (202, optimistic in_progress) → poll GET
 * /acquisitions/{id} every 4s (~75-tick / 5-min cap) → render the enrichment
 * status. On any terminal status the poller stops and calls onUpdate(refreshed)
 * so the detail page's acquisition state — and thus the purchase wizard's prefill
 * from target_attributes — refreshes. The interval is cleaned up on unmount and
 * when the status leaves in_progress.
 *
 * Contract: docs-spookydecs/acquisitions_agent_docs/enrichment_output_contract.md
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Accordion, AccordionItem, Button, Chip, Spinner } from '@heroui/react';
import { Wand2, RefreshCw, ShoppingCart, Info } from 'lucide-react';
import { useToast } from '@spookydecs/ui';
import { getAcquisition, startEnrichment } from '../api/acquisitionsApi';
import type { Acquisition, AcquisitionEnrichment } from '../config/acquisitionsConfig';

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_TICKS = 75; // ~5 min

const TERMINAL = new Set(['complete', 'partial', 'out_of_scope', 'failed']);

function isTerminal(status?: string): boolean {
  return status != null && TERMINAL.has(status);
}

// Compact key→value rows from target_attributes for the complete/partial summary.
function summaryRows(ta: Record<string, unknown> | undefined): Array<[string, string]> {
  if (!ta) return [];
  const rows: Array<[string, string]> = [];
  const push = (label: string, v: unknown) => {
    if (v == null || v === '') return;
    rows.push([label, String(v)]);
  };
  const cls = [ta.class, ta.class_type].filter(Boolean).join(' · ');
  if (cls) rows.push(['Class', cls]);
  push('Price', ta.price != null ? `$${Number(ta.price).toFixed(2)}` : undefined);
  push('Manufacturer', ta.manufacturer);
  const specs = ta.specs as Record<string, unknown> | undefined;
  if (specs && typeof specs === 'object') {
    for (const [k, v] of Object.entries(specs)) {
      if (v != null && v !== '') rows.push([titleCase(k), String(v)]);
    }
  }
  return rows;
}

function titleCase(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AcquisitionEnrichPanel({
  acquisition,
  onUpdate,
  onPurchase,
}: {
  acquisition: Acquisition;
  onUpdate: (a: Acquisition) => void;
  onPurchase: () => void;
}) {
  const toast = useToast();
  const id = acquisition.acquisition_id;
  const [enrichment, setEnrichment] = useState<AcquisitionEnrichment | undefined>(
    acquisition.enrichment,
  );
  const [starting, setStarting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasUrl = Boolean(acquisition.url?.trim());

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    let ticks = 0;
    intervalRef.current = setInterval(async () => {
      ticks++;
      if (ticks >= POLL_MAX_TICKS) {
        stopPolling();
        setTimedOut(true);
        return;
      }
      try {
        const refreshed = await getAcquisition(id);
        const next = refreshed?.enrichment;
        if (!refreshed || !next) return;
        setEnrichment(next);
        if (isTerminal(next.status)) {
          stopPolling();
          onUpdate(refreshed); // refresh page state → wizard prefill sees target_attributes
        }
      } catch {
        /* silent — retry next tick */
      }
    }, POLL_INTERVAL_MS);
  }, [id, stopPolling, onUpdate]);

  // Resume polling if we mount mid-flight; always clean up on unmount.
  useEffect(() => {
    if (acquisition.enrichment?.status === 'in_progress') startPolling();
    return stopPolling;
  }, [acquisition.enrichment?.status, startPolling, stopPolling]);

  async function handleEnrich() {
    if (!hasUrl) return;
    setStarting(true);
    setTimedOut(false);
    try {
      await startEnrichment(id);
      setEnrichment({ status: 'in_progress', started_at: new Date().toISOString() });
      startPolling();
    } catch (err) {
      toast.showError((err as Error).message || 'Renfield failed to start');
    } finally {
      setStarting(false);
    }
  }

  const status = enrichment?.status;
  const rows = status === 'complete' || status === 'partial' ? summaryRows(acquisition.target_attributes) : [];

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Wand2 size={18} className="text-secondary" />
        <h3 className="text-medium font-semibold text-foreground">Ask Renfield</h3>
      </div>
      {status === 'in_progress' && (
        <Chip size="sm" variant="flat" color="warning" startContent={<Spinner size="sm" color="warning" />}>
          Renfield is researching…
        </Chip>
      )}
      {status === 'complete' && (
        <Chip size="sm" variant="flat" color="success">
          Complete
        </Chip>
      )}
      {status === 'partial' && (
        <Chip size="sm" variant="flat" color="warning">
          Partial
        </Chip>
      )}
      {status === 'out_of_scope' && (
        <Chip size="sm" variant="flat" color="default">
          Out of scope
        </Chip>
      )}
      {status === 'failed' && (
        <Chip size="sm" variant="flat" color="danger">
          Failed
        </Chip>
      )}
    </div>
  );

  return (
    <Accordion variant="bordered" defaultExpandedKeys={status ? ['renfield'] : []}>
      <AccordionItem key="renfield" aria-label="Ask Renfield" title={header}>
        <div className="flex flex-col gap-4 pb-2">
          {!status && (
            <>
              <p className="text-small text-default-500">
                Renfield researches the product URL to classify the item and pre-fill the purchase
                wizard — class, type, price, manufacturer, and specs.
              </p>
              <Button
                color="secondary"
                startContent={<Wand2 size={16} />}
                onPress={handleEnrich}
                isLoading={starting}
                isDisabled={!hasUrl}
                className="w-fit"
              >
                Ask Renfield
              </Button>
              {!hasUrl && (
                <p className="text-small text-default-400">Add a product URL to enable enrichment.</p>
              )}
            </>
          )}

          {status === 'in_progress' && (
            <>
              <p className="text-small text-default-500">
                Renfield is researching the listing — this usually takes under a minute.
              </p>
              {timedOut && (
                <p className="text-small text-default-400">
                  Renfield is still researching — refresh to check the latest status.
                </p>
              )}
            </>
          )}

          {(status === 'complete' || status === 'partial') && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-small text-default-500">
                  {status === 'partial'
                    ? 'Renfield classified what it could — review and fill in the rest in the wizard.'
                    : 'Renfield classified this acquisition. Prefill is ready.'}
                </p>
                <Button
                  size="sm"
                  variant="bordered"
                  startContent={<RefreshCw size={14} />}
                  onPress={handleEnrich}
                  isLoading={starting}
                  isDisabled={!hasUrl}
                >
                  Re-fetch
                </Button>
              </div>
              {rows.length > 0 && (
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-medium bg-default-100 px-4 py-3 text-small">
                  {rows.map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-default-400">{label}</dt>
                      <dd className="text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <Button
                color="primary"
                startContent={<ShoppingCart size={16} />}
                onPress={onPurchase}
                className="w-fit"
              >
                Purchase (prefilled)
              </Button>
            </>
          )}

          {status === 'out_of_scope' && (
            <>
              <div className="flex items-start gap-2 rounded-medium bg-default-100 px-4 py-3">
                <Info size={16} className="mt-0.5 shrink-0 text-default-500" />
                <p className="text-small text-default-600">
                  Renfield judged this out of scope
                  {enrichment?.reason ? `: ${enrichment.reason}` : '.'}
                </p>
              </div>
              <Button
                size="sm"
                variant="bordered"
                startContent={<RefreshCw size={14} />}
                onPress={handleEnrich}
                isLoading={starting}
                isDisabled={!hasUrl}
                className="w-fit"
              >
                Re-fetch
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <p className="text-small text-danger">
                Renfield hit a snag{enrichment?.error ? `: ${enrichment.error}` : '.'} Try again.
              </p>
              <Button
                color="secondary"
                startContent={<RefreshCw size={16} />}
                onPress={handleEnrich}
                isLoading={starting}
                isDisabled={!hasUrl}
                className="w-fit"
              >
                Re-fetch
              </Button>
            </>
          )}
        </div>
      </AccordionItem>
    </Accordion>
  );
}
