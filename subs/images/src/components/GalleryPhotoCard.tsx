/**
 * GalleryPhotoCard — typed HeroUI port of js/components/GalleryPhotoCard.js (#336).
 * Curation card for the gallery-manager: featured toggle, debounced sort-order,
 * edit nav, delete. Update/delete are delegated to the parent via callbacks
 * (the parent owns the API calls + ConfirmDialog).
 */
import { useRef } from 'react';
import { Button, Card, Chip, Input } from '@heroui/react';
import { SeasonChip } from '@spookydecs/ui';
import { Pencil, Star, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { canonicalSeason, type GalleryData, type Photo } from '../config/imagesConfig';

interface Props {
  photo: Photo;
  onUpdate: (photoId: string, updates: { gallery_data: GalleryData }) => void | Promise<void>;
  onDelete: (photo: Photo) => void;
}

export function GalleryPhotoCard({ photo, onUpdate, onDelete }: Props) {
  const navigate = useNavigate();
  const sortDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const galleryData: GalleryData = photo.gallery_data || {};
  const displayName = galleryData.display_name || 'Untitled';
  const location = galleryData.location || '';
  const isFeatured = !!galleryData.is_featured;
  const sortOrder = galleryData.sort_order ?? 0;

  function toggleFeatured() {
    void onUpdate(photo.photo_id, {
      gallery_data: { ...galleryData, is_featured: !isFeatured },
    });
  }

  function onSortChange(value: string) {
    if (sortDebounce.current) clearTimeout(sortDebounce.current);
    sortDebounce.current = setTimeout(() => {
      void onUpdate(photo.photo_id, {
        gallery_data: { ...galleryData, sort_order: parseInt(value, 10) || 0 },
      });
    }, 500);
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-content2">
        <img
          src={photo.thumb_cloudfront_url || photo.cloudfront_url}
          alt={displayName}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {isFeatured && (
          <Chip size="sm" color="primary" variant="solid" className="absolute right-2 top-2">
            ⭐ Featured
          </Chip>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        <h3 className="truncate text-medium font-semibold text-foreground">{displayName}</h3>
        {location && <p className="text-tiny text-default-500">📍 {location}</p>}

        <div className="flex flex-wrap items-center gap-1">
          <SeasonChip size="sm" variant="flat" value={canonicalSeason(photo.season)} />
          <Chip size="sm" variant="flat">
            📅 {photo.year}
          </Chip>
          <Chip size="sm" variant="flat" color={photo.is_public ? 'success' : 'default'}>
            {photo.is_public ? 'Public' : 'Private'}
          </Chip>
        </div>

        {photo.caption && <p className="text-tiny text-default-500">{photo.caption}</p>}

        {photo.tags && photo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {photo.tags.map((tag) => (
              <Chip key={tag} size="sm" variant="dot">
                {tag}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="flat"
            startContent={<Pencil size={14} />}
            onPress={() => navigate(`/images/${photo.photo_id}/edit?from=gallery`)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            color={isFeatured ? 'primary' : 'default'}
            variant={isFeatured ? 'solid' : 'flat'}
            startContent={<Star size={14} />}
            onPress={toggleFeatured}
          >
            {isFeatured ? 'Unfeature' : 'Feature'}
          </Button>
          <Button
            size="sm"
            color="danger"
            variant="flat"
            startContent={<Trash2 size={14} />}
            onPress={() => onDelete(photo)}
          >
            Delete
          </Button>
        </div>

        <Input
          size="sm"
          type="number"
          label="Sort Order"
          labelPlacement="outside-left"
          min={0}
          max={999}
          defaultValue={String(sortOrder)}
          onValueChange={onSortChange}
          className="max-w-[160px]"
        />
      </div>
    </Card>
  );
}
