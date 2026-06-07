import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, Button } from '@heroui/react';
import { Pencil, Save } from 'lucide-react';
import { storageAPI } from '../api/storageApi';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState } from '../components/Layout';
import { StorageForm, validateForm, type FormData } from '../components/StorageForm';
import { useToast } from '../lib/toast';
import { useAuth } from '../hooks/useAuth';

export default function EditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasMinRole } = useAuth();

  const [classType, setClassType] = useState<string>('Tote');
  const [data, setData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const unit = await storageAPI.getById(id);
        if (!unit) throw new Error('Storage unit not found');
        if (!active) return;
        setClassType(String(unit.class_type));
        setData({
          season: String(unit.season ?? ''),
          location: String(unit.location ?? ''),
          short_name: unit.short_name ?? '',
          size: String(unit.size ?? ''),
          item_id: String(unit.item_id ?? ''),
          general_notes: String(unit.general_notes ?? ''),
        });
      } catch (e: any) {
        if (active) setError(e?.message ?? 'Failed to load storage unit');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function save() {
    const errs = validateForm(classType, data);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.showError('Please fix the errors before saving');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        season: data.season,
        location: data.location,
        name: data.short_name,
        general_notes: data.general_notes || '',
      };
      if (classType === 'Tote') payload.size = data.size;
      else payload.item_id = data.item_id;

      await storageAPI.update(id, payload);
      toast.showSuccess('Storage unit updated');
      navigate(`/storage/${id}`);
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to update storage unit');
    } finally {
      setSaving(false);
    }
  }

  if (!hasMinRole('builder')) {
    return (
      <div>
        <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Edit' }]} />
        <p className="text-danger">You do not have permission to edit storage units.</p>
      </div>
    );
  }
  if (loading) return <LoadingState label="Loading storage unit…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <Breadcrumbs
        crumbs={[{ label: 'Storage', to: '/' }, { label: 'Totes', to: '/storage' }, { label: data.short_name || id }, { label: 'Edit' }]}
      />
      <PageHeader title="Edit Storage Unit" icon={<Pencil size={24} />} />
      <Card shadow="md" className="bg-content1">
        <CardBody className="gap-4">
          <StorageForm classType={classType} data={data} errors={errors} onChange={setData} />
          <div className="flex justify-between">
            <Button variant="light" onPress={() => navigate(`/storage/${id}`)}>Cancel</Button>
            <Button color="primary" variant="shadow" startContent={<Save size={18} />} onPress={save} isLoading={saving}>Save Changes</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
