// Build workspace — interactive page for an active (Workbench) build.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Input,
  Textarea,
} from '@heroui/react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  PhotoLightbox,
  useToast,
  usePhotoUpload,
  type LightboxPhoto,
  useConfirm,
} from '@spookydecs/ui';
import { getIdea, updateIdea, getIdeaPhotos } from '../api/ideasApi';
import { PIPELINE_STAGES, ITEMS_BASE_URL, type Idea, type BuildSession } from '../config/ideasConfig';
import { formatDate, formatDuration, normalizeMaterials } from '../lib/format';
import { CostsSection } from '../components/CostsSection';
import { CostLogModal } from '../components/CostLogModal';
import { InlineEdit } from '../components/InlineEdit';
import { BuildCompleteWizard } from '../components/BuildCompleteWizard';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function BuildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { open } = usePhotoUpload();
  const { confirm, dialog } = useConfirm();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [photos, setPhotos] = useState<LightboxPhoto[]>([]);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costRefresh, setCostRefresh] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!id) return;
    try {
      const list = await getIdeaPhotos(id, 'build');
      setPhotos(list.map((p) => ({ url: p.cloudfront_url, thumbUrl: p.thumb_cloudfront_url || p.cloudfront_url })));
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
        if (fetched.status === 'Built' || fetched.status === 'Abandoned') {
          navigate(`/${fetched.id}`, { replace: true });
          return;
        }
        setIdea(fetched);
        void loadPhotos();
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, navigate, loadPhotos]);

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

  async function addBuildPhotos() {
    if (!idea) return;
    const uploaded = await open({
      context: 'idea',
      photo_type: 'build',
      entityId: idea.id,
      season: idea.season || 'Shared',
    });
    if (uploaded.length) {
      toast.showSuccess('Build photos saved');
      await loadPhotos();
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
        <EmptyState icon="🔨" title="Build Not Found" />
        <div className="mt-4 flex justify-center">
          <Button color="primary" onPress={() => navigate('/workbench')}>
            Back to Active Builds
          </Button>
        </div>
      </div>
    );

  const materials = normalizeMaterials(idea.materials);
  const sessions = [...(idea.build_sessions || [])].sort((a, b) =>
    (b.date || '').localeCompare(a.date || ''),
  );
  const currentIdx = PIPELINE_STAGES.indexOf(idea.status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {dialog}
      <Button
        variant="light"
        size="sm"
        startContent={<ArrowLeft size={16} />}
        onPress={() => navigate('/workbench')}
        className="mb-4"
      >
        Active Builds
      </Button>

      {/* Pipeline */}
      <div className="mb-6 flex items-center gap-1">
        {PIPELINE_STAGES.map((stage, i) => {
          const isNext = i === currentIdx + 1;
          return (
            <div key={stage} className="flex flex-1 items-center gap-1">
              <button
                type="button"
                disabled={!isNext}
                onClick={() => isNext && advanceTo(stage)}
                title={isNext ? `Advance to ${stage}` : undefined}
                className={`flex-1 rounded-medium px-2 py-1.5 text-center text-tiny transition-colors ${
                  i < currentIdx
                    ? 'bg-primary/20 text-primary'
                    : i === currentIdx
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

      <h1 className="mb-6 text-2xl font-semibold text-foreground">{idea.title}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="font-semibold">Description</CardHeader>
            <CardBody>
              <InlineEdit
                value={idea.description || ''}
                type="textarea"
                placeholder="Click to add a description…"
                onSave={(v) => patchIdea({ description: v })}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="font-semibold">Materials</CardHeader>
            <CardBody className="gap-3">
              {materials.length === 0 ? (
                <p className="text-small text-default-400">No materials listed yet.</p>
              ) : (
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
              )}
              <AddMaterial onAdd={(name) => patchIdea({ materials: [...materials, { name, done: false }] })} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between font-semibold">
              Build Sessions
            </CardHeader>
            <CardBody className="gap-3">
              <SessionForm
                onAdd={(session) => patchIdea({ build_sessions: [...(idea.build_sessions || []), session] })}
              />
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

          <Card>
            <CardHeader className="flex items-center justify-between font-semibold">
              Build Photos
              <Button size="sm" variant="flat" onPress={addBuildPhotos}>
                + Add Build Photo
              </Button>
            </CardHeader>
            <CardBody>
              {photos.length === 0 ? (
                <p className="text-small text-default-400">No build photos yet.</p>
              ) : (
                <PhotoLightbox
                  photos={photos}
                  className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2"
                  thumbnailClassName="aspect-square h-full w-full rounded-medium object-cover"
                />
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="font-semibold">Info</CardHeader>
            <CardBody className="gap-3 text-small">
              <div className="flex justify-between">
                <span className="text-default-500">Season</span>
                <span className="text-foreground/80">{idea.season}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Status</span>
                <span className="text-foreground/80">{idea.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Prep Start</span>
                <span className="text-foreground/80">{formatDate(idea.prep_start) || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Build Start</span>
                <span className="text-foreground/80">{formatDate(idea.build_start) || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-default-500">Link</span>
                <InlineEdit value={idea.link || ''} type="url" onSave={(v) => patchIdea({ link: v })} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-default-500">Notes</span>
                <InlineEdit value={idea.notes || ''} type="textarea" onSave={(v) => patchIdea({ notes: v })} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button color="primary" onPress={() => setWizardOpen(true)}>
          Complete Build
        </Button>
        <Button variant="flat" onPress={() => navigate(`/${idea.id}/edit`)}>
          Edit Full Form
        </Button>
        <Button color="danger" variant="flat" onPress={handleAbandon}>
          Abandon Build
        </Button>
      </div>

      <CostLogModal
        idea={idea}
        isOpen={costModalOpen}
        onClose={() => setCostModalOpen(false)}
        onSaved={() => setCostRefresh((n) => n + 1)}
      />
      <BuildCompleteWizard idea={idea} isOpen={wizardOpen} onClose={() => navigate('/')} />
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
