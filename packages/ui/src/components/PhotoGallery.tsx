/**
 * PhotoGallery — the native React/HeroUI photo gallery for SpookyDecs React subs.
 *
 * Reproduces the contract of the CDN `<photo-gallery>` web component
 * (`configs-spookydecs/components/photo-gallery.js`) for subs that live inside a
 * React tree, so the gallery can read theme/config/auth context instead of
 * bolting a Shadow-DOM custom element inside the app. The CDN component stays in
 * place for vanilla subs; this is the parallel React equivalent.
 *
 * Built on HeroUI primitives — `Image` (native lazy-load + blur-up placeholder)
 * for the grid and a HeroUI `Modal` for the lightbox, replacing the CDN
 * component's hand-rolled `loading="lazy"` images and fixed-overlay/z-index
 * lightbox block. Theme-aware by virtue of being HeroUI-composed (the CDN
 * gallery renders a fixed light palette).
 *
 * Upload stays a CDN concern: "Add Photos" delegates to the existing CDN
 * `<photo-upload-modal>` imperatively (same pattern storage already ships) and
 * refreshes on `upload-complete`. No native upload UI is built here.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Chip, Image, Modal, ModalContent, Spinner } from '@heroui/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useConfig } from '../providers/ConfigProvider';

/** The entity contexts the gallery understands (mirrors the CDN CONTEXT_MAP). */
export type PhotoGalleryContext = 'item' | 'storage' | 'idea' | 'maintenance' | 'deployment';

/** Context → { queryParam (GET), setPrimaryKey (POST body) }. Ported from the CDN component. */
const CONTEXT_MAP: Record<PhotoGalleryContext, { queryParam: string; setPrimaryKey: string }> = {
  item: { queryParam: 'item_id', setPrimaryKey: 'item_id' },
  storage: { queryParam: 'storage_id', setPrimaryKey: 'storage_id' },
  idea: { queryParam: 'idea_id', setPrimaryKey: 'idea_id' },
  maintenance: { queryParam: 'record_id', setPrimaryKey: 'record_id' },
  deployment: { queryParam: 'deployment_id', setPrimaryKey: 'deployment_id' },
};

/** A photo record as returned by `GET /admin/images`. */
interface Photo {
  photo_id: string;
  cloudfront_url?: string;
  thumb_cloudfront_url?: string;
  is_primary?: boolean;
}

export interface PhotoGalleryProps {
  /** Entity context; drives the query param, the set-primary body key, and the upload modal. */
  context: PhotoGalleryContext;
  /** The entity's id (storage unit id, item id, …). Collapses the CDN's five id attributes. */
  entityId: string;
  /** Passed through to the upload modal. Default `'shared'`. */
  season?: string;
  /** Photo-type tag passed to the upload modal. Default = `context`. */
  photoType?: string;
  /** Hard cap on total photos; hides "Add Photos" at the limit. Default unlimited. */
  maxPhotos?: number;
  /** Hide the "Set as Primary" affordance. Default false. */
  noSetPrimary?: boolean;
  /** Render the CDN-delegating "Add Photos" button. Default true. */
  enableUpload?: boolean;
}

export function PhotoGallery({
  context,
  entityId,
  season = 'shared',
  photoType,
  maxPhotos = Infinity,
  noSetPrimary = false,
  enableUpload = true,
}: PhotoGalleryProps) {
  const config = useConfig();
  const apiEndpoint = config.API_ENDPOINT;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  // Lightbox state.
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const reload = useCallback(async () => {
    const map = CONTEXT_MAP[context];
    if (!map || !entityId) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ [map.queryParam]: entityId });
      const res = await fetch(`${apiEndpoint}/admin/images?${params}`, {
        headers: window.SpookyAuth.buildHeaders(),
      });
      if (res.status === 401) {
        await window.SpookyAuth.redirectToLogin();
        return;
      }
      const data = await res.json();
      const payload = data.data || data;
      setPhotos(payload.photos || []);
    } catch (err) {
      console.error('PhotoGallery: failed to load photos', err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, context, entityId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const primary = useMemo(() => photos.find((p) => p.is_primary) ?? null, [photos]);
  // Everything that isn't the chosen primary is secondary — keyed by photo_id, not
  // the is_primary flag, so malformed data with duplicate (or zero) primaries still
  // renders every photo instead of dropping the extras.
  const secondary = useMemo(
    () => photos.filter((p) => p.photo_id !== primary?.photo_id),
    [photos, primary],
  );

  // Lightbox order = primary first, then secondary (matches the CDN component).
  const lightboxPhotos = useMemo(
    () => (primary ? [primary, ...secondary] : secondary),
    [primary, secondary],
  );

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const navLightbox = useCallback(
    (delta: number) => {
      const len = lightboxPhotos.length;
      if (len < 2) return;
      setLightboxIndex((i) => (i + delta + len) % len);
    },
    [lightboxPhotos.length],
  );

  // ArrowLeft/ArrowRight while the lightbox is open (Escape is native to HeroUI Modal).
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navLightbox(-1);
      if (e.key === 'ArrowRight') navLightbox(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, navLightbox]);

  async function handleSetPrimary(photoId: string) {
    const map = CONTEXT_MAP[context];
    if (!map || !entityId) return;
    setSettingPrimaryId(photoId);
    try {
      const res = await fetch(`${apiEndpoint}/admin/images/set_primary`, {
        method: 'POST',
        headers: {
          ...window.SpookyAuth.buildHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo_id: photoId,
          context,
          [map.setPrimaryKey]: entityId,
        }),
      });
      if (!res.ok) {
        // Surface the server's message (e.g. "storage record not found") rather
        // than swallowing it behind a bare status code.
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
      }
      await reload();
    } catch (err) {
      console.error('PhotoGallery: set primary failed', err);
    } finally {
      setSettingPrimaryId(null);
    }
  }

  /**
   * Delegate to the CDN `<photo-upload-modal>` (loaded via <script> in the sub's
   * index.html), forwarding the same attributes the CDN gallery does and
   * reloading on `upload-complete`. No native upload UI is built here.
   */
  function openUploadModal() {
    const remaining = Number.isFinite(maxPhotos) ? maxPhotos - photos.length : 10;
    if (remaining <= 0) return;
    const map = CONTEXT_MAP[context];

    const modal = document.createElement('photo-upload-modal');
    modal.setAttribute('context', context);
    modal.setAttribute('photo-type', photoType ?? context);
    modal.setAttribute('season', season || 'shared');
    if (map && entityId) modal.setAttribute(`${context}-id`, entityId);
    if (Number.isFinite(maxPhotos)) modal.setAttribute('max-photos', String(remaining));

    const onComplete = () => {
      modal.removeEventListener('upload-complete', onComplete);
      modal.remove();
      void reload();
    };
    modal.addEventListener('upload-complete', onComplete);
    document.body.appendChild(modal);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner label="Loading photos…" color="secondary" size="sm" />
      </div>
    );
  }

  const total = photos.length;
  const atLimit = total >= maxPhotos;
  const isEmpty = !primary && secondary.length === 0;
  const showSetPrimary = !noSetPrimary;

  return (
    <div className="flex flex-col gap-4">
      {isEmpty && (
        <div className="rounded-medium border border-dashed border-default-300 bg-default-50 px-4 py-6 text-center text-small text-default-400">
          No photos yet. Add one using the button below.
        </div>
      )}

      {primary && (
        <section>
          <p className="mb-2 text-tiny font-semibold uppercase tracking-wide text-default-400">
            Primary Photo
          </p>
          <div className="relative inline-block cursor-zoom-in" onClick={() => openLightbox(0)}>
            <Image
              src={primary.thumb_cloudfront_url || primary.cloudfront_url}
              alt="Primary photo"
              radius="md"
              className="max-h-[300px] w-auto object-cover"
            />
            <Chip
              size="sm"
              color="primary"
              variant="solid"
              className="absolute left-2 top-2 z-10"
            >
              Primary
            </Chip>
          </div>
        </section>
      )}

      {secondary.length > 0 && (
        <section>
          <p className="mb-2 text-tiny font-semibold uppercase tracking-wide text-default-400">
            Additional Photos
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
            {secondary.map((p, i) => {
              const lightboxIdx = primary ? i + 1 : i;
              return (
                <div key={p.photo_id} className="group relative aspect-square">
                  <div
                    className="h-full w-full cursor-zoom-in overflow-hidden rounded-medium"
                    onClick={() => openLightbox(lightboxIdx)}
                  >
                    <Image
                      src={p.thumb_cloudfront_url || p.cloudfront_url}
                      alt="Photo"
                      radius="md"
                      removeWrapper
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {showSetPrimary && (
                    <Button
                      size="sm"
                      variant="solid"
                      className="absolute inset-x-0 bottom-1 z-10 mx-auto w-fit bg-black/70 text-tiny text-white opacity-0 transition-opacity group-hover:opacity-100"
                      isLoading={settingPrimaryId === p.photo_id}
                      onPress={() => handleSetPrimary(p.photo_id)}
                    >
                      {settingPrimaryId === p.photo_id ? 'Saving…' : 'Set as Primary'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {enableUpload && !atLimit && (
        <div>
          <Button size="sm" variant="bordered" onPress={openUploadModal}>
            + Add Photos
          </Button>
        </div>
      )}

      <Modal
        isOpen={lightboxOpen}
        onOpenChange={setLightboxOpen}
        size="full"
        backdrop="blur"
        hideCloseButton
        classNames={{ base: 'bg-transparent shadow-none' }}
      >
        <ModalContent>
          {(onClose) => {
            const url =
              lightboxPhotos[lightboxIndex]?.cloudfront_url ||
              lightboxPhotos[lightboxIndex]?.thumb_cloudfront_url;
            const len = lightboxPhotos.length;
            return (
              <div className="relative flex h-full w-full items-center justify-center">
                <img
                  src={url}
                  alt="Photo"
                  className="max-h-[calc(100vh-4rem)] max-w-[calc(100vw-6rem)] select-none object-contain"
                />
                <Button
                  isIconOnly
                  aria-label="Close"
                  variant="flat"
                  radius="full"
                  className="absolute right-4 top-4 bg-white/15 text-white"
                  onPress={onClose}
                >
                  <X size={22} />
                </Button>
                {len > 1 && (
                  <>
                    <Button
                      isIconOnly
                      aria-label="Previous"
                      variant="flat"
                      radius="full"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/15 text-white"
                      onPress={() => navLightbox(-1)}
                    >
                      <ChevronLeft size={26} />
                    </Button>
                    <Button
                      isIconOnly
                      aria-label="Next"
                      variant="flat"
                      radius="full"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/15 text-white"
                      onPress={() => navLightbox(1)}
                    >
                      <ChevronRight size={26} />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-small text-white/70">
                      {lightboxIndex + 1} / {len}
                    </div>
                  </>
                )}
              </div>
            );
          }}
        </ModalContent>
      </Modal>
    </div>
  );
}
