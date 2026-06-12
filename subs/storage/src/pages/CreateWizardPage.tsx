import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Chip } from '@heroui/react';
import type { ReactNode } from 'react';
import { Plus, Package, FileBox, Camera, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { storageAPI, photosAPI } from '../api/storageApi';
import STORAGE_CONFIG from '../config/storageConfig';
import { Breadcrumbs, PageHeader } from '../components/Layout';
import { Typography } from '../components/Typography';
import { StorageForm, validateForm, type FormData } from '../components/StorageForm';
import { openPhotoUploadModal } from '../components/PhotoGallery';
import { useToast } from '../lib/toast';
import { useAuth } from '@spookydecs/ui';

type ClassType = 'Tote' | 'Self';

export default function CreateWizardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasMinRole } = useAuth();

  const [step, setStep] = useState(1);
  const [type, setType] = useState<ClassType | null>(null);
  const [data, setData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!hasMinRole('builder')) {
    return (
      <div>
        <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Create' }]} />
        <PageHeader title="Create Storage Unit" icon={<Plus size={26} />} />
        <p className="text-danger">You do not have permission to create storage units.</p>
      </div>
    );
  }

  function selectType(t: ClassType) {
    setType(t);
    setData({});
    setErrors({});
    setStep(2);
  }

  function goReview() {
    if (!type) return;
    const errs = validateForm(type, data);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.showError('Please fix the errors before continuing');
      return;
    }
    setStep(3);
  }

  function idPreview(): string {
    if (!type || !data.season) return 'STOR-XXXX-XXX-001';
    return `STOR-${STORAGE_CONFIG.CLASS_TYPE_CODES[type]}-${STORAGE_CONFIG.SEASON_CODES[data.season]}-001`;
  }

  async function submit() {
    if (!type) return;
    setSubmitting(true);
    try {
      const payload = {
        season: data.season,
        location: data.location,
        name: data.short_name,
        general_notes: data.general_notes || '',
        ...(type === 'Tote' ? { size: data.size } : { item_id: data.item_id }),
      };
      const unit = type === 'Tote' ? await storageAPI.createTote(payload) : await storageAPI.createSelf(payload);
      if (!unit) throw new Error('Create returned no unit');

      if (photoIds.length > 0) {
        try {
          const photo = await photosAPI.getById(photoIds[0]);
          if (photo) {
            await storageAPI.update(unit.id, {
              images: {
                photo_id: photoIds[0],
                photo_url: photo.cloudfront_url,
                thumb_cloudfront_url: photo.thumb_cloudfront_url,
              },
            });
          }
        } catch {
          toast.showError('Storage created but photo linking failed. You can add a photo later.');
        }
      }

      toast.showSuccess(`${type} created successfully!`);
      navigate(`/storage/${unit.id}`);
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to create storage unit');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpload() {
    const ids = await openPhotoUploadModal(data.season ?? '');
    if (ids.length > 0) {
      setPhotoIds(ids);
      toast.showSuccess('Photo uploaded');
    }
  }

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Totes', to: '/storage' }, { label: 'Create' }]} />
      <PageHeader
        title="Create Storage Unit"
        icon={<Plus size={26} />}
        actions={<Button variant="light" onPress={() => navigate('/storage')}>Cancel</Button>}
      />

      <div className="mb-6 flex items-center gap-2 text-sm">
        {['Type', 'Details', 'Review'].map((label, i) => {
          const n = i + 1;
          return (
            <Chip key={label} variant={step === n ? 'solid' : 'flat'} color={step >= n ? 'secondary' : 'default'}>
              {step > n ? '✓ ' : `${n}. `}
              {label}
            </Chip>
          );
        })}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TypeCard
            icon={<Package size={28} />}
            title="Tote"
            description="Standardized container for multiple items."
            selected={type === 'Tote'}
            onPress={() => selectType('Tote')}
          />
          <TypeCard
            icon={<FileBox size={28} />}
            title="Self-Contained"
            description="An item stored in its original box."
            selected={type === 'Self'}
            onPress={() => selectType('Self')}
          />
        </div>
      )}

      {step === 2 && type && (
        <Card shadow="md" className="bg-content1">
          <CardBody className="gap-4">
            <Typography type="h5" className="text-foreground">
              {type === 'Tote' ? 'Tote' : 'Self-Contained Unit'} details
            </Typography>
            <StorageForm classType={type} data={data} errors={errors} onChange={setData} />
            <div className="flex justify-between">
              <Button variant="light" startContent={<ArrowLeft size={18} />} onPress={() => setStep(1)}>Back</Button>
              <Button color="primary" endContent={<ArrowRight size={18} />} onPress={goReview}>Review</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 3 && type && (
        <Card shadow="md" className="bg-content1">
          <CardBody className="gap-4">
            <Typography type="h5" className="text-foreground">Review &amp; photo</Typography>
            <div className="flex items-center gap-3">
              <Button variant="flat" startContent={<Camera size={18} />} onPress={handleUpload}>{photoIds.length ? 'Change photo' : 'Upload photo'}</Button>
              {photoIds.length > 0 && <span className="text-success">✓ Photo uploaded</span>}
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <Review label="Generated ID" value={idPreview()} mono />
              <Review label="Type" value={type} />
              <Review label="Season" value={data.season} />
              <Review label="Location" value={data.location} />
              <Review label="Short Name" value={data.short_name} />
              {data.size && <Review label="Size" value={data.size} />}
              {data.item_id && <Review label="Item" value={data.item_id} mono />}
              {data.general_notes && <Review label="Notes" value={data.general_notes} full />}
            </dl>
            <div className="flex justify-between">
              <Button variant="light" startContent={<ArrowLeft size={18} />} onPress={() => setStep(2)}>Back</Button>
              <Button color="primary" variant="shadow" startContent={<Save size={18} />} onPress={submit} isLoading={submitting}>Create Storage Unit</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function TypeCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Card
      isPressable
      isHoverable
      shadow="md"
      onPress={onPress}
      className={`bg-content1 ${selected ? 'ring-2 ring-secondary' : ''}`}
    >
      <CardBody className="flex flex-row items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
          {icon}
        </span>
        <div className="text-left">
          <Typography type="h6" as="div" className="text-foreground">{title}</Typography>
          <Typography type="body-sm" as="div" className="text-default-500">{description}</Typography>
        </div>
      </CardBody>
    </Card>
  );
}

function Review({ label, value, mono, full }: { label: string; value?: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-xs uppercase tracking-wide text-default-500">{label}</dt>
      <dd className={`text-foreground ${mono ? 'font-mono text-sm' : ''}`}>{value || '—'}</dd>
    </div>
  );
}
