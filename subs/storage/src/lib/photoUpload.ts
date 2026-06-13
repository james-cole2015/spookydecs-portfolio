/**
 * Opens the shared <photo-upload-modal> CDN web component and resolves with the
 * uploaded photo IDs (or [] if cancelled).
 *
 * Upload remains a CDN concern (the modal is loaded via <script> in index.html).
 * The gallery itself is now the native React `PhotoGallery` from `@spookydecs/ui`;
 * this helper covers the storage create-wizard's standalone upload step.
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
