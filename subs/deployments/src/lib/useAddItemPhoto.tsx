import { useCallback } from 'react';
import { useToast, usePhotoUpload } from '@spookydecs/ui';
import { updateConnectionPhotos, updatePlacement } from '../api/deploymentsApi';
import type { GraphInput } from './graphDerivation';

interface Options {
  deploymentId?: string;
  input?: GraphInput;
  season?: string;
  year?: number | string;
  /** Called after photos are attached so the caller can reload. */
  onAdded: () => Promise<unknown> | void;
}

/**
 * Upload photos for a deployed item and attach them to its record (#689; extracted from the
 * schematic). Photos attach to the item's declaration, or — for items wired without ever being
 * declared — to its inbound connection. Render `editor` once in the host component.
 */
export function useAddItemPhoto({ deploymentId, input, season, year, onAdded }: Options) {
  const toast = useToast();
  const photoUpload = usePhotoUpload();

  const addPhoto = useCallback(
    async (itemId: string) => {
      if (!deploymentId || !input) return;
      const placement = input.placements.find(
        (p) => p.item_id === itemId && (p.placement_type ?? 'deployment') === 'deployment',
      );
      const inbound = input.connections.find(
        (c) => c.to_item_id === itemId && (c.connection_type ?? 'deployment') === 'deployment',
      );
      if (!placement?.placement_id && !inbound?.connection_id) {
        toast.showError('Declare or connect this item before adding a photo');
        return;
      }
      try {
        const photos = await photoUpload.openWithEditor({
          context: 'deployment',
          photo_type: 'deployment',
          season: season || '',
          year: Number(year),
          // entityId maps to the context's id field (deployment_id), so it is the deployment;
          // the item travels as item_ids (#682).
          entityId: deploymentId,
          metadata: { item_ids: [itemId] },
        });
        if (photos.length === 0) return;
        const photoIds = photos.map((p) => p.photo_id);
        // The routes append to the record's existing photos, so only the new ids are sent.
        if (placement?.placement_id) await updatePlacement(deploymentId, placement.placement_id, { photo_ids: photoIds });
        else await updateConnectionPhotos(deploymentId, inbound!.connection_id!, photoIds);
        toast.showSuccess(photos.length === 1 ? 'Photo added' : `${photos.length} photos added`);
        await onAdded();
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to add photo');
      }
    },
    [deploymentId, input, season, year, onAdded, photoUpload, toast],
  );

  return { addPhoto, editor: photoUpload.editor };
}
