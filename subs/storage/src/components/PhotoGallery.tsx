import { useEffect, useRef } from 'react';

/**
 * Thin React wrapper around the shared <photo-gallery> CDN web component.
 * Mounts it imperatively so we don't need JSX typings for the custom element.
 */
export function PhotoGallery({
  storageId,
  season,
  maxPhotos = 2,
}: {
  storageId: string;
  season: string;
  maxPhotos?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = '';
    const gallery = document.createElement('photo-gallery');
    gallery.setAttribute('context', 'storage');
    gallery.setAttribute('storage-id', storageId);
    gallery.setAttribute('season', season || 'shared');
    gallery.setAttribute('photo-type', 'storage');
    gallery.setAttribute('max-photos', String(maxPhotos));
    host.appendChild(gallery);
    return () => {
      host.innerHTML = '';
    };
  }, [storageId, season, maxPhotos]);

  return <div ref={ref} />;
}

/**
 * Opens the shared <photo-upload-modal> CDN web component and resolves with the
 * uploaded photo IDs (or [] if cancelled).
 */
export function openPhotoUploadModal(season: string): Promise<string[]> {
  return new Promise((resolve) => {
    const modal = document.createElement('photo-upload-modal');
    modal.setAttribute('context', 'storage');
    modal.setAttribute('photo-type', 'storage');
    modal.setAttribute('season', (season || '').toLowerCase());
    modal.setAttribute('max-photos', '5');
    modal.setAttribute('year', String(new Date().getFullYear()));

    const cleanup = () => modal.remove();
    modal.addEventListener('upload-complete', (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      cleanup();
      resolve(detail.photo_ids ?? []);
    });
    modal.addEventListener('upload-cancel', () => {
      cleanup();
      resolve([]);
    });
    document.body.appendChild(modal);
  });
}
