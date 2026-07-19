import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Divider,
  Spinner,
  Link as HeroLink,
} from '@heroui/react';
import { FileText, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { Breadcrumbs, PageHeader, Typography, useToast, usePhotoUpload, ConfirmDialog } from '@spookydecs/ui';
import { deleteCost, getCostById, updateImageAfterCostCreation } from '../api/financeApi';
import { formatCurrency, type CostRecord } from '../config/financeConfig';

const COST_TYPE_LABELS: Record<string, string> = {
  acquisition: 'Purchase',
  repair: 'Repair',
  maintenance: 'Maintenance',
  build: 'Build',
  supply_purchase: 'Supply Purchase',
  gift: 'Gift',
  other: 'Other',
};

const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materials',
  labor: 'Labor',
  parts: 'Parts',
  consumables: 'Consumables',
  decoration: 'Decoration',
  light: 'Light',
  accessory: 'Accessory',
  other: 'Other',
};

function DetailRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${highlight ? 'font-semibold text-foreground' : ''}`}>
      <span className="text-default-500">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

const money = (v: unknown) => `$${(parseFloat(v as string) || 0).toFixed(2)}`;
const longDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

export default function CostDetailPage() {
  const { costId } = useParams<{ costId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { open: openUpload } = usePhotoUpload();

  const [cost, setCost] = useState<CostRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getCostById(costId!);
        if (!data) throw new Error('Cost record not found');
        setCost(data);
      } catch (err: any) {
        console.error('Error loading cost record:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [costId]);

  const handleAddReceipt = async () => {
    if (!cost) return;
    try {
      const photos = await openUpload({ context: 'receipt', photo_type: 'receipt', season: 'shared', maxPhotos: 1 });
      const photoId = photos[0]?.photo_id;
      if (!photoId) return;
      await updateImageAfterCostCreation(photoId, cost.cost_id);
      toast.showSuccess('Receipt added successfully');
      const refreshed = await getCostById(cost.cost_id);
      setCost(refreshed);
    } catch (err: any) {
      console.error('Failed to finalize receipt:', err);
      toast.showError('Receipt uploaded but failed to link: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!cost) return;
    setDeleting(true);
    try {
      await deleteCost(cost.cost_id);
      toast.showSuccess('Cost record deleted successfully');
      setTimeout(() => navigate('/'), 800);
    } catch (err: any) {
      console.error('Error deleting cost:', err);
      toast.showError('Failed to delete cost record: ' + err.message);
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading cost record…" />
      </div>
    );
  }
  if (error || !cost) {
    return (
      <div className="flex flex-col items-start gap-3 p-5">
        <Typography type="h5" className="text-foreground">
          Error Loading Cost Record
        </Typography>
        <p className="text-default-500">{error}</p>
        <Button variant="flat" onPress={() => navigate('/')}>
          Back to Finance
        </Button>
      </div>
    );
  }

  const isPack = cost.class_type === 'pack';
  const hasReceipt = !!((cost as any).receipt_data?.image_id || (cost as any).receipt_data?.image_url);
  const noReceipt = (cost as any).no_receipt === true;
  const receiptUrl = (cost as any).receipt_data?.cloudfront_url;

  const relatedLinks: { label: string; id: string }[] = [];
  if (!isPack) {
    if (cost.related_item_id) relatedLinks.push({ label: 'Item', id: cost.related_item_id });
    if (cost.related_idea_id) relatedLinks.push({ label: 'Idea', id: cost.related_idea_id });
    if (cost.related_record_id) relatedLinks.push({ label: 'Maintenance Record', id: cost.related_record_id });
  }

  const packIds: string[] = Array.isArray((cost as any).pack_item_ids) ? (cost as any).pack_item_ids : [];
  const packNames: string[] = Array.isArray((cost as any).pack_item_names) ? (cost as any).pack_item_names : [];

  return (
    <div>
      <Breadcrumbs
        crumbs={[
          { label: 'Finance', to: '/' },
          { label: 'Cost Records', to: '/records' },
          { label: 'Cost Record Detail' },
        ]}
      />
      <PageHeader
        title="Cost Record"
        icon={
          isPack ? (
            <Chip size="sm" color="secondary" variant="flat">
              PACK
            </Chip>
          ) : undefined
        }
        subtitle={cost.cost_id}
        actions={
          <div className="flex flex-wrap gap-2">
            {hasReceipt ? (
              <Button
                variant="flat"
                startContent={<FileText size={16} />}
                onPress={() => (receiptUrl ? window.open(receiptUrl, '_blank') : toast.showError('Receipt not available'))}
              >
                View Receipt
              </Button>
            ) : !noReceipt ? (
              <Button variant="flat" startContent={<Paperclip size={16} />} onPress={handleAddReceipt}>
                Add Receipt
              </Button>
            ) : null}
            <Button variant="flat" startContent={<Pencil size={16} />} onPress={() => toast.showInfo('Edit functionality coming soon')}>
              Edit
            </Button>
            <Button color="danger" variant="flat" startContent={<Trash2 size={16} />} onPress={() => setConfirmOpen(true)}>
              Delete
            </Button>
          </div>
        }
      />

      {relatedLinks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-medium bg-content2 px-4 py-2">
          <span className="text-small text-default-500">Related:</span>
          {relatedLinks.map((link) => (
            <HeroLink key={link.id} className="cursor-pointer text-small" onPress={() => navigate(`/${link.id}`)}>
              {link.label}: {link.id} →
            </HeroLink>
          ))}
        </div>
      )}

      {isPack && (
        <Card shadow="sm" className="mb-4 bg-content1">
          <CardHeader>
            <Typography type="h6" className="text-foreground">
              📦 Pack Contents
            </Typography>
          </CardHeader>
          <CardBody className="flex flex-row flex-wrap gap-3">
            {packIds.length > 0 ? (
              packIds.map((id, i) => (
                <HeroLink key={id} className="cursor-pointer text-small" onPress={() => navigate(`/${id}`)}>
                  {packNames[i] || id} →
                </HeroLink>
              ))
            ) : (
              <span className="text-default-500">No items listed</span>
            )}
          </CardBody>
        </Card>
      )}

      {(cost.description || (cost as any).notes) && (
        <Card shadow="sm" className="mb-4 bg-content1">
          <CardBody className="gap-3">
            {cost.description && (
              <div>
                <Typography type="h6" className="mb-1 text-foreground">
                  Description
                </Typography>
                <p className="text-default-600">{cost.description}</p>
              </div>
            )}
            {(cost as any).notes && (
              <div>
                <Typography type="h6" className="mb-1 text-foreground">
                  Notes
                </Typography>
                <p className="text-default-600">{(cost as any).notes}</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card shadow="sm" className="bg-content1">
        <CardHeader>
          <Typography type="h6" className="text-foreground">
            💰 Cost Details
          </Typography>
        </CardHeader>
        <CardBody className="mx-auto w-full max-w-xl">
          <DetailRow label="Date" value={longDate(cost.cost_date as string)} />
          <DetailRow label="Type" value={COST_TYPE_LABELS[cost.cost_type as string] || cost.cost_type} />
          <DetailRow label="Category" value={CATEGORY_LABELS[cost.category as string] || cost.category} />
          {cost.subcategory && <DetailRow label="Subcategory" value={cost.subcategory} />}
          <DetailRow label={isPack ? 'Pack Name' : 'Item Name'} value={cost.item_name || 'N/A'} />
          <DetailRow label="Vendor" value={cost.vendor} />
          <DetailRow label="Payment Method" value={(cost as any).payment_method || 'Not specified'} />
          <Divider className="my-1" />
          {isPack ? (
            <>
              <DetailRow
                label="Items in Pack"
                value={(cost as any).item_count || packIds.length}
              />
              <DetailRow label="Total Cost" value={money(cost.total_cost)} highlight />
              <DetailRow label="Cost Per Item" value={money((cost as any).cost_per_item)} />
              <DetailRow label="Value Per Item" value={money((cost as any).value_per_item)} />
            </>
          ) : (
            <>
              <DetailRow label="Quantity" value={cost.quantity || 1} />
              <DetailRow label="Unit Cost" value={money(cost.unit_cost ?? cost.total_cost)} />
              {(cost.tax as number) > 0 && <DetailRow label="Tax" value={money(cost.tax)} />}
              <DetailRow label="Total Cost" value={money(cost.total_cost)} highlight />
              <DetailRow label="Item Value" value={money(cost.value ?? cost.total_cost)} />
            </>
          )}
          <Divider className="my-1" />
          <DetailRow
            label="Receipt"
            value={
              noReceipt ? (
                <Chip size="sm" color="warning" variant="flat">
                  No Receipt
                </Chip>
              ) : hasReceipt ? (
                <Chip size="sm" color="success" variant="flat">
                  On File
                </Chip>
              ) : (
                <Chip size="sm" variant="flat">
                  Not Uploaded
                </Chip>
              )
            }
          />
        </CardBody>
      </Card>

      <p className="mt-4 text-tiny text-default-400">
        Created {(cost as any).created_at ? new Date((cost as any).created_at).toLocaleDateString() : 'N/A'} by{' '}
        {(cost as any).created_by || 'system'}
        {(cost as any).updated_at !== (cost as any).created_at &&
          ` · Last updated ${new Date((cost as any).updated_at).toLocaleDateString()}`}
      </p>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Cost Record"
        body="Are you sure you want to delete this cost record? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
