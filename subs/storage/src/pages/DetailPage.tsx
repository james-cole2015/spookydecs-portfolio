import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip, Image, Divider } from '@heroui/react';
import { PackageCheck, Pencil, Trash2 } from 'lucide-react';
import { storageAPI, photosAPI } from '../api/storageApi';
import { getPlaceholderImage, seasonChipColor, type StorageUnit } from '../config/storageConfig';
import { StatusChip } from '../components/StatusChip';
import { Breadcrumbs, LoadingState, ErrorState, Typography, useAuth } from '@spookydecs/ui';
import { PhotoGallery } from '../components/PhotoGallery';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../lib/toast';

interface ContentItem {
  id: string;
  short_name?: string;
  season?: string;
  images?: { primary_photo_id?: string; photo_url?: string | null };
  [key: string]: unknown;
}

export default function DetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { hasMinRole } = useAuth();
  const toast = useToast();

  const [unit, setUnit] = useState<StorageUnit | null>(null);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'delete' | 'pack' | { type: 'remove'; itemId: string }>(null);
  const [busy, setBusy] = useState(false);

  const canWrite = hasMinRole('builder');
  const canDelete = hasMinRole('admin');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await storageAPI.getById(id);
      if (!data) throw new Error('Storage unit not found');

      const headerPhotoId =
        (data.images as Record<string, string> | undefined)?.primary_photo_id ||
        (data.images as Record<string, string> | undefined)?.photo_id;
      if (headerPhotoId) {
        const photo = await photosAPI.getById(headerPhotoId).catch(() => null);
        if (photo) {
          data.images = {
            ...(data.images as Record<string, unknown>),
            photo_url: photo.cloudfront_url,
            thumb_cloudfront_url: photo.thumb_cloudfront_url,
          };
        }
      }

      const rawContents = (data.contents_details as ContentItem[]) ?? [];
      const photoIds = rawContents.map((c) => c.images?.primary_photo_id).filter((p): p is string => Boolean(p));
      let enriched = rawContents;
      if (photoIds.length > 0) {
        const photoMap = await photosAPI.getByIds(photoIds);
        enriched = rawContents.map((c) => {
          const pid = c.images?.primary_photo_id;
          const photo = pid ? photoMap[pid] : null;
          return { ...c, images: { ...c.images, photo_url: photo?.cloudfront_url ?? null } };
        });
      }

      setUnit(data);
      setContents(enriched);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load storage unit');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function doDelete() {
    if (!unit) return;
    if ((unit.contents_count ?? 0) > 0) {
      toast.showError('Cannot delete a storage unit with contents. Remove all items first.');
      setConfirm(null);
      return;
    }
    setBusy(true);
    try {
      await storageAPI.delete(unit.id);
      toast.showSuccess(`Storage unit "${unit.short_name}" deleted`);
      navigate('/storage');
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to delete storage unit');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function doPack() {
    if (!unit) return;
    setBusy(true);
    try {
      await storageAPI.update(unit.id, { packed: true });
      toast.showSuccess(`${unit.short_name} marked as packed`);
      setConfirm(null);
      await load();
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to pack storage unit');
    } finally {
      setBusy(false);
    }
  }

  async function doRemove(itemId: string) {
    if (!unit) return;
    setBusy(true);
    try {
      await storageAPI.removeItems(unit.id, [itemId]);
      if (unit.packed) await storageAPI.update(unit.id, { packed: false });
      toast.showSuccess('Item removed from storage unit');
      setConfirm(null);
      await load();
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to remove item');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading storage unit…" />;
  if (error || !unit) return <ErrorState message={error ?? 'Not found'} onRetry={load} />;

  const images = (unit.images as Record<string, string> | undefined) ?? {};
  const hero = images.photo_url || images.thumb_cloudfront_url || getPlaceholderImage();
  const isSelf = unit.class_type === 'Self';

  return (
    <div>
      <Breadcrumbs
        crumbs={[{ label: 'Storage', to: '/' }, { label: 'Totes', to: '/storage' }, { label: unit.short_name }]}
      />

      <Card shadow="md" className="bg-content1">
        <CardHeader className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <Image src={hero} alt={unit.short_name} width={120} height={120} radius="lg" className="h-[120px] w-[120px] object-cover" />
            <div>
              <Typography type="h4" className="text-foreground">{unit.short_name}</Typography>
              <Typography type="body-sm" className="text-default-500">{unit.id}</Typography>
              <div className="mt-2 flex flex-wrap gap-1">
                <Chip size="sm" variant="flat" color={seasonChipColor(String(unit.season))}>{String(unit.season ?? '—')}</Chip>
                <Chip size="sm" variant="flat">{String(unit.class_type)}</Chip>
                {unit.location && <Chip size="sm" variant="flat">{String(unit.location)}</Chip>}
                {unit.size && <Chip size="sm" variant="flat">{String(unit.size)}</Chip>}
                <StatusChip packed={unit.packed} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isSelf && !unit.packed && canWrite && (
              <Button color="secondary" variant="flat" startContent={<PackageCheck size={18} />} onPress={() => setConfirm('pack')}>Pack</Button>
            )}
            {canWrite && (
              <Button variant="flat" startContent={<Pencil size={18} />} onPress={() => navigate(`/storage/${unit.id}/edit`)}>Edit</Button>
            )}
            {canDelete && (
              <Button color="danger" variant="light" startContent={<Trash2 size={18} />} onPress={() => setConfirm('delete')}>Delete</Button>
            )}
          </div>
        </CardHeader>
        {unit.general_notes ? (
          <CardBody className="pt-0">
            <Typography type="body" className="text-default-500">{String(unit.general_notes)}</Typography>
          </CardBody>
        ) : null}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card shadow="md" className="bg-content1">
          <CardHeader>
            <Typography type="h5" className="text-foreground">Photos</Typography>
          </CardHeader>
          <Divider />
          <CardBody>
            <PhotoGallery storageId={unit.id} season={String(unit.season ?? 'shared')} />
          </CardBody>
        </Card>

        <Card shadow="md" className="bg-content1">
          <CardHeader>
            <Typography type="h5" className="text-foreground">Contents ({contents.length})</Typography>
          </CardHeader>
          <Divider />
          <CardBody className="gap-2">
            {contents.length === 0 ? (
              <Typography type="body-sm" className="py-6 text-center text-default-500">
                No items in this storage unit.
              </Typography>
            ) : (
              contents.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-default-100 p-2">
                  <Image
                    src={item.images?.photo_url || getPlaceholderImage()}
                    alt={item.short_name ?? item.id}
                    width={44}
                    height={44}
                    radius="sm"
                    className="h-11 w-11 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Typography type="body-sm" as="div" className="truncate text-foreground">{item.short_name ?? item.id}</Typography>
                    <Typography type="body-xs" as="div" className="truncate text-default-500">{item.id}</Typography>
                  </div>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => setConfirm({ type: 'remove', itemId: item.id })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirm === 'delete'}
        title="Delete storage unit?"
        body={<p>Delete <strong>{unit.short_name}</strong>? This cannot be undone.</p>}
        confirmLabel="Delete"
        confirmColor="danger"
        isLoading={busy}
        onConfirm={doDelete}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        isOpen={confirm === 'pack'}
        title="Confirm pack"
        body={<p>Mark <strong>{unit.short_name}</strong> and its item as packed?</p>}
        confirmLabel="Mark as Packed"
        confirmColor="secondary"
        isLoading={busy}
        onConfirm={doPack}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        isOpen={typeof confirm === 'object' && confirm?.type === 'remove'}
        title="Remove item?"
        body={<p>Remove this item from <strong>{unit.short_name}</strong>? Its packing status resets to unpacked.</p>}
        confirmLabel="Remove"
        confirmColor="danger"
        isLoading={busy}
        onConfirm={() => typeof confirm === 'object' && confirm?.type === 'remove' && doRemove(confirm.itemId)}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
