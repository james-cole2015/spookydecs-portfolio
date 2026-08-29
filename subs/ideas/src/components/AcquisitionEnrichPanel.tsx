/**
 * AcquisitionEnrichPanel — the "Ask Renfield" UI (W8, #499).
 *
 * A scoped-down fork of the Igor EnrichmentPanel: a single agent (no sub-agent
 * fan-out) against the acquisitions enrichment contract. Trigger → POST
 * /acquisitions/{id}/enrich (202, optimistic in_progress) → poll GET
 * /acquisitions/{id} → render the enrichment status. On any terminal status
 * the poller stops and calls onUpdate(refreshed) so the detail page's
 * acquisition state — and thus the purchase wizard's prefill from
 * target_attributes — refreshes.
 *
 * Polling (via the shared useResumablePoll hook, #396/#572) is elapsed-time
 * based (from enrichment.started_at), not tick counted, so a remount
 * mid-flight resumes in the correct phase. The Renfield worker
 * (sd_acquisitions_enrich_worker) shares Igor's 900s Lambda timeout, so this
 * uses the same fast/slow/ceiling cadence as EnrichmentPanel. Past the
 * ceiling, automatic polling stops and a manual "Check now" button takes over.
 *
 * Contract: docs-spookydecs/acquisitions_agent_docs/enrichment_output_contract.md
 */
import { useEffect, useRef, useState } from 'react';
import { Accordion, AccordionItem, Button, Chip, Spinner } from '@heroui/react';
import { Wand2, RefreshCw, Info } from 'lucide-react';
import { useResumablePoll, useToast } from '@spookydecs/ui';
import { getAcquisition, startEnrichment } from '../api/acquisitionsApi';
import type { Acquisition, AcquisitionEnrichment } from '../config/acquisitionsConfig';

const POLL_FAST_INTERVAL_MS = 4000;
const POLL_FAST_PHASE_MS = 2 * 60 * 1000; // 2 min
const POLL_SLOW_INTERVAL_MS = 20 * 1000;
const POLL_CEILING_MS = 930 * 1000; // just past the worker's 900s Lambda timeout

const TERMINAL = new Set(['complete', 'partial', 'out_of_scope', 'failed']);

function isTerminal(status?: string): boolean {
  return status != null && TERMINAL.has(status);
}

// A field row for the complete/partial read-out: value present, or explicitly "not
// found" so the user can see what Renfield missed (not just what it got). `value`
// is '' when Renfield returned nothing for that field.
type FieldRow = { label: string; value: string };

// Build the full expected-field list from target_attributes — every field Renfield
// targets, whether or not it came back populated. Class/Type/Price/Manufacturer plus
// any class-specific specs. Description is rendered separately (it's long-form).
function fieldRows(ta: Record<string, unknown> | undefined): FieldRow[] {
  const t = ta || {};
  const rows: FieldRow[] = [];
  rows.push({ label: 'Class', value: [t.class, t.class_type].filter(Boolean).join(' · ') });
  // Price may be a legacy display string ("$149.99") on records enriched before the
  // worker's _coerce_price fix — sanitize before formatting so we never render "$NaN".
  const priceNum = t.price == null ? NaN : Number(String(t.price).replace(/[^0-9.-]/g, ''));
  rows.push({ label: 'Price', value: Number.isFinite(priceNum) ? `$${priceNum.toFixed(2)}` : '' });
  rows.push({ label: 'Retailer', value: t.retailer ? String(t.retailer) : '' });
  rows.push({ label: 'Manufacturer', value: t.manufacturer ? String(t.manufacturer) : '' });
  const specs = t.specs as Record<string, unknown> | undefined;
  if (specs && typeof specs === 'object') {
    for (const [k, v] of Object.entries(specs)) {
      if (v != null && v !== '') rows.push({ label: titleCase(k), value: String(v) });
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
}: {
  acquisition: Acquisition;
  onUpdate: (a: Acquisition) => void;
}) {
  const toast = useToast();
  const id = acquisition.acquisition_id;
  const [enrichment, setEnrichment] = useState<AcquisitionEnrichment | undefined>(
    acquisition.enrichment,
  );
  const [starting, setStarting] = useState(false);
  // Controlled accordion: open while mounting mid-flight (in_progress), else collapsed —
  // so revisiting an already-enriched record starts closed and a fresh run opens on trigger.
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() =>
    acquisition.enrichment?.status === 'in_progress' ? new Set(['renfield']) : new Set(),
  );
  const prevStatusRef = useRef<string | undefined>(acquisition.enrichment?.status);
  const hasUrl = Boolean(acquisition.url?.trim());

  const { pastCeiling, checkingNow, startPolling, stopPolling, checkNow } = useResumablePoll({
    fastIntervalMs: POLL_FAST_INTERVAL_MS,
    fastPhaseMs: POLL_FAST_PHASE_MS,
    slowIntervalMs: POLL_SLOW_INTERVAL_MS,
    ceilingMs: POLL_CEILING_MS,
    checkNow: async () => {
      const refreshed = await getAcquisition(id);
      const next = refreshed?.enrichment;
      if (!refreshed || !next) return false;
      setEnrichment(next);
      if (isTerminal(next.status)) {
        onUpdate(refreshed); // refresh page state → wizard prefill sees target_attributes
        return true;
      }
      return false;
    },
  });

  // Resume polling if we mount mid-flight (from the record's own started_at,
  // so we land in the correct phase); always clean up on unmount.
  useEffect(() => {
    const enr = acquisition.enrichment;
    if (enr?.status === 'in_progress' && enr.started_at) startPolling(enr.started_at);
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acquisition.enrichment?.status, acquisition.enrichment?.started_at]);

  // Auto-collapse once Renfield finishes: on the in_progress → terminal transition, close
  // the panel (the findings live on the detail page below). Gated on the transition so a
  // user re-opening a completed panel isn't snapped shut on the next render.
  useEffect(() => {
    const s = enrichment?.status;
    if (isTerminal(s) && !isTerminal(prevStatusRef.current)) {
      setExpandedKeys(new Set());
    }
    prevStatusRef.current = s;
  }, [enrichment?.status]);

  async function handleEnrich() {
    if (!hasUrl) return;
    setStarting(true);
    setExpandedKeys(new Set(['renfield'])); // open so the user sees the in-progress state
    try {
      await startEnrichment(id);
      const startedAt = new Date().toISOString();
      setEnrichment({ status: 'in_progress', started_at: startedAt });
      startPolling(startedAt);
    } catch (err) {
      toast.showError((err as Error).message || 'Renfield failed to start');
    } finally {
      setStarting(false);
    }
  }

  const status = enrichment?.status;
  const showResult = status === 'complete' || status === 'partial';
  const ta = acquisition.target_attributes as Record<string, unknown> | undefined;
  const rows = showResult ? fieldRows(ta) : [];
  const description = showResult && ta?.description ? String(ta.description) : '';
  const foundCount = rows.filter((r) => r.value).length + (description ? 1 : 0);
  const totalCount = rows.length + 1; // +1 for Description

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
    <Accordion
      variant="bordered"
      selectedKeys={expandedKeys}
      onSelectionChange={(keys) => setExpandedKeys(keys as Set<string>)}
    >
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
              {pastCeiling && (
                <div className="flex items-center gap-2">
                  <p className="text-small text-default-400">
                    Renfield is taking longer than usual — this can happen on a detailed listing.
                  </p>
                  <Button
                    size="sm"
                    variant="light"
                    startContent={<RefreshCw size={14} />}
                    onPress={checkNow}
                    isLoading={checkingNow}
                  >
                    Check now
                  </Button>
                </div>
              )}
            </>
          )}

          {showResult && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-small text-default-500">
                  Renfield found <span className="font-medium text-foreground">{foundCount}</span> of{' '}
                  {totalCount} fields.
                  {status === 'partial'
                    ? ' Fill in the rest in the purchase wizard.'
                    : ' Prefill is ready.'}
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
              <div className="flex gap-3">
                {acquisition.image && (
                  <img
                    src={acquisition.image}
                    alt="Product"
                    className="h-24 w-24 shrink-0 rounded-medium border border-default-200 object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <dl className="grid flex-1 grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 rounded-medium bg-default-100 px-4 py-3 text-small">
                  {rows.map(({ label, value }) => (
                    <div key={label} className="contents">
                      <dt className="text-default-400">{label}</dt>
                      {value ? (
                        <dd className="text-foreground">{value}</dd>
                      ) : (
                        <dd className="italic text-default-300">Not found</dd>
                      )}
                    </div>
                  ))}
                  <div className="contents">
                    <dt className="text-default-400">Description</dt>
                    {description ? (
                      <dd className="text-foreground">{description}</dd>
                    ) : (
                      <dd className="italic text-default-300">Not found</dd>
                    )}
                  </div>
                </dl>
              </div>
              <p className="text-tiny text-default-400">
                Use <span className="font-medium text-default-500">Purchase</span> below to review
                and confirm these details.
              </p>
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
