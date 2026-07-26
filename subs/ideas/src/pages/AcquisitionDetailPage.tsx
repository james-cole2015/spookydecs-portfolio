// Acquisition detail — hero, catalog fields, notes, timestamps, and gated
// edit/delete + Considering↔Passed transitions. A trimmed fork of the ideas
// DetailPage (no enrichment/costs/photo-gallery). The "Purchase" action is
// reserved for the W5 wizard (#496) — this page shows only a noted placeholder.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip, Link } from '@heroui/react';
import { ArrowLeft, Pencil, Trash2, ArrowRight } from 'lucide-react';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  Breadcrumbs,
  SeasonChip,
  StatusChip,
  useToast,
  useConfirm,
} from '@spookydecs/ui';
import { getAcquisition, updateAcquisition, deleteAcquisition } from '../api/acquisitionsApi';
import {
  ACQ_STATUS_COLOR,
  ITEMS_BASE_URL,
  SEASON_PLACEHOLDERS,
  type Acquisition,
  type AcquisitionStatus,
} from '../config/acquisitionsConfig';
import { formatDate, heroImageUrl } from '../lib/format';

function canWrite() {
  return window.SpookyAuth.hasMinRole('builder');
}

export default function AcquisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [acquisition, setAcquisition] = useState<Acquisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    setNotFound(false);
    getAcquisition(id!)
      .then((fetched) => {
        if (!fetched) {
          setNotFound(true);
          return;
        }
        setAcquisition(fetched);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  async function transition(newStatus: AcquisitionStatus, title: string, message: string) {
    if (!acquisition) return;
    const ok = await confirm({ title, body: message, confirmLabel: title });
    if (!ok) return;
    try {
      await updateAcquisition({ ...acquisition, status: newStatus });
      toast.showSuccess(`Moved to ${newStatus}`);
      const refreshed = await getAcquisition(id!);
      if (refreshed) setAcquisition(refreshed);
    } catch (err) {
      toast.showError('Failed: ' + (err as Error).message);
    }
  }

  async function handleDelete() {
    if (!acquisition) return;
    const ok = await confirm({
      title: 'Delete Acquisition',
      body: `Are you sure you want to delete "${acquisition.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteAcquisition(acquisition.acquisition_id);
      toast.showSuccess('Acquisition deleted');
      navigate('/acquisitions');
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
  if (notFound || !acquisition)
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <EmptyState
          icon="🛒"
          title="Acquisition Not Found"
          message={`No acquisition with ID ${id} could be found.`}
        />
        <div className="mt-4 flex justify-center">
          <Button color="primary" onPress={() => navigate('/acquisitions')}>
            Back to Acquisitions
          </Button>
        </div>
      </div>
    );

  const a = acquisition;
  const writable = canWrite();
  const isPurchased = a.status === 'Purchased';
  const hero = heroImageUrl(a.image ? [a.image] : undefined, a.url);
  const placeholder =
    SEASON_PLACEHOLDERS[(a.season || 'shared').toLowerCase()] || SEASON_PLACEHOLDERS.shared;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {dialog}
      <Breadcrumbs crumbs={[{ label: 'Acquisitions', to: '/acquisitions' }, { label: a.title }]} />

      {/* Featured media */}
      <Card className="mb-4 overflow-hidden">
        <div className="aspect-video w-full bg-default-100">
          {hero ? (
            <img src={hero} alt={a.title} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center p-12 text-default-300 [&_svg]:h-24 [&_svg]:w-24"
              dangerouslySetInnerHTML={{ __html: placeholder }}
            />
          )}
        </div>
      </Card>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeasonChip value={a.season} size="md" />
          <StatusChip value={a.status} colorMap={ACQ_STATUS_COLOR} size="md" />
        </div>
        {isPurchased && (
          <div className="flex flex-wrap items-center gap-2 rounded-medium bg-success/10 px-4 py-2 text-small text-success">
            ✓ Purchased{a.purchased_at ? ` on ${formatDate(a.purchased_at)}` : ''}.
            {a.item_id && (
              <Link href={`${ITEMS_BASE_URL}/items/${a.item_id}`} isExternal size="sm">
                View Item →
              </Link>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{a.title}</h1>
          {writable && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="flat"
                startContent={<Pencil size={15} />}
                onPress={() => navigate(`/acquisitions/${a.acquisition_id}/edit`)}
              >
                Edit
              </Button>
              {/* Considering ↔ Passed only. Purchased is owned by the W5 wizard. */}
              {a.status === 'Considering' && (
                <Button
                  size="sm"
                  variant="flat"
                  endContent={<ArrowRight size={15} />}
                  onPress={() =>
                    transition('Passed', 'Mark Passed', `Mark "${a.title}" as Passed?`)
                  }
                >
                  Mark Passed
                </Button>
              )}
              {a.status === 'Passed' && (
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    transition(
                      'Considering',
                      'Back to Considering',
                      `Move "${a.title}" back to Considering?`,
                    )
                  }
                >
                  ← Back to Considering
                </Button>
              )}
              {!isPurchased && (
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
          )}
        </div>
        {/* Reserved slot: the W5 purchase wizard (#496) mounts its entry here. */}
        {writable && !isPurchased && (
          <div className="rounded-medium border border-dashed border-default-300 px-4 py-2 text-tiny text-default-400">
            Purchasing arrives with the purchase wizard (W5) — it will create the linked item and
            finance cost.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="font-semibold">Description</CardHeader>
            <CardBody>
              <p className={`text-small ${a.description ? 'text-foreground/80' : 'text-default-400'}`}>
                {a.description || 'No description provided.'}
              </p>
            </CardBody>
          </Card>

          {a.notes && (
            <Card>
              <CardHeader className="font-semibold">Notes</CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-small text-foreground/80">{a.notes}</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader className="font-semibold">Catalog</CardHeader>
            <CardBody className="gap-2">
              <CatalogField
                label="Price"
                value={a.price != null ? `$${Number(a.price).toFixed(2)}` : undefined}
              />
              <CatalogField label="Quantity" value={a.quantity != null ? String(a.quantity) : undefined} />
              <CatalogField label="Retailer" value={a.retailer} />
              <CatalogField label="Priority" value={a.priority} />
              <div className="flex justify-between text-small">
                <span className="text-default-500">Product URL</span>
                {a.url ? (
                  <Link href={a.url} isExternal size="sm" className="break-all">
                    {a.url}
                  </Link>
                ) : (
                  <span className="text-default-400">—</span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="font-semibold">Info</CardHeader>
            <CardBody className="gap-3 text-small">
              <SidebarField label="Season" value={a.season} />
              <SidebarField label="Status" value={a.status} />
              <div className="flex flex-col gap-1">
                <span className="text-default-500">Tags</span>
                {a.tags?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {a.tags.map((t) => (
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
                <span className="break-all text-tiny text-default-400">{a.acquisition_id}</span>
              </div>
            </CardBody>
          </Card>

          {(a.createdAt || a.updatedAt) && (
            <div className="px-1 text-tiny text-default-400">
              {a.createdAt && <div>Created: {formatDate(a.createdAt)}</div>}
              {a.updatedAt && <div>Updated: {formatDate(a.updatedAt)}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalogField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-small">
      <span className="text-default-500">{label}</span>
      <span className={value ? 'text-foreground/80' : 'text-default-400'}>{value || '—'}</span>
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
