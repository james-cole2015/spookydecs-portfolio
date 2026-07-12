import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardFooter, Chip, Button, Image, Divider } from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { getPlaceholderImage, seasonChipColor, type StorageUnit } from '../config/storageConfig';
import { Typography } from '@spookydecs/ui';
import { StatusChip } from './StatusChip';

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
  const images = (unit.images as Record<string, string> | undefined) ?? {};
  const cover = images.photo_url || images.thumb_cloudfront_url || getPlaceholderImage();

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
            <StatusChip packed={unit.packed} variant="solid" />
          </div>
        </div>
        <CardBody className="gap-2">
          <div>
            <Typography type="h6" as="div" className="truncate text-foreground">{unit.short_name}</Typography>
            <Typography type="body-xs" as="div" className="truncate text-default-500">{unit.id}</Typography>
          </div>
          <div className="flex flex-wrap gap-1">
            <Chip size="sm" variant="flat" color={seasonChipColor(String(unit.season))}>
              {String(unit.season ?? '—')}
            </Chip>
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
