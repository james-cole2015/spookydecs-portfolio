// ItemsCards — grid of item cards (#332)
import { Card, CardBody, CardFooter, Button, Chip } from '@heroui/react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { EmptyState, useToast, Typography, ConfirmDialog } from '@spookydecs/ui';
import { type Item } from '../api/types';
import { getPlaceholderIcon, getSeasonIcon, getStatusColor } from '../config/itemsConfig';
import { useState } from 'react';

interface Props {
  items: Item[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  canWrite: boolean;
  canDelete: boolean;
}

function statusVariant(status: string): 'success' | 'default' | 'primary' | 'danger' {
  if (status === 'Ready') return 'success';
  if (status === 'Deployed') return 'primary';
  if (status === 'Retired') return 'danger';
  return 'default';
}

export function ItemsCards({ items, onView, onEdit, onDelete, canWrite, canDelete }: Props) {
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  if (!items.length) {
    return <EmptyState title="No Items" message="No items match your filters." />;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await onDelete(deleteTarget.id);
    } catch (e: any) {
      toast.showError(e?.message ?? 'Delete failed.');
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const photo = item.images?.cloudfront_url;
          const placeholder = getPlaceholderIcon(item.class, item.season);
          const seasonIcon = getSeasonIcon(item.season);

          return (
            <Card
              key={item.id}
              isPressable
              onPress={() => onView(item.id)}
              className="cursor-pointer"
            >
              <CardBody className="p-0">
                <div className="flex items-start gap-3 p-4">
                  {photo ? (
                    <img src={photo} alt={item.short_name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-default-100 flex items-center justify-center text-3xl flex-shrink-0">
                      {placeholder}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <Typography type="h6" as="div" className="truncate text-foreground">{item.short_name}</Typography>
                      {item.maintenance?.repair_data?.needs_repair && item.operational_status !== false && (
                        <span title="Needs repair">🔧</span>
                      )}
                    </div>
                    <Typography type="body-xs" as="div" className="text-foreground-500">{item.class_type} · {seasonIcon} {item.season}</Typography>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Chip size="sm" variant="flat" color={statusVariant(item.status)}>{item.status}</Chip>
                      {item.operational_status === false && (
                        <Chip size="sm" variant="flat" color="danger">Non-Operational</Chip>
                      )}
                      {item.deployment_data && (item.deployment_data as any).deployed && (
                        <Chip size="sm" variant="flat" color="primary">Deployed</Chip>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
              {(canWrite || canDelete) && (
                <CardFooter className="pt-0 gap-2 justify-end">
                  <Button size="sm" variant="flat" startContent={<Eye size={14} />} onPress={(e) => { (e as any).stopPropagation?.(); onView(item.id); }}>
                    View
                  </Button>
                  {canWrite && (
                    <Button size="sm" variant="flat" startContent={<Pencil size={14} />} onPress={(e) => { (e as any).stopPropagation?.(); onEdit(item.id); }}>
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<Trash2 size={14} />}
                      onPress={(e) => { (e as any).stopPropagation?.(); setDeleteTarget(item); }}
                    >
                      Delete
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Item"
        body={`Delete "${deleteTarget?.short_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
