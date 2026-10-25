import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardFooter, Chip, Button, Image, Divider } from '@heroui/react';
import { Luggage, Trash2 } from 'lucide-react';
import { getPlaceholderImage, STORAGE_STATUS_COLORS, type StorageUnit } from '../config/storageConfig';
import { Typography, SeasonChip, StatusChip, useAuth } from '@spookydecs/ui';

export function StorageCard({
  unit,
  onDelete,
  canDelete,
}: {
  unit: StorageUnit;
  onDelete?: (u: StorageUnit) => void;
  canDelete: boolean;
}) {
  const navigate = useNavigate();
  const { hasMinRole } = useAuth();
  const images = (unit.images as Record<string, string> | undefined) ?? {};
  const cover = images.photo_url || images.thumb_cloudfront_url || getPlaceholderImage();
  // Pack flow only applies to regular (non-supply) tote units that are not yet packed.
  const canPack = hasMinRole('builder') && unit.class_type === 'Tote' && !unit.is_supply_tote && !unit.packed;

  return (
    <Card shadow="md" isHoverable className="bg-content1">
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => navigate(`/storage/${unit.id}`)}
      >
        <div className="relative">
          <Image
            removeWrapper
            src={cover}
            alt={unit.short_name}
            radius="none"
            className="h-40 w-full object-cover"
          />
          <div className="absolute right-2 top-2 z-10 shadow">
            <StatusChip value={unit.status} colorMap={STORAGE_STATUS_COLORS} emptyLabel="Empty" variant="solid" />
          </div>
        </div>
        <CardBody className="gap-2">
          <div>
            <Typography type="h6" as="div" className="truncate text-foreground">{unit.short_name}</Typography>
            <Typography type="body-xs" as="div" className="truncate text-default-500">{unit.id}</Typography>
          </div>
          <div className="flex flex-wrap gap-1">
            <SeasonChip value={String(unit.season ?? '')} label={String(unit.season ?? '—')} />
            <Chip size="sm" variant="flat">{String(unit.class_type)}</Chip>
            {unit.location && <Chip size="sm" variant="flat">{String(unit.location)}</Chip>}
          </div>
        </CardBody>
      </button>
      <Divider />
      <CardFooter className="justify-between">
        <Typography type="body-xs" as="span" className="text-default-500">
          {typeof unit.contents_count === 'number' ? `${unit.contents_count} items` : ''}
        </Typography>
        <div className="flex gap-1">
          {canPack && (
            <Button
              size="sm"
              variant="flat"
              color="secondary"
              startContent={<Luggage size={16} />}
              onPress={() => navigate(`/storage/pack/${unit.id}`)}
              data-testid="pack-items-btn"
            >
              Pack items
            </Button>
          )}
          {canDelete && onDelete && (
            <Button size="sm" variant="light" color="danger" isIconOnly aria-label="Delete" onPress={() => onDelete(unit)}>
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
