/**
 * ImageCard — typed HeroUI port of js/components/ImageCard.js (#336).
 * Grid card for the images-list page; whole card navigates to the detail view.
 */
import { Button, Card, Chip } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import type { Photo } from '../config/imagesConfig';

function categoryLabel(photoType: string): string {
  return photoType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ImageCard({ photo }: { photo: Photo }) {
  const navigate = useNavigate();

  const category = photo.photo_type || 'unknown';
  const orphaned =
    !photo.item_ids?.length &&
    !photo.idea_id &&
    !photo.deployment_id &&
    !photo.storage_id &&
    !photo.cost_ids?.length;

  return (
    <Card className="overflow-hidden">
      <div
        className="relative aspect-square w-full cursor-pointer overflow-hidden bg-content2"
        onClick={() => navigate(`/images/${photo.photo_id}`)}
      >
        <img
          src={photo.thumb_cloudfront_url || photo.cloudfront_url}
          alt={photo.caption || 'Image'}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {orphaned && (
          <Chip size="sm" color="warning" variant="solid" className="absolute left-2 top-2">
            Orphaned
          </Chip>
        )}
        <Chip size="sm" variant="solid" className="absolute right-2 top-2 bg-black/60 text-white">
          {categoryLabel(category)}
        </Chip>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="truncate font-mono text-tiny text-default-500">{photo.photo_id}</div>
        <div className="flex flex-wrap items-center gap-1">
          {photo.season && (
            <Chip size="sm" variant="flat" color="secondary">
              {photo.season}
            </Chip>
          )}
          {photo.is_public && (
            <Chip size="sm" variant="flat" color="success">
              Public
            </Chip>
          )}
          {(photo.item_ids || []).map((id) => (
            <Chip key={id} size="sm" variant="flat">
              {id}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={() => navigate(`/images/${photo.photo_id}`)}
          >
            View
          </Button>
          <Button
            size="sm"
            color="primary"
            onPress={() => navigate(`/images/${photo.photo_id}/edit`)}
          >
            Edit
          </Button>
        </div>
      </div>
    </Card>
  );
}
