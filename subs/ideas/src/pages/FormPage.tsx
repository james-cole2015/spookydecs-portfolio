// New idea creation form. URL: /create only — editing an existing idea is now
// done inline on DetailPage (#601); this page no longer handles /:id/edit.
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
import { useToast, usePhotoUpload } from '@spookydecs/ui';
import { createIdea } from '../api/ideasApi';
import { SEASONS, USER_STATUSES, type Idea } from '../config/ideasConfig';

interface FormValues {
  title: string;
  season: string;
  status: string;
  description: string;
  link: string;
  tags: string;
  notes: string;
  estimated_cost: string;
  remaining_units: string;
  build_start: string;
  build_complete: string;
  item_id: string;
}

export default function FormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { uploadFiles } = usePhotoUpload();

  const {
    register,
    handleSubmit,
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
      remaining_units: '',
      build_start: '',
      build_complete: '',
      item_id: '',
    },
  });

  const [files, setFiles] = useState<File[]>([]);

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
      remaining_units: values.remaining_units.trim() ? parseInt(values.remaining_units, 10) : null,
      build_start: values.build_start || '',
      build_complete: values.build_complete || '',
      item_id: values.item_id.trim(),
    };

    try {
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
    } catch (err) {
      toast.showError('Create failed: ' + (err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Button
        variant="light"
        size="sm"
        startContent={<ArrowLeft size={16} />}
        onPress={() => navigate('/list')}
        className="mb-4"
      >
        Ideas
      </Button>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">New Idea</h1>

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
            <div className="flex gap-4">
              <Input
                label="Estimated Cost ($)"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('estimated_cost')}
              />
              <Input
                label="Remaining Units"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 6"
                description="Units still unfinished from a prior partial build, if any."
                {...register('remaining_units')}
              />
            </div>
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
          <CardHeader className="font-semibold">Build</CardHeader>
          <CardBody className="gap-4">
            <div className="flex gap-4">
              <Input label="Build Start Date" type="date" {...register('build_start')} />
              <Input label="Build Complete Date" type="date" {...register('build_complete')} />
            </div>
            <Input
              label="Item ID"
              placeholder="e.g. ITEM-hal-20261001-abc1"
              description="Link to the items record once the build is complete."
              {...register('item_id')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-semibold">Images</CardHeader>
          <CardBody className="gap-4">
            <ImagePicker files={files} setFiles={setFiles} />
            <p className="text-tiny text-default-400">Images will be uploaded after the idea is saved.</p>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="flat" onPress={() => navigate('/list')}>
            Cancel
          </Button>
          <Button color="primary" type="submit" isLoading={isSubmitting}>
            Create Idea
          </Button>
        </div>
      </form>
    </div>
  );
}

function ImagePicker({ files, setFiles }: { files: File[]; setFiles: (v: File[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {files.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
          {files.map((f, i) => (
            <Thumb key={i} src={URL.createObjectURL(f)} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />
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
