import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { Breadcrumbs, EmptyState, ErrorState, LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import { getDeployment, getStagingTotes, stageItems, stageTote } from '../api/deploymentsApi';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Deployment } from '../config/deploymentsConfig';

interface Tote {
  id: string;
  /** Storage record display name (API field is `name`, e.g. "Fiery Reaper (Original Box)"). */
  name?: string;
  season?: string;
  location?: string;
  size?: string;
  contents_count?: number;
  contents?: string[];
  contents_details?: { id: string; short_name: string; class_type?: string; status?: string }[];
}

/** Large & Oversized (non-packable) item — lives in no storage unit, staged directly. */
interface NonPackableItem {
  id: string;
  short_name?: string;
  season?: string;
  location?: string;
  class_type?: string;
  status?: string;
}

function PropCard({
  item,
  isStaged,
  onStage,
}: {
  item: NonPackableItem;
  isStaged: boolean;
  onStage?: () => void;
}) {
  return (
    <Card className={isStaged ? 'opacity-90' : ''}>
      <CardBody className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground">{item.short_name || item.id}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {item.season && (
                <Chip size="sm" variant="flat">
                  {item.season}
                </Chip>
              )}
              {item.class_type && (
                <Chip size="sm" variant="flat">
                  {item.class_type}
                </Chip>
              )}
              {item.location && (
                <Chip size="sm" variant="flat">
                  {item.location}
                </Chip>
              )}
            </div>
          </div>
          {isStaged ? (
            <Chip color="success" variant="flat">
              ✓ Staged
            </Chip>
          ) : (
            <Button size="sm" color="primary" onPress={onStage}>
              Stage Item
            </Button>
          )}
        </div>
        <span className="text-sm text-default-500">{item.id}</span>
      </CardBody>
    </Card>
  );
}

function ToteCard({
  tote,
  isStaged,
  onStage,
}: {
  tote: Tote;
  isStaged: boolean;
  onStage?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const itemCount = tote.contents_count || 0;
  return (
    <Card className={isStaged ? 'opacity-90' : ''}>
      <CardBody className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground">{tote.name || tote.id}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {tote.season && (
                <Chip size="sm" variant="flat">
                  {tote.season}
                </Chip>
              )}
              {tote.location && (
                <Chip size="sm" variant="flat">
                  {tote.location}
                </Chip>
              )}
              {tote.size && (
                <Chip size="sm" variant="flat">
                  {tote.size}
                </Chip>
              )}
            </div>
          </div>
          {isStaged ? (
            <Chip color="success" variant="flat">
              ✓ Staged
            </Chip>
          ) : (
            <Button size="sm" color="primary" onPress={onStage}>
              Stage Tote
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-default-500">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
          {itemCount > 0 && (
            <Button size="sm" variant="light" onPress={() => setExpanded((v) => !v)}>
              {expanded ? 'Hide Items' : 'See Items'}
            </Button>
          )}
        </div>
        {expanded && (
          <ul className="flex flex-col gap-1 border-t border-default-200 pt-2 text-sm">
            {(tote.contents_details || []).length === 0 ? (
              <li className="text-default-500">No item details available.</li>
            ) : (
              (tote.contents_details || []).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="text-foreground">
                    {item.id}: {item.short_name}
                  </span>
                  <span className="text-xs text-default-400">{item.class_type || ''}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

export default function StagingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const deploymentId = id!;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [totes, setTotes] = useState<Tote[]>([]);
  const [stagedTotes, setStagedTotes] = useState<Tote[]>([]);
  const [nonPackable, setNonPackable] = useState<NonPackableItem[]>([]);
  const [stagedNonPackable, setStagedNonPackable] = useState<NonPackableItem[]>([]);
  const [confirmTote, setConfirmTote] = useState<Tote | null>(null);
  const [confirmItem, setConfirmItem] = useState<NonPackableItem | null>(null);
  const [staging, setStaging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [deploymentRes, totesRes] = await Promise.all([
          getDeployment(deploymentId),
          getStagingTotes(deploymentId),
        ]);
        if (cancelled) return;
        setDeployment(deploymentRes.data);
        setTotes(totesRes.data.totes || []);
        setStagedTotes(totesRes.data.staged_totes || []);
        setNonPackable(totesRes.data.non_packable_items || []);
        setStagedNonPackable(totesRes.data.staged_non_packable || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load staging area');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deploymentId]);

  async function handleStage() {
    if (!confirmTote) return;
    const tote = confirmTote;
    setStaging(true);
    try {
      await stageTote(deploymentId, { tote_id: tote.id, item_ids: tote.contents || [] });
      // Move the tote from available → staged, marking its items Staged.
      const stagedVersion: Tote = {
        ...tote,
        contents_details: (tote.contents_details || []).map((item) => ({
          ...item,
          status: (tote.contents || []).includes(item.id) ? 'Staged' : item.status,
        })),
      };
      setTotes((prev) => prev.filter((t) => t.id !== tote.id));
      setStagedTotes((prev) => [...prev, stagedVersion]);
      setConfirmTote(null);
    } catch (e: any) {
      console.error('[Staging] Stage failed:', e);
      toast.showError(e?.message || 'Failed to stage tote. Please try again.');
    } finally {
      setStaging(false);
    }
  }

  async function handleStageItem() {
    if (!confirmItem) return;
    const item = confirmItem;
    setStaging(true);
    try {
      await stageItems(deploymentId, [item.id]);
      // Move the item from available → staged.
      setNonPackable((prev) => prev.filter((i) => i.id !== item.id));
      setStagedNonPackable((prev) => [...prev, { ...item, status: 'Staged' }]);
      setConfirmItem(null);
    } catch (e: any) {
      console.error('[Staging] Stage item failed:', e);
      toast.showError(e?.message || 'Failed to stage item. Please try again.');
    } finally {
      setStaging(false);
    }
  }

  if (loading) return <LoadingState label="Loading staging area…" />;
  if (error) return <ErrorState message={error} onRetry={() => navigate(`/deployments/builder/${deploymentId}/zones`)} />;

  const seasonLabel = `${deployment?.season || ''} ${deployment?.year || ''}`.trim();

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/deployments' },
          { label: seasonLabel || deploymentId, to: `/deployments/builder/${deploymentId}/zones` },
          { label: 'Staging' },
        ]}
      />
      <PageHeader
        title="Staging Area"
        subtitle="Stage totes for deployment, or review what's already been staged."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Available to Stage</h2>
              <span className="text-sm text-default-500">
                {totes.length} tote{totes.length !== 1 ? 's' : ''}
              </span>
            </div>
            {totes.length === 0 ? (
              <EmptyState icon="📦" title="No totes available to stage." />
            ) : (
              <div className="flex flex-col gap-3">
                {totes.map((tote) => (
                  <ToteCard key={tote.id} tote={tote} isStaged={false} onStage={() => setConfirmTote(tote)} />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Large &amp; Oversized</h2>
              <span className="text-sm text-default-500">
                {nonPackable.length} item{nonPackable.length !== 1 ? 's' : ''}
              </span>
            </div>
            {nonPackable.length === 0 ? (
              <EmptyState icon="🎃" title="No oversized items available to stage." />
            ) : (
              <div className="flex flex-col gap-3">
                {nonPackable.map((item) => (
                  <PropCard key={item.id} item={item} isStaged={false} onStage={() => setConfirmItem(item)} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Already Staged</h2>
            <span className="text-sm text-default-500">
              {stagedTotes.length + stagedNonPackable.length} item
              {stagedTotes.length + stagedNonPackable.length !== 1 ? 's' : ''}
            </span>
          </div>
          {stagedTotes.length === 0 && stagedNonPackable.length === 0 ? (
            <EmptyState icon="✅" title="Nothing has been staged yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {stagedTotes.map((tote) => (
                <ToteCard key={tote.id} tote={tote} isStaged />
              ))}
              {stagedNonPackable.map((item) => (
                <PropCard key={item.id} item={item} isStaged />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmTote}
        title={`Stage "${confirmTote?.name || confirmTote?.id || ''}"?`}
        body={`This will mark ${confirmTote?.contents?.length || 0} item${
          (confirmTote?.contents?.length || 0) !== 1 ? 's' : ''
        } as Staged and open the tote.`}
        confirmLabel="Stage Tote"
        isLoading={staging}
        onConfirm={handleStage}
        onClose={() => setConfirmTote(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmItem}
        title={`Stage "${confirmItem?.short_name || confirmItem?.id || ''}"?`}
        body="This will mark this Large & Oversized item as Staged, making it available to place or connect in the deployment."
        confirmLabel="Stage Item"
        isLoading={staging}
        onConfirm={handleStageItem}
        onClose={() => setConfirmItem(null)}
      />
    </>
  );
}
