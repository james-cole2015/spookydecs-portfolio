// Idea create / edit form. URLs: /create (new) and /:id/edit (edit).
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Card,
  CardBody,
  CardHeader,
} from '@heroui/react';
import { ArrowLeft, X } from 'lucide-react';
import { LoadingState, ErrorState, useToast, usePhotoUpload } from '@spookydecs/ui';
import { getIdea, createIdea, updateIdea } from '../api/ideasApi';
import { SEASONS, USER_STATUSES, type Idea } from '../config/ideasConfig';
import { formatDate, normalizeMaterials } from '../lib/format';

interface FormValues {
  title: string;
  season: string;
  status: string;
  description: string;
  link: string;
  tags: string;
  notes: string;
  estimated_cost: string;
  prep_start: string;
  build_start: string;
  build_complete: string;
  item_id: string;
}

export default function FormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const { uploadFiles } = usePhotoUpload();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      season: '',
      status: 'Considering',
      description: '',
      link: '',
      tags: '',
      notes: '',
      estimated_cost: '',
      prep_start: '',
      build_start: '',
      build_complete: '',
      item_id: '',
    },
  });

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [existing, setExisting] = useState<Idea | null>(null);
  const [materials, setMaterials] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [keptImages, setKeptImages] = useState<string[]>([]);

  useEffect(() => {
    if (!isEdit) return;
    getIdea(id!)
      .then((idea) => {
        if (!idea) {
          setLoadError('Idea not found');
          return;
        }
        setExisting(idea);
        reset({
          title: idea.title || '',
          season: idea.season || '',
          status: idea.status || 'Considering',
          description: idea.description || '',
          link: idea.link || '',
          tags: (idea.tags || []).join(', '),
          notes: idea.notes || '',
          estimated_cost: idea.estimated_cost != null ? String(idea.estimated_cost) : '',
          prep_start: idea.prep_start || '',
          build_start: idea.build_start || '',
          build_complete: idea.build_complete || '',
          item_id: idea.item_id || '',
        });
        setMaterials(normalizeMaterials(idea.materials).map((m) => m.name));
        setKeptImages(idea.images ? [...idea.images] : []);
      })
      .catch((err) => setLoadError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  async function uploadPhotos(ideaId: string, seasonVal: string) {
    if (!files.length) return;
    await uploadFiles(files, {
      context: 'idea',
      photo_type: 'catalog',
      category: 'inspiration',
      entityId: ideaId,
      season: seasonVal || 'Shared',
    });
  }

  async function onSubmit(values: FormValues) {
    const cleanMaterials = materials
      .map((m) => m.trim())
      .filter(Boolean)
      .map((name) => ({ name, done: false }));

    const body: Partial<Idea> = {
      title: values.title.trim(),
      season: values.season,
      status: values.status as Idea['status'],
      description: values.description.trim(),
      link: values.link.trim(),
      notes: values.notes.trim(),
      tags: values.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      estimated_cost: values.estimated_cost.trim() ? parseFloat(values.estimated_cost) : null,
      materials: cleanMaterials,
      prep_start: values.prep_start || '',
      build_start: values.build_start || '',
      build_complete: values.build_complete || '',
      item_id: values.item_id.trim(),
    };

    try {
      if (isEdit && existing) {
        body.images = keptImages;
        await uploadPhotos(existing.id, values.season).catch(() => {});
        const result = await updateIdea({ ...(body as Idea), id: existing.id });
        const resultId = result?.id || existing.id;
        toast.showSuccess('Idea updated');
        navigate(`/${resultId}`);
      } else {
        const result = await createIdea(body);
        const createdId = result?.id || result;
        if (files.length && createdId) {
          try {
            await uploadPhotos(createdId, values.season);
          } catch (uploadErr) {
            toast.showWarning('Idea created (photo upload failed: ' + (uploadErr as Error).message + ')');
            navigate(`/${createdId}`);
            return;
          }
        }
        toast.showSuccess('Idea created');
        navigate(`/${createdId}`);
      }
    } catch (err) {
      toast.showError((isEdit ? 'Update' : 'Create') + ' failed: ' + (err as Error).message);
    }
  }

  if (loading) return <LoadingState />;
  if (loadError)
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <ErrorState message={loadError} onRetry={() => navigate('/list')} />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Button
        variant="light"
        size="sm"
        startContent={<ArrowLeft size={16} />}
        onPress={() => navigate(isEdit ? `/${id}` : '/')}
        className="mb-4"
      >
        {isEdit ? 'Idea' : 'Ideas'}
      </Button>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        {isEdit ? 'Edit Idea' : 'New Idea'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardHeader className="font-semibold">Details</CardHeader>
          <CardBody className="gap-4">
            <Input
              isRequired
              label="Title"
              maxLength={150}
              {...register('title', { required: 'Title is required.', maxLength: 150 })}
              isInvalid={!!errors.title}
              errorMessage={errors.title?.message}
            />
            <div className="flex gap-4">
              <Controller
                control={control}
                name="season"
                rules={{ required: 'Season is required.' }}
                render={({ field }) => (
                  <Select
                    isRequired
                    label="Season"
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(e) => field.onChange(e.target.value)}
                    isInvalid={!!errors.season}
                    errorMessage={errors.season?.message}
                  >
                    {SEASONS.map((s) => (
                      <SelectItem key={s}>{s}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    label="Status"
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(e) => e.target.value && field.onChange(e.target.value)}
                    disallowEmptySelection
                  >
                    {USER_STATUSES.map((s) => (
                      <SelectItem key={s}>{s}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
            <Textarea label="Description" minRows={3} {...register('description')} />
            <Input
              label="Reference Link"
              type="url"
              placeholder="https://…"
              {...register('link')}
            />
            <Input
              label="Tags"
              placeholder="tag1, tag2, tag3"
              description="Comma-separated list of tags."
              {...register('tags')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-semibold">Notes</CardHeader>
          <CardBody>
            <Textarea
              minRows={4}
              placeholder="Internal notes, build details, materials…"
              {...register('notes')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-semibold">Planning</CardHeader>
          <CardBody className="gap-4">
            <Input
              label="Estimated Cost ($)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              {...register('estimated_cost')}
            />
            {isEdit ? (
              <ReadonlyField label="Prep Start Date" value={formatDate(existing?.prep_start) || '—'} />
            ) : (
              <Input label="Prep Start Date" type="date" {...register('prep_start')} />
            )}
            <MaterialsEditor materials={materials} setMaterials={setMaterials} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-semibold">Build</CardHeader>
          <CardBody className="gap-4">
            <div className="flex gap-4">
              {isEdit ? (
                <>
                  <ReadonlyField
                    label="Build Start Date"
                    value={formatDate(existing?.build_start) || '—'}
                  />
                  <ReadonlyField
                    label="Build Complete Date"
                    value={formatDate(existing?.build_complete) || '—'}
                  />
                </>
              ) : (
                <>
                  <Input label="Build Start Date" type="date" {...register('build_start')} />
                  <Input label="Build Complete Date" type="date" {...register('build_complete')} />
                </>
              )}
            </div>
            {isEdit ? (
              <ReadonlyField
                label="Item ID"
                value={existing?.item_id || '—'}
                hint="Linked item — managed by build workflow."
              />
            ) : (
              <Input
                label="Item ID"
                placeholder="e.g. ITEM-hal-20261001-abc1"
                description="Link to the items record once the build is complete."
                {...register('item_id')}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-semibold">Images</CardHeader>
          <CardBody className="gap-4">
            <ImagePicker
              keptImages={keptImages}
              setKeptImages={setKeptImages}
              files={files}
              setFiles={setFiles}
            />
            <p className="text-tiny text-default-400">
              {isEdit
                ? 'Add more images or remove existing ones.'
                : 'Images will be uploaded after the idea is saved.'}
            </p>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="flat" onPress={() => navigate(isEdit ? `/${id}` : '/list')}>
            Cancel
          </Button>
          <Button color="primary" type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Create Idea'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ReadonlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <span className="text-small text-default-600">{label}</span>
      <div className="rounded-medium bg-default-100 px-3 py-2 text-small text-foreground">{value}</div>
      <span className="text-tiny text-default-400">{hint || 'Set automatically by status transitions.'}</span>
    </div>
  );
}

function MaterialsEditor({
  materials,
  setMaterials,
}: {
  materials: string[];
  setMaterials: (m: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-small text-default-600">Materials</span>
      {materials.map((m, i) => (
        <div key={i} className="flex gap-2">
          <Input
            size="sm"
            value={m}
            placeholder="e.g. 3/4 inch PVC pipe"
            onValueChange={(v) => setMaterials(materials.map((x, j) => (j === i ? v : x)))}
          />
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label="Remove material"
            onPress={() => setMaterials(materials.filter((_, j) => j !== i))}
          >
            <X size={16} />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="flat"
        className="w-fit"
        onPress={() => setMaterials([...materials, ''])}
      >
        + Add Material
      </Button>
    </div>
  );
}

function ImagePicker({
  keptImages,
  setKeptImages,
  files,
  setFiles,
}: {
  keptImages: string[];
  setKeptImages: (v: string[]) => void;
  files: File[];
  setFiles: (v: File[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {(keptImages.length > 0 || files.length > 0) && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
          {keptImages.map((url) => (
            <Thumb
              key={url}
              src={url}
              onRemove={() => setKeptImages(keptImages.filter((u) => u !== url))}
            />
          ))}
          {files.map((f, i) => (
            <Thumb
              key={i}
              src={URL.createObjectURL(f)}
              onRemove={() => setFiles(files.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          const picked = Array.from(e.target.files || []);
          setFiles([...files, ...picked]);
          e.target.value = '';
        }}
        className="text-small text-default-500 file:mr-3 file:rounded-medium file:border-0 file:bg-default-100 file:px-3 file:py-1.5 file:text-small file:text-foreground"
      />
    </div>
  );
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-medium">
      <img src={src} alt="preview" loading="lazy" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}
