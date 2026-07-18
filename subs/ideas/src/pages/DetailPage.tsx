// Idea detail — hero/gallery, enrichment, costs, photos, status transitions, delete.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip, Link } from '@heroui/react';
import { ArrowLeft, Pencil, Trash2, ArrowRight } from 'lucide-react';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  Breadcrumbs,
  PhotoGallery,
  PhotoLightbox,
  useToast,
  type LightboxPhoto,
  useConfirm,
} from '@spookydecs/ui';
import { getIdea, updateIdea, deleteIdea, previewIdeaCascade } from '../api/ideasApi';
import { ITEMS_BASE_URL, SEASON_PLACEHOLDERS, type Idea } from '../config/ideasConfig';
import { formatDate, heroImageUrl, normalizeMaterials } from '../lib/format';
import { SeasonChip, StatusChip } from '../components/chips';
import { EnrichmentPanel } from '../components/EnrichmentPanel';
import { CostsSection } from '../components/CostsSection';
import { CostLogModal } from '../components/CostLogModal';

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costRefresh, setCostRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    setNotFound(false);
    getIdea(id!)
      .then((fetched) => {
        if (!fetched) {
          setNotFound(true);
          return;
        }
        if (fetched.status === 'Workbench') {
          navigate(`/workbench/${fetched.id}`, { replace: true });
          return;
        }
        setIdea(fetched);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  async function transition(newStatus: Idea['status'], title: string, message: string, dest?: string) {
    const ok = await confirm({ title, body: message, confirmLabel: title });
    if (!ok) return;
    try {
      await updateIdea({ ...(idea as Idea), status: newStatus });
      toast.showSuccess(`Moved to ${newStatus}`);
      if (dest) navigate(dest);
      else {
        const refreshed = await getIdea(id!);
        if (refreshed) setIdea(refreshed);
      }
    } catch (err) {
      toast.showError('Failed: ' + (err as Error).message);
    }
  }

  async function handleDelete() {
    if (!idea) return;
    let extra = '';
    try {
      const preview = await previewIdeaCascade(idea.id);
      const costs = preview?.costs?.length ?? preview?.cost_count;
      const photos = preview?.photos?.length ?? preview?.photo_count;
      const bits = [
        costs ? `${costs} cost record${costs !== 1 ? 's' : ''}` : '',
        photos ? `${photos} photo${photos !== 1 ? 's' : ''}` : '',
      ].filter(Boolean);
      if (bits.length) extra = ` This will also remove ${bits.join(' and ')}.`;
    } catch {
      /* preview is best-effort */
    }
    const ok = await confirm({
      title: 'Delete Idea',
      body: `Are you sure you want to delete "${idea.title}"?${extra} This cannot be undone.`,
      confirmLabel: 'Delete',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteIdea(idea.id);
      toast.showSuccess('Idea deleted');
      navigate('/list');
    } catch (err) {
      toast.showError('Failed to delete: ' + (err as Error).message);
    }
  }

  if (loading) return <LoadingState />;
  if (error)
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  if (notFound || !idea)
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <EmptyState
          icon="💡"
          title="Idea Not Found"
          message={`No idea with ID ${id} could be found.`}
        />
        <div className="mt-4 flex justify-center">
          <Button color="primary" onPress={() => navigate('/list')}>
            Back to Ideas
          </Button>
        </div>
      </div>
    );

  const isBuilt = idea.status === 'Built';
  const locked = isBuilt && !!idea.item_id;
  const hero = heroImageUrl(idea.images, idea.link);
  const placeholder = SEASON_PLACEHOLDERS[(idea.season || 'shared').toLowerCase()] || SEASON_PLACEHOLDERS.shared;
  const images = idea.images || [];
  const lbPhotos: LightboxPhoto[] = images.map((url) => ({ url }));
  const materials = normalizeMaterials(idea.materials);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {dialog}
      <Breadcrumbs crumbs={[{ label: 'Ideas', to: '/list' }, { label: idea.title }]} />

      {/* Featured media */}
      <Card className="mb-4 overflow-hidden">
        <div className="aspect-video w-full bg-default-100">
          {hero ? (
            <img src={hero} alt={idea.title} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center p-12 text-default-300 [&_svg]:h-24 [&_svg]:w-24"
              dangerouslySetInnerHTML={{ __html: placeholder }}
            />
          )}
        </div>
      </Card>
      {images.length > 1 && (
        <PhotoLightbox
          photos={lbPhotos}
          className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2"
          thumbnailClassName="aspect-square h-full w-full rounded-medium object-cover"
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeasonChip season={idea.season} size="md" />
          <StatusChip status={idea.status} size="md" />
        </div>
        {locked && (
          <div className="flex flex-wrap items-center gap-2 rounded-medium bg-success/10 px-4 py-2 text-small text-success">
            ✓ Build complete — this idea is locked.
            <Link href={`${ITEMS_BASE_URL}/items/${idea.item_id}`} isExternal size="sm">
              View Item →
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{idea.title}</h1>
          <div className="flex flex-wrap gap-2">
            {!locked && (
              <Button
                size="sm"
                variant="flat"
                startContent={<Pencil size={15} />}
                onPress={() => navigate(`/${idea.id}/edit`)}
              >
                Edit
              </Button>
            )}
            {idea.status === 'Considering' && (
              <Button
                size="sm"
                color="warning"
                variant="flat"
                endContent={<ArrowRight size={15} />}
                onPress={() => transition('Planning', 'Move to Planning', `Move "${idea.title}" to Planning?`)}
              >
                Move to Planning
              </Button>
            )}
            {idea.status === 'Planning' && (
              <>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    transition('Considering', 'Back to Considering', `Move "${idea.title}" back to Considering?`)
                  }
                >
                  ← Back to Considering
                </Button>
                <Button
                  size="sm"
                  color="warning"
                  variant="flat"
                  endContent={<ArrowRight size={15} />}
                  onPress={() =>
                    transition(
                      'Workbench',
                      'Move to Workbench',
                      `Move "${idea.title}" to the Workbench? It will be tracked as an active build.`,
                      `/workbench/${idea.id}`,
                    )
                  }
                >
                  Move to Workbench
                </Button>
              </>
            )}
            {!locked && (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                startContent={<Trash2 size={15} />}
                onPress={handleDelete}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="font-semibold">Description</CardHeader>
            <CardBody>
              <p className={`text-small ${idea.description ? 'text-foreground/80' : 'text-default-400'}`}>
                {idea.description || 'No description provided.'}
              </p>
            </CardBody>
          </Card>

          {idea.notes && (
            <Card>
              <CardHeader className="font-semibold">Notes</CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-small text-foreground/80">{idea.notes}</p>
              </CardBody>
            </Card>
          )}

          {!isBuilt && <EnrichmentPanel ideaId={idea.id} initial={idea.agent_enrichment} />}

          <Card>
            <CardHeader className="font-semibold">Planning</CardHeader>
            <CardBody>
              <p className="mb-2 text-tiny font-semibold uppercase tracking-wide text-default-400">
                Materials
              </p>
              {materials.length ? (
                <ul className="flex flex-col gap-1 text-small">
                  {materials.map((m, i) => (
                    <li key={i} className={m.done ? 'text-default-400 line-through' : 'text-foreground/80'}>
                      {m.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-default-400">None listed</p>
              )}
            </CardBody>
          </Card>

          {idea.status !== 'Considering' && (
            <>
              <Card>
                <CardHeader className="font-semibold">Build</CardHeader>
                <CardBody className="gap-2">
                  <BuildField label="Prep Start" value={idea.prep_start} />
                  <BuildField label="Build Start" value={idea.build_start} />
                  <BuildField label="Build Complete" value={idea.build_complete} />
                  <div className="flex justify-between text-small">
                    <span className="text-default-500">Item ID</span>
                    {idea.item_id ? (
                      <Link href={`${ITEMS_BASE_URL}/items/${idea.item_id}`} isExternal size="sm">
                        {idea.item_id}
                      </Link>
                    ) : (
                      <span className="text-default-400">—</span>
                    )}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="flex items-center justify-between font-semibold">
                  Costs
                  <Button size="sm" color="primary" onPress={() => setCostModalOpen(true)}>
                    + Log Cost
                  </Button>
                </CardHeader>
                <CardBody>
                  <CostsSection ideaId={idea.id} refreshKey={costRefresh} />
                </CardBody>
              </Card>
            </>
          )}

          <Card>
            <CardHeader className="font-semibold">Photos</CardHeader>
            <CardBody>
              <PhotoGallery
                context="idea"
                entityId={idea.id}
                season={(idea.season || 'shared').toLowerCase()}
                photoType="inspiration"
                noSetPrimary={locked}
                enableUpload={!locked}
              />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="font-semibold">Info</CardHeader>
            <CardBody className="gap-3 text-small">
              <SidebarField label="Season" value={idea.season} />
              {idea.bucket && <SidebarField label="Build Season" value={idea.bucket} />}
              <SidebarField label="Status" value={idea.status} />
              <div className="flex flex-col gap-0.5">
                <span className="text-default-500">Link</span>
                {idea.link ? (
                  <Link href={idea.link} isExternal size="sm" className="break-all">
                    {idea.link}
                  </Link>
                ) : (
                  <span className="text-default-400">—</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-default-500">Tags</span>
                {idea.tags?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {idea.tags.map((t) => (
                      <Chip key={t} size="sm" variant="flat">
                        {t}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <span className="text-default-400">None</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-default-500">ID</span>
                <span className="break-all text-tiny text-default-400">{idea.id}</span>
              </div>
            </CardBody>
          </Card>

          {(idea.createdAt || idea.updatedAt) && (
            <div className="px-1 text-tiny text-default-400">
              {idea.createdAt && <div>Created: {formatDate(idea.createdAt)}</div>}
              {idea.updatedAt && <div>Updated: {formatDate(idea.updatedAt)}</div>}
            </div>
          )}
        </div>
      </div>

      <CostLogModal
        idea={idea}
        isOpen={costModalOpen}
        onClose={() => setCostModalOpen(false)}
        onSaved={() => setCostRefresh((n) => n + 1)}
      />
    </div>
  );
}

function BuildField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-small">
      <span className="text-default-500">{label}</span>
      <span className={value ? 'text-foreground/80' : 'text-default-400'}>
        {value ? formatDate(value) : '—'}
      </span>
    </div>
  );
}

function SidebarField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-default-500">{label}</span>
      <span className="text-foreground/80">{value}</span>
    </div>
  );
}
