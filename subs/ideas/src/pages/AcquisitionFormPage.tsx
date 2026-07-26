// Acquisition create / edit form. URLs: /acquisitions/create and /acquisitions/:id/edit.
// Forks the ideas FormPage but strips all build machinery (materials, prep/build dates,
// item_id) and the photo-upload block — acquisitions carry a single catalog `image` URL.
// The Status select offers only Considering/Passed; `Purchased` is wizard-only (W5).
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
import { ArrowLeft } from 'lucide-react';
import { LoadingState, ErrorState, useToast } from '@spookydecs/ui';
import { getAcquisition, createAcquisition, updateAcquisition } from '../api/acquisitionsApi';
import {
  SEASONS,
  USER_STATUSES,
  PRIORITIES,
  type Acquisition,
} from '../config/acquisitionsConfig';

interface FormValues {
  title: string;
  season: string;
  status: string;
  price: string;
  retailer: string;
  url: string;
  quantity: string;
  priority: string;
  image: string;
  description: string;
  notes: string;
  tags: string;
}

const EMPTY: FormValues = {
  title: '',
  season: '',
  status: 'Considering',
  price: '',
  retailer: '',
  url: '',
  quantity: '1',
  priority: '',
  image: '',
  description: '',
  notes: '',
  tags: '',
};

export default function AcquisitionFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: EMPTY });

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [existing, setExisting] = useState<Acquisition | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    getAcquisition(id!)
      .then((a) => {
        if (!a) {
          setLoadError('Acquisition not found');
          return;
        }
        setExisting(a);
        reset({
          title: a.title || '',
          season: a.season || '',
          // If a record is already Purchased (created by the W5 wizard), keep its
          // status rather than forcing it into the Considering/Passed set.
          status: a.status || 'Considering',
          price: a.price != null ? String(a.price) : '',
          retailer: a.retailer || '',
          url: a.url || '',
          quantity: a.quantity != null ? String(a.quantity) : '1',
          priority: a.priority || '',
          image: a.image || '',
          description: a.description || '',
          notes: a.notes || '',
          tags: (a.tags || []).join(', '),
        });
      })
      .catch((err) => setLoadError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  async function onSubmit(values: FormValues) {
    const body: Partial<Acquisition> = {
      title: values.title.trim(),
      season: values.season,
      status: values.status as Acquisition['status'],
      price: values.price.trim() ? parseFloat(values.price) : null,
      retailer: values.retailer.trim(),
      url: values.url.trim(),
      quantity: values.quantity.trim() ? parseInt(values.quantity, 10) : 1,
      priority: values.priority,
      image: values.image.trim(),
      description: values.description.trim(),
      notes: values.notes.trim(),
      tags: values.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      if (isEdit && existing) {
        const result = await updateAcquisition({ ...body, acquisition_id: existing.acquisition_id });
        const resultId = result?.acquisition_id || existing.acquisition_id;
        toast.showSuccess('Acquisition updated');
        navigate(`/acquisitions/${resultId}`);
      } else {
        const result = await createAcquisition(body);
        const createdId = result?.acquisition_id || result;
        toast.showSuccess('Acquisition created');
        navigate(`/acquisitions/${createdId}`);
      }
    } catch (err) {
      toast.showError((isEdit ? 'Update' : 'Create') + ' failed: ' + (err as Error).message);
    }
  }

  if (loading) return <LoadingState />;
  if (loadError)
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <ErrorState message={loadError} onRetry={() => navigate('/acquisitions')} />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Button
        variant="light"
        size="sm"
        startContent={<ArrowLeft size={16} />}
        onPress={() => navigate(isEdit ? `/acquisitions/${id}` : '/acquisitions')}
        className="mb-4"
      >
        {isEdit ? 'Acquisition' : 'Acquisitions'}
      </Button>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        {isEdit ? 'Edit Acquisition' : 'New Acquisition'}
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
                    description="Purchasing arrives with the purchase wizard (W5)."
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
              label="Tags"
              placeholder="tag1, tag2, tag3"
              description="Comma-separated list of tags."
              {...register('tags')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-semibold">Catalog</CardHeader>
          <CardBody className="gap-4">
            <div className="flex gap-4">
              <Input
                label="Price ($)"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('price')}
              />
              <Input label="Quantity" type="number" min="1" step="1" {...register('quantity')} />
            </div>
            <div className="flex gap-4">
              <Input label="Retailer" placeholder="e.g. Home Depot" {...register('retailer')} />
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select
                    label="Priority"
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p}>{p}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
            <Input label="Product URL" type="url" placeholder="https://…" {...register('url')} />
            <Input
              label="Image URL"
              type="url"
              placeholder="https://…"
              description="Link to a product image. Rich uploads arrive in a later workstream."
              {...register('image')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-semibold">Notes</CardHeader>
          <CardBody>
            <Textarea
              minRows={4}
              placeholder="Internal notes, sizing, alternatives…"
              {...register('notes')}
            />
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            variant="flat"
            onPress={() => navigate(isEdit ? `/acquisitions/${id}` : '/acquisitions')}
          >
            Cancel
          </Button>
          <Button color="primary" type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Create Acquisition'}
          </Button>
        </div>
      </form>
    </div>
  );
}
