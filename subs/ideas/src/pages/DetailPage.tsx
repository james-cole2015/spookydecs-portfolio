// Unified idea detail page (#597) — single route for all 5 statuses. Sections
// always render; per-field editable/readonly/hidden behavior and the
// Workbench-only pipeline nav/action bar are driven by fieldAvailability.ts,
// not by ad hoc idea.status conditionals scattered through JSX. Absorbs the
// former BuildDetailPage.tsx (deleted).
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Checkbox, Chip, Input, Link, Textarea } from '@heroui/react';
import { Pencil, Plus, Trash2, ArrowRight, X } from 'lucide-react';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  Breadcrumbs,
  PhotoGallery,
  PhotoLightbox,
  useToast,
  usePhotoUpload,
  type LightboxPhoto,
  useConfirm,
} from '@spookydecs/ui';
import { getIdea, updateIdea, deleteIdea, listIdeas, previewIdeaCascade, getIdeaPhotos } from '../api/ideasApi';
import {
  ITEMS_BASE_URL,
  MAX_ACTIVE_BUILDS,
  PIPELINE_STAGES,
  SEASON_PLACEHOLDERS,
  type Idea,
  type BuildInstructionStep,
  type BuildSession,
} from '../config/ideasConfig';
import { fieldMode, missingGateLabels } from '../config/fieldAvailability';
import { formatDate, formatDuration, heroImageUrl, normalizeMaterials } from '../lib/format';
import { SeasonChip, StatusChip } from '../components/chips';
import { EnrichmentPanel } from '../components/EnrichmentPanel';
import { CostsSection } from '../components/CostsSection';
import { CostLogModal } from '../components/CostLogModal';
import { InlineEdit } from '../components/InlineEdit';
import { BuildCompleteWizard } from '../components/BuildCompleteWizard';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { openWithEditor, editor } = usePhotoUpload();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costRefresh, setCostRefresh] = useState(0);
  const [activeBuildCount, setActiveBuildCount] = useState<number | null>(null);
  const [buildPhotos, setBuildPhotos] = useState<LightboxPhoto[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  const loadBuildPhotos = useCallback(async () => {
    if (!id) return;
    try {
      const list = await getIdeaPhotos(id, 'build');
      setBuildPhotos(list.map((p) => ({ url: p.cloudfront_url, thumbUrl: p.thumb_cloudfront_url || p.cloudfront_url })));
    } catch {
      /* leave empty */
    }
  }, [id]);

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
        setIdea(fetched);
        if (fetched.status === 'Planning') {
          listIdeas()
            .then((all) => setActiveBuildCount(all.filter((i) => i.status === 'Workbench').length))
            .catch(() => {
              /* button falls back to enabled; backend still enforces the cap */
            });
        }
        if (fieldMode('build_images', fetched.status) !== 'hidden') void loadBuildPhotos();
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, loadBuildPhotos]);

  // Persist a patch and merge into local state. title+season are always sent
  // (the backend PUT treats them as required, matching the vanilla calls).
  async function patchIdea(partial: Partial<Idea>) {
    if (!idea) return;
    try {
      await updateIdea({ id: idea.id, season: idea.season, title: idea.title, ...partial });
      setIdea({ ...idea, ...partial });
    } catch (err) {
      toast.showError('Failed to save: ' + (err as Error).message);
      throw err;
    }
  }

  async function transition(newStatus: Idea['status'], title: string, message: string) {
    if (!idea) return;
    const ok = await confirm({ title, body: message, confirmLabel: title });
    if (!ok) return;
    try {
      await updateIdea({ ...idea, status: newStatus });
      toast.showSuccess(`Moved to ${newStatus}`);
      const refreshed = await getIdea(idea.id);
      if (refreshed) setIdea(refreshed);
    } catch (err) {
      toast.showError('Failed: ' + (err as Error).message);
    }
  }

  // Pipeline-strip advance (Workbench only) — no confirm dialog, matches the
  // existing build-workspace UX for stepping through PIPELINE_STAGES.
  async function advanceTo(stage: Idea['status']) {
    if (!idea) return;
    try {
      await updateIdea({ id: idea.id, season: idea.season, title: idea.title, status: stage });
      toast.showSuccess(`Moved to ${stage}`);
      if (stage === 'Built') navigate('/');
      else {
        const refreshed = await getIdea(idea.id);
        if (refreshed) setIdea(refreshed);
      }
    } catch (err) {
      toast.showError('Failed: ' + (err as Error).message);
    }
  }

  async function handleAbandon() {
    if (!idea) return;
    const ok = await confirm({
      title: 'Abandon Build',
      body: `Abandon "${idea.title}"? It will be moved to Abandoned status.`,
      confirmLabel: 'Abandon',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await updateIdea({ id: idea.id, season: idea.season, title: idea.title, status: 'Abandoned' });
      toast.showSuccess('Build abandoned');
      navigate('/');
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

  async function addBuildPhotos() {
    if (!idea) return;
    const uploaded = await openWithEditor({
      context: 'idea',
      photo_type: 'build',
      entityId: idea.id,
      season: idea.season || 'Shared',
    });
    if (uploaded.length) {
      toast.showSuccess('Build photos saved');
      await loadBuildPhotos();
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
  const isWorkbench = idea.status === 'Workbench';
  const locked = isBuilt && !!idea.item_id;
  const hero = heroImageUrl(idea.images, idea.link);
  const placeholder = SEASON_PLACEHOLDERS[(idea.season || 'shared').toLowerCase()] || SEASON_PLACEHOLDERS.shared;
  const images = idea.images || [];
  const lbPhotos: LightboxPhoto[] = images.map((url) => ({ url }));
  const materials = normalizeMaterials(idea.materials);
  const sessions = [...(idea.build_sessions || [])].sort((a, b) =>
    (b.date || '').localeCompare(a.date || ''),
  );
  const currentPipelineIdx = PIPELINE_STAGES.indexOf(idea.status);

  const descriptionMode = fieldMode('description', idea.status);
  const materialsMode = fieldMode('materials', idea.status);
  const instructionsMode = fieldMode('build_instructions', idea.status);
  const costsMode = fieldMode('costs', idea.status);
  const sessionsMode = fieldMode('build_sessions', idea.status);
  const imagesMode = fieldMode('images', idea.status);
  const buildImagesMode = fieldMode('build_images', idea.status);
  const enrichmentReadOnly = fieldMode('agent_enrichment', idea.status) === 'readonly';

  const planningGateMissing = missingGateLabels(idea, 'Planning');
  const workbenchGateMissing = missingGateLabels(idea, 'Workbench');
  const atBuildCap = activeBuildCount !== null && activeBuildCount >= MAX_ACTIVE_BUILDS;

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

      {/* Pipeline nav (Workbench only) */}
      {isWorkbench && (
        <div className="mb-6 flex items-center gap-1">
          {PIPELINE_STAGES.map((stage, i) => {
            const isNext = i === currentPipelineIdx + 1;
            return (
              <div key={stage} className="flex flex-1 items-center gap-1">
                <button
                  type="button"
                  disabled={!isNext}
                  onClick={() => isNext && advanceTo(stage)}
                  title={isNext ? `Advance to ${stage}` : undefined}
                  className={`flex-1 rounded-medium px-2 py-1.5 text-center text-tiny transition-colors ${
                    i < currentPipelineIdx
                      ? 'bg-primary/20 text-primary'
                      : i === currentPipelineIdx
                      ? 'bg-primary text-white'
                      : isNext
                      ? 'cursor-pointer bg-default-100 text-default-500 hover:bg-primary/20 hover:text-primary'
                      : 'bg-default-100 text-default-300'
                  }`}
                >
                  {stage}
                </button>
              </div>
            );
          })}
        </div>
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
                isDisabled={planningGateMissing.length > 0}
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
                  isDisabled={workbenchGateMissing.length > 0 || atBuildCap}
                  onPress={() =>
                    transition(
                      'Workbench',
                      'Move to Workbench',
                      `Move "${idea.title}" to the Workbench? It will be tracked as an active build.`,
                    )
                  }
                >
                  {atBuildCap ? `Build Limit Reached (${MAX_ACTIVE_BUILDS}/${MAX_ACTIVE_BUILDS})` : 'Move to Workbench'}
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
        {idea.status === 'Considering' && planningGateMissing.length > 0 && (
          <p className="text-tiny text-default-400">Missing for Planning: {planningGateMissing.join(', ')}</p>
        )}
        {idea.status === 'Planning' && workbenchGateMissing.length > 0 && (
          <p className="text-tiny text-default-400">Missing for Workbench: {workbenchGateMissing.join(', ')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="font-semibold">Description</CardHeader>
            <CardBody>
              {descriptionMode === 'editable' ? (
                <InlineEdit
                  value={idea.description || ''}
                  type="textarea"
                  placeholder="Click to add a description…"
                  onSave={(v) => patchIdea({ description: v })}
                />
              ) : (
                <p className={`text-small ${idea.description ? 'text-foreground/80' : 'text-default-400'}`}>
                  {idea.description || 'No description provided.'}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="font-semibold">Notes</CardHeader>
            <CardBody>
              <InlineEdit
                value={idea.notes || ''}
                type="textarea"
                placeholder="Click to add notes…"
                onSave={(v) => patchIdea({ notes: v })}
              />
            </CardBody>
          </Card>

          <EnrichmentPanel ideaId={idea.id} initial={idea.agent_enrichment} readOnly={enrichmentReadOnly} />

          <Card>
            <CardHeader className="font-semibold">Build Instructions</CardHeader>
            <CardBody className="gap-3">
              {instructionsMode === 'editable' && (
                <InstructionStepForm
                  onAdd={(step) => {
                    const existing = idea.build_instructions || [];
                    patchIdea({ build_instructions: [...existing, { ...step, step: existing.length + 1 }] });
                  }}
                />
              )}
              {(idea.build_instructions || []).length === 0 ? (
                <p className="text-small text-default-400">No build instructions yet.</p>
              ) : (
                <ol className="flex flex-col gap-2 text-small">
                  {(idea.build_instructions || []).map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-medium text-foreground">{s.step ?? i + 1}.</span>
                      <div className="flex-1">
                        {s.title && <p className="font-medium text-foreground/80">{s.title}</p>}
                        {s.detail && <p className="whitespace-pre-wrap text-foreground/70">{s.detail}</p>}
                      </div>
                      {instructionsMode === 'editable' && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          aria-label="Remove step"
                          onPress={() =>
                            patchIdea({
                              build_instructions: (idea.build_instructions || []).filter((_, j) => j !== i),
                            })
                          }
                        >
                          <X size={15} />
                        </Button>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="font-semibold">Materials</CardHeader>
            <CardBody className="gap-3">
              {materials.length === 0 ? (
                <p className="text-small text-default-400">No materials listed yet.</p>
              ) : materialsMode === 'editable' ? (
                <div className="flex flex-col gap-1">
                  {materials.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox
                        isSelected={m.done}
                        onValueChange={(checked) => {
                          const next = materials.map((x, j) => (j === i ? { ...x, done: checked } : x));
                          void patchIdea({ materials: next });
                        }}
                      >
                        <span className={m.done ? 'text-default-400 line-through' : 'text-foreground/80'}>
                          {m.name}
                        </span>
                      </Checkbox>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label="Remove material"
                        className="ml-auto"
                        onPress={() => patchIdea({ materials: materials.filter((_, j) => j !== i) })}
                      >
                        <X size={15} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="flex flex-col gap-1 text-small">
                  {materials.map((m, i) => (
                    <li key={i} className={m.done ? 'text-default-400 line-through' : 'text-foreground/80'}>
                      {m.name}
                    </li>
                  ))}
                </ul>
              )}
              {materialsMode === 'editable' && (
                <AddMaterial onAdd={(name) => patchIdea({ materials: [...materials, { name, done: false }] })} />
              )}
            </CardBody>
          </Card>

          {idea.status !== 'Considering' && (
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
          )}

          {sessionsMode !== 'hidden' && (
            <Card>
              <CardHeader className="font-semibold">Build Sessions</CardHeader>
              <CardBody className="gap-3">
                {sessionsMode === 'editable' && (
                  <SessionForm
                    onAdd={(session) => patchIdea({ build_sessions: [...(idea.build_sessions || []), session] })}
                  />
                )}
                {sessions.length === 0 ? (
                  <p className="text-small text-default-400">No sessions logged yet.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-default-100">
                    {sessions.map((s) => (
                      <div key={s.session_id} className="flex flex-col gap-0.5 py-2">
                        <div className="flex gap-3 text-small">
                          <span className="font-medium text-foreground">{formatDate(s.date)}</span>
                          {s.duration_min ? (
                            <span className="text-default-400">{formatDuration(s.duration_min)}</span>
                          ) : null}
                        </div>
                        {s.notes && <p className="text-small text-default-500">{s.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {costsMode !== 'hidden' && (
            <Card>
              <CardHeader className="flex items-center justify-between font-semibold">
                Costs
                {costsMode === 'editable' && (
                  <Button size="sm" color="primary" onPress={() => setCostModalOpen(true)}>
                    + Log Cost
                  </Button>
                )}
              </CardHeader>
              <CardBody>
                <CostsSection ideaId={idea.id} refreshKey={costRefresh} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader className="font-semibold">Photos</CardHeader>
            <CardBody>
              <PhotoGallery
                context="idea"
                entityId={idea.id}
                season={(idea.season || 'shared').toLowerCase()}
                photoType="inspiration"
                noSetPrimary={imagesMode !== 'editable' || locked}
                enableUpload={imagesMode === 'editable' && !locked}
              />
            </CardBody>
          </Card>

          {buildImagesMode !== 'hidden' && (
            <Card>
              <CardHeader className="flex items-center justify-between font-semibold">
                Build Photos
                {buildImagesMode === 'editable' && (
                  <Button size="sm" variant="flat" onPress={addBuildPhotos}>
                    + Add Build Photo
                  </Button>
                )}
              </CardHeader>
              <CardBody>
                {buildPhotos.length === 0 ? (
                  <p className="text-small text-default-400">No build photos yet.</p>
                ) : (
                  <PhotoLightbox
                    photos={buildPhotos}
                    className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2"
                    thumbnailClassName="aspect-square h-full w-full rounded-medium object-cover"
                  />
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="font-semibold">Info</CardHeader>
            <CardBody className="gap-3 text-small">
              <SidebarField label="Season" value={idea.season} />
              {idea.bucket && <SidebarField label="Build Season" value={idea.bucket} />}
              <SidebarField label="Status" value={idea.status} />
              {idea.remaining_units != null && (
                <SidebarField label="Remaining Units" value={String(idea.remaining_units)} />
              )}
              <div className="flex flex-col gap-1">
                <span className="text-default-500">Link</span>
                <InlineEdit value={idea.link || ''} type="url" onSave={(v) => patchIdea({ link: v })} />
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

      {/* Action bar (Workbench only) */}
      {isWorkbench && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Button color="primary" onPress={() => setWizardOpen(true)}>
            Complete Build
          </Button>
          <Button color="danger" variant="flat" onPress={handleAbandon}>
            Abandon Build
          </Button>
        </div>
      )}

      <CostLogModal
        idea={idea}
        isOpen={costModalOpen}
        onClose={() => setCostModalOpen(false)}
        onSaved={() => setCostRefresh((n) => n + 1)}
      />
      <BuildCompleteWizard idea={idea} isOpen={wizardOpen} onClose={() => navigate('/')} />
      {editor}
    </div>
  );
}

function InstructionStepForm({ onAdd }: { onAdd: (s: BuildInstructionStep) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const toast = useToast();

  function reset() {
    setTitle('');
    setDetail('');
  }

  function save() {
    if (!title.trim() && !detail.trim()) {
      toast.showError('Title or detail is required');
      return;
    }
    const step: BuildInstructionStep = {
      title: title.trim() || undefined,
      detail: detail.trim() || undefined,
    };
    onAdd(step);
    reset();
  }

  if (!open) {
    return (
      <Button size="sm" variant="flat" className="w-fit" startContent={<Plus size={14} />} onPress={() => setOpen(true)}>
        Add Step
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-medium bg-default-100 p-3">
      <Input size="sm" label="Title" value={title} onValueChange={setTitle} />
      <Textarea size="sm" label="Detail" minRows={2} value={detail} onValueChange={setDetail} />
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="light"
          onPress={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button size="sm" color="primary" onPress={save}>
          Save Step
        </Button>
      </div>
    </div>
  );
}

function AddMaterial({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');
  function add() {
    const name = value.trim();
    if (!name) return;
    onAdd(name);
    setValue('');
  }
  return (
    <div className="flex gap-2">
      <Input
        size="sm"
        placeholder="Add material…"
        value={value}
        onValueChange={setValue}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
      />
      <Button size="sm" variant="flat" onPress={add}>
        Add
      </Button>
    </div>
  );
}

function SessionForm({ onAdd }: { onAdd: (s: BuildSession) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const toast = useToast();

  function reset() {
    setDate(todayIso());
    setDuration('');
    setNotes('');
  }

  function save() {
    if (!date) {
      toast.showError('Date is required');
      return;
    }
    const suffix = Math.random().toString(36).slice(2, 6);
    const session: BuildSession = {
      session_id: `sess-${date.replace(/-/g, '')}-${suffix}`,
      date,
      notes: notes.trim() || undefined,
    };
    if (duration.trim()) session.duration_min = parseInt(duration, 10);
    onAdd(session);
    reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <Button size="sm" variant="flat" className="w-fit" startContent={<Plus size={14} />} onPress={() => setOpen(true)}>
        Add Session
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-medium bg-default-100 p-3">
      <div className="flex gap-3">
        <Input size="sm" type="date" label="Date" value={date} onValueChange={setDate} />
        <Input
          size="sm"
          type="number"
          label="Duration (min)"
          placeholder="60"
          value={duration}
          onValueChange={setDuration}
        />
      </div>
      <Textarea size="sm" label="Notes" minRows={2} value={notes} onValueChange={setNotes} />
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="light"
          onPress={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button size="sm" color="primary" onPress={save}>
          Save Session
        </Button>
      </div>
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
