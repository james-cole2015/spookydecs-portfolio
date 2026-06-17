/**
 * EnrichmentPanel — the "Ask Igor" UI (#334 task 9).
 *
 * Trigger → POST /ideas/{id}/enrich (202, optimistic in_progress) → poll
 * GET /ideas/{id} every 4s (≈75-tick / 5-min cap) → render the agent_enrichment
 * contract (photos, purchase_links, materials, instructions, estimated_cost,
 * tags) with loading / partial / failed states. The polling interval is cleaned
 * up on unmount and when the status leaves in_progress.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Accordion, AccordionItem, Button, Chip, Spinner } from '@heroui/react';
import { Wand2, RefreshCw } from 'lucide-react';
import { PhotoLightbox, useToast, type LightboxPhoto } from '@spookydecs/ui';
import { getIdea, startEnrichment } from '../api/ideasApi';
import type { AgentEnrichment, EnrichmentLink, EnrichmentStep } from '../config/ideasConfig';

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_TICKS = 75; // ~5 min

const SUB_AGENT_ROWS = [
  { key: 'photos', label: 'Photos' },
  { key: 'purchase_links', label: 'Purchase Links' },
  { key: 'research', label: 'Research' },
];

function titleCase(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function SubAgentChip({ state }: { state: string }) {
  const map: Record<string, { color: 'default' | 'success' | 'danger' | 'warning'; label: string }> = {
    pending: { color: 'warning', label: 'Pending' },
    complete: { color: 'success', label: '✓ Complete' },
    empty: { color: 'default', label: 'None found' },
    failed: { color: 'danger', label: '✗ Failed' },
  };
  const m = map[state] || { color: 'default' as const, label: state };
  return (
    <Chip size="sm" variant="flat" color={m.color}>
      {m.label}
    </Chip>
  );
}

function SubAgentPanel({ subAgents }: { subAgents?: Record<string, string> }) {
  if (!subAgents) return null;
  return (
    <div className="flex flex-wrap gap-4 rounded-medium bg-default-100 px-4 py-3">
      {SUB_AGENT_ROWS.map((r) => (
        <div key={r.key} className="flex items-center gap-2">
          <span className="text-small text-default-500">{r.label}</span>
          <SubAgentChip state={subAgents[r.key] || 'pending'} />
        </div>
      ))}
    </div>
  );
}

function PhotosBlock({ photos }: { photos: NonNullable<AgentEnrichment['photos']> }) {
  const lb: LightboxPhoto[] = photos.map((p) => ({ url: p.url, alt: p.alt, caption: p.source }));
  return (
    <Block label="Photos">
      <PhotoLightbox
        photos={lb}
        className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2"
        thumbnailClassName="aspect-square h-full w-full rounded-medium object-cover"
      />
    </Block>
  );
}

function LinksBlock({ links }: { links: EnrichmentLink[] }) {
  const byCategory: Record<string, EnrichmentLink[]> = {};
  for (const l of links) {
    const cat = titleCase(l.category || 'Other');
    (byCategory[cat] ||= []).push(l);
  }
  return (
    <Block label="Purchase Links">
      <div className="flex flex-col gap-4">
        {Object.entries(byCategory).map(([cat, items]) => (
          <LinkGroup key={cat} category={cat} items={items} />
        ))}
      </div>
    </Block>
  );
}

function LinkGroup({ category, items }: { category: string; items: EnrichmentLink[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 3);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-tiny font-semibold uppercase tracking-wide text-default-400">{category}</p>
      {visible.map((l, i) => (
        <div key={i} className="flex items-center gap-2 text-small">
          <span className="font-medium text-foreground">{l.retailer}</span>
          <span className="flex-1 truncate text-default-500">{l.product}</span>
          {l.price_usd != null && (
            <span className="text-default-400">${Number(l.price_usd).toFixed(2)}</span>
          )}
          <a
            href={l.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Buy ↗
          </a>
        </div>
      ))}
      {items.length > 3 && (
        <Button size="sm" variant="light" className="w-fit" onPress={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : `Show ${items.length - 3} more`}
        </Button>
      )}
    </div>
  );
}

function MaterialsBlock({ materials }: { materials: NonNullable<AgentEnrichment['materials']> }) {
  return (
    <Block label="Materials">
      <ul className="list-disc pl-5 text-small text-default-600">
        {materials.map((m, i) => {
          const meta = [m.quantity, m.notes].filter(Boolean).join(' — ');
          return (
            <li key={i}>
              {m.item}
              {meta && <span className="text-default-400"> · {meta}</span>}
            </li>
          );
        })}
      </ul>
    </Block>
  );
}

function InstructionsBlock({ steps }: { steps: EnrichmentStep[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? steps : steps.slice(0, 3);
  return (
    <Block label="Instructions">
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-small">
        {visible.map((s, i) => (
          <li key={i}>
            <span className="font-medium text-foreground">{s.title || `Step ${s.step ?? i + 1}`}</span>
            {s.detail && <p className="text-default-500">{s.detail}</p>}
          </li>
        ))}
      </ol>
      {steps.length > 3 && (
        <Button size="sm" variant="light" className="w-fit" onPress={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : `Show ${steps.length - 3} more steps`}
        </Button>
      )}
    </Block>
  );
}

function CostBlock({ cost }: { cost: NonNullable<AgentEnrichment['estimated_cost']> }) {
  const { diy_build: diy, pre_made_alternative: pre } = cost;
  if (!diy && !pre) return null;
  const row = (label: string, obj?: { range_usd?: string; notes?: string }) =>
    obj ? (
      <div className="flex flex-col gap-0.5 rounded-medium bg-default-100 px-3 py-2">
        <span className="text-tiny uppercase tracking-wide text-default-400">{label}</span>
        <span className="text-medium font-semibold text-foreground">{obj.range_usd}</span>
        {obj.notes && <span className="text-tiny text-default-400">{obj.notes}</span>}
      </div>
    ) : null;
  return (
    <Block label="Estimated Cost">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {row('DIY Build', diy)}
        {row('Pre-made', pre)}
      </div>
    </Block>
  );
}

function TagsBlock({ tags }: { tags: string[] }) {
  return (
    <Block label="AI-Suggested Tags">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Chip key={t} size="sm" variant="flat" color="secondary">
            {t}
          </Chip>
        ))}
      </div>
    </Block>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-small font-semibold text-foreground">{label}</p>
      {children}
    </div>
  );
}

function hasAnyResults(ae: AgentEnrichment): boolean {
  return Boolean(
    ae.photos?.length ||
      ae.purchase_links?.length ||
      ae.materials?.length ||
      ae.instructions?.length ||
      ae.estimated_cost?.diy_build ||
      ae.estimated_cost?.pre_made_alternative ||
      ae.tags?.length,
  );
}

export function EnrichmentPanel({
  ideaId,
  initial,
}: {
  ideaId: string;
  initial?: AgentEnrichment;
}) {
  const toast = useToast();
  const [ae, setAe] = useState<AgentEnrichment | undefined>(initial);
  const [starting, setStarting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        const refreshed = await getIdea(ideaId);
        const next = refreshed?.agent_enrichment;
        if (!next) return;
        setAe(next);
        if (next.status !== 'in_progress') stopPolling();
      } catch {
        /* silent — retry next tick */
      }
    }, POLL_INTERVAL_MS);
  }, [ideaId, stopPolling]);

  // Resume polling if we mount mid-flight; always clean up on unmount.
  useEffect(() => {
    if (initial?.status === 'in_progress') startPolling();
    return stopPolling;
  }, [initial?.status, startPolling, stopPolling]);

  async function handleEnrich() {
    setStarting(true);
    setTimedOut(false);
    try {
      await startEnrichment(ideaId);
      setAe({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        sub_agents: { photos: 'pending', purchase_links: 'pending', research: 'pending' },
      });
      startPolling();
    } catch (err) {
      toast.showError((err as Error).message || 'Igor failed to start');
    } finally {
      setStarting(false);
    }
  }

  const status = ae?.status;

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Wand2 size={18} className="text-secondary" />
        <h3 className="text-medium font-semibold text-foreground">Ask Igor</h3>
      </div>
      {status === 'in_progress' && (
        <Chip size="sm" variant="flat" color="warning" startContent={<Spinner size="sm" color="warning" />}>
          Igor is researching…
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
      {status === 'failed' && (
        <Chip size="sm" variant="flat" color="danger">
          Failed
        </Chip>
      )}
    </div>
  );

  return (
    <Accordion variant="bordered" defaultExpandedKeys={status ? ['igor'] : []}>
      <AccordionItem key="igor" aria-label="Ask Igor" title={header}>
        <div className="flex flex-col gap-4 pb-2">
          {!status && (
            <>
              <p className="text-small text-default-500">
                Igor researches the web to gather reference photos, purchase links, materials, build
                instructions, and a cost estimate for this idea.
              </p>
              <Button
                color="secondary"
                startContent={<Wand2 size={16} />}
                onPress={handleEnrich}
                isLoading={starting}
                className="w-fit"
              >
                Ask Igor
              </Button>
            </>
          )}

          {status === 'in_progress' && (
            <>
              <SubAgentPanel subAgents={ae?.sub_agents} />
              {timedOut && (
                <p className="text-small text-default-400">
                  Igor is still researching — refresh to check the latest status.
                </p>
              )}
            </>
          )}

          {(status === 'complete' || status === 'partial') && ae && (
            <>
              <div className="flex items-center justify-between">
                <SubAgentPanel subAgents={ae.sub_agents} />
                <Button
                  size="sm"
                  variant="bordered"
                  startContent={<RefreshCw size={14} />}
                  onPress={handleEnrich}
                  isLoading={starting}
                >
                  Re-fetch
                </Button>
              </div>
              {ae.photos?.length ? <PhotosBlock photos={ae.photos} /> : null}
              {ae.purchase_links?.length ? <LinksBlock links={ae.purchase_links} /> : null}
              {ae.materials?.length ? <MaterialsBlock materials={ae.materials} /> : null}
              {ae.instructions?.length ? <InstructionsBlock steps={ae.instructions} /> : null}
              {ae.estimated_cost ? <CostBlock cost={ae.estimated_cost} /> : null}
              {ae.tags?.length ? <TagsBlock tags={ae.tags} /> : null}
              {!hasAnyResults(ae) && (
                <p className="text-small text-default-400">
                  Igor didn’t turn up anything this time — ask again to retry.
                </p>
              )}
              {status === 'partial' && hasAnyResults(ae) && (
                <p className="text-small text-default-400">
                  Igor came up empty on some sources — ask again to retry.
                </p>
              )}
            </>
          )}

          {status === 'failed' && (
            <>
              <p className="text-small text-danger">
                Igor hit a snag — the response came back malformed. Try asking again.
              </p>
              <Button
                color="secondary"
                startContent={<RefreshCw size={16} />}
                onPress={handleEnrich}
                isLoading={starting}
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
