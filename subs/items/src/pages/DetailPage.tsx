// Item detail page (#332)
// Sections: Photos, Basic Info, Class Details, Vendor, Storage (display-only consumer fields),
// Maintenance (display-only), Deployment (display-only).
// cascade-delete preview → confirm flow in action drawer.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, CardBody, CardHeader, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
} from '@heroui/react';
import {
  Breadcrumbs, PageHeader, LoadingState, ErrorState,
  PhotoGallery, useToast, useAuth,
} from '@spookydecs/ui';
import { fetchItemById, cascadePreview, cascadeDelete } from '../api/itemsApi';
import { getMaintenanceRecords, getMaintenancePageUrl } from '../api/maintenanceApi';
import { type Item, type MaintenanceRecord, type CascadePreview } from '../api/types';
import { getClassIcon, getSeasonIcon, getStatusColor } from '../config/itemsConfig';
import { MoreVertical, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { usePhotoUpload } from '@spookydecs/ui';

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasMinRole } = useAuth();
  const photoUpload = usePhotoUpload();

  const [item, setItem]             = useState<Item | null>(null);
  const [maintenance, setMaint]     = useState<MaintenanceRecord[]>([]);
  const [maintUrl, setMaintUrl]     = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [cascade, setCascade]       = useState<CascadePreview | null>(null);
  const [showCascade, setShowCascade] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const canWrite = hasMinRole('builder');
  const canAdmin = hasMinRole('admin');

  async function loadItem() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [fetched, maintRecords, mUrl] = await Promise.all([
        fetchItemById(id, true),
        getMaintenanceRecords(id, 100).catch(() => []),
        getMaintenancePageUrl(id).catch(() => null),
      ]);
      setItem(fetched);
      setMaint(maintRecords);
      setMaintUrl(mUrl);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load item.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItem(); }, [id]);

  if (loading) return <LoadingState />;
  if (error || !item) return <ErrorState message={error ?? 'Item not found.'} />;

  async function handleUploadPhoto() {
    if (!item) return;
    const uploaded = await photoUpload.open({
      context: 'item',
      entityId: item.id,
      season: item.season?.toLowerCase() ?? 'shared',
    });
    if (uploaded.length > 0) {
      toast.showSuccess(`${uploaded.length} photo(s) uploaded.`);
      loadItem();
    }
  }

  async function openCascade() {
    if (!item) return;
    try {
      const preview = await cascadePreview(item.id);
      setCascade(preview);
      setShowCascade(true);
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to load cascade preview.');
    }
  }

  async function executeCascade() {
    if (!item) return;
    setDeleting(true);
    try {
      await cascadeDelete(item.id);
      toast.showSuccess('Item deleted.');
      navigate('/items');
    } catch (e: any) {
      toast.showError(e?.message ?? 'Delete failed.');
    } finally {
      setDeleting(false);
      setShowCascade(false);
    }
  }

  const storage  = item.storage_data   ?? {};
  const vendor   = item.vendor_metadata ?? {};
  const deploy   = item.deployment_data as any;

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <Breadcrumbs crumbs={[{ label: 'Items' }, { label: 'All Items' }, { label: item.short_name }]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <PageHeader title={item.short_name} />
          <p className="text-sm text-foreground-500 mt-1">
            {getClassIcon(item.class)} {item.class} · {item.class_type} · {getSeasonIcon(item.season)} {item.season}
          </p>
          <p className="text-xs text-foreground-400">{item.id}</p>
          <div className="flex gap-2 mt-2">
            <Chip size="sm" style={{ backgroundColor: getStatusColor(item.status), color: 'white' }}>{item.status}</Chip>
            {item.operational_status === false && <Chip size="sm" color="danger">Non-Operational</Chip>}
            {deploy?.deployed && <Chip size="sm" color="primary">Deployed</Chip>}
          </div>
        </div>
        <Dropdown>
          <DropdownTrigger>
            <Button isIconOnly variant="flat" size="sm"><MoreVertical size={16} /></Button>
          </DropdownTrigger>
          <DropdownMenu>
            {canWrite ? (
              <DropdownItem key="edit" startContent={<Pencil size={14} />} onPress={() => navigate(`/${item.id}/edit`)}>
                Edit Item
              </DropdownItem>
            ) : null}
            {canAdmin ? (
              <DropdownItem key="delete" startContent={<Trash2 size={14} />} color="danger" className="text-danger" onPress={openCascade}>
                Delete (Cascade)
              </DropdownItem>
            ) : null}
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* Photos section */}
      <Card className="mb-4">
        <CardHeader className="flex justify-between">
          <p className="font-semibold">Photos</p>
          {canWrite && (
            <Button size="sm" variant="flat" onPress={handleUploadPhoto}>+ Upload</Button>
          )}
        </CardHeader>
        <CardBody>
          <PhotoGallery
            context="item"
            entityId={item.id}
            season={item.season?.toLowerCase() ?? 'shared'}
            enableUpload={canWrite}
          />
        </CardBody>
      </Card>

      {/* Basic Info */}
      <InfoCard title="Basic Information">
        <InfoRow label="Name"         value={item.short_name} />
        <InfoRow label="Season"       value={`${getSeasonIcon(item.season)} ${item.season}`} />
        <InfoRow label="Status"       value={item.status} />
        {item.date_acquired && <InfoRow label="Date Acquired" value={item.date_acquired} />}
        {item.general_notes && <InfoRow label="Notes"         value={item.general_notes} />}
      </InfoCard>

      {/* Class-specific */}
      <InfoCard title={`${item.class_type} Details`}>
        {item.height_length && <InfoRow label="Height/Length" value={`${item.height_length} ft`} />}
        {item.stakes        && <InfoRow label="Stakes"        value={String(item.stakes)} />}
        {item.tethers       && <InfoRow label="Tethers"       value={String(item.tethers)} />}
        {item.adapter       && <InfoRow label="Adapter"       value={item.adapter} />}
        {item.power_inlet !== undefined && <InfoRow label="Power Required" value={item.power_inlet ? 'Yes' : 'No'} />}
        {item.color         && <InfoRow label="Color"         value={item.color} />}
        {item.bulb_type     && <InfoRow label="Bulb Type"     value={item.bulb_type} />}
        {item.length        && <InfoRow label="Length"        value={`${item.length} ft`} />}
        {item.male_ends     && <InfoRow label="Male Ends"     value={String(item.male_ends)} />}
        {item.female_ends   && <InfoRow label="Female Ends"   value={String(item.female_ends)} />}
        {item.watts         && <InfoRow label="Watts"         value={item.watts} />}
        {item.amps          && <InfoRow label="Amps"          value={item.amps} />}
      </InfoCard>

      {/* Vendor */}
      {(vendor.cost || vendor.value || vendor.manufacturer || vendor.vendor_store) && (
        <InfoCard title="Vendor Information">
          {vendor.cost         && <InfoRow label="Cost"         value={`$${vendor.cost}`} />}
          {vendor.value        && <InfoRow label="Value"        value={`$${vendor.value}`} />}
          {vendor.manufacturer && <InfoRow label="Manufacturer" value={String(vendor.manufacturer)} />}
          {vendor.vendor_store && <InfoRow label="Store"        value={String(vendor.vendor_store)} />}
        </InfoCard>
      )}

      {/* Storage — display-only (consumer-owned) */}
      <InfoCard title="Storage">
        <InfoRow label="Is Stored"     value={storage.is_stored ? 'Yes' : 'No'} />
        {storage.tote_id  && <InfoRow label="Tote ID"      value={storage.tote_id} />}
        {storage.location && <InfoRow label="Location"     value={storage.location} />}
      </InfoCard>

      {/* Maintenance — display-only */}
      <Card className="mb-4">
        <CardHeader className="flex justify-between">
          <p className="font-semibold">Maintenance</p>
          {maintUrl && (
            <Button
              size="sm"
              variant="flat"
              endContent={<ExternalLink size={12} />}
              onPress={() => window.open(maintUrl, '_blank')}
            >
              View All
            </Button>
          )}
        </CardHeader>
        <CardBody>
          {maintenance.length > 0 ? (
            <div className="flex flex-col gap-2">
              {maintenance.slice(0, 5).map((r) => (
                <div key={r.id} className="text-sm border-b border-default-100 pb-2">
                  <p className="font-medium">{r.description ?? r.id}</p>
                  {r.date && <p className="text-foreground-400 text-xs">{r.date}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground-500">No maintenance records.</p>
          )}
        </CardBody>
      </Card>

      {/* Deployment — display-only */}
      {deploy && (
        <Card className="mb-4">
          <CardHeader>
            <p className="font-semibold">Deployment</p>
          </CardHeader>
          <CardBody>
            <InfoRow label="Deployed"   value={deploy.deployed ? 'Yes' : 'No'} />
            {deploy.last_deployment_id && <InfoRow label="Deployment ID" value={deploy.last_deployment_id} />}
          </CardBody>
        </Card>
      )}

      {/* Cascade delete modal */}
      <Modal isOpen={showCascade} onClose={() => setShowCascade(false)}>
        <ModalContent>
          <ModalHeader>Delete Item — Cascade Preview</ModalHeader>
          <ModalBody>
            <p className="mb-3">Deleting <strong>{item.short_name}</strong> will also remove:</p>
            {cascade && (
              <ul className="list-disc ml-5 text-sm">
                {cascade.maintenance_count != null && <li>{cascade.maintenance_count} maintenance record(s)</li>}
                {cascade.cost_count        != null && <li>{cascade.cost_count} cost record(s)</li>}
                {cascade.photo_count       != null && <li>{cascade.photo_count} photo(s)</li>}
              </ul>
            )}
            <p className="mt-3 text-danger text-sm font-medium">This cannot be undone.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowCascade(false)} isDisabled={deleting}>Cancel</Button>
            <Button color="danger" onPress={executeCascade} isLoading={deleting}>Delete Everything</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* FAB — edit shortcut */}
      {canWrite && (
        <div className="fixed bottom-6 right-6">
          <Button
            color="primary"
            size="lg"
            isIconOnly
            radius="full"
            onPress={() => navigate(`/${item.id}/edit`)}
            className="shadow-lg"
          >
            <Pencil size={20} />
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <CardHeader><p className="font-semibold">{title}</p></CardHeader>
      <CardBody className="flex flex-col gap-2">{children}</CardBody>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-foreground-500 min-w-[140px]">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
