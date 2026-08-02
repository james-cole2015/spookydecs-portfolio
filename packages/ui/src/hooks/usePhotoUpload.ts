/**
 * usePhotoUpload — the shared React upload primitive for SpookyDecs React subs.
 *
 * Third member of the shared photo trio alongside `PhotoGallery` (display) and
 * `PhotoLightbox` (full-screen view). Replaces the per-sub `src/lib/photoUpload.ts`
 * glue (e.g. storage's `openPhotoUploadModal`) so subs stop re-writing the same
 * wrapper around the CDN `<photo-upload-modal>` / `<photo-upload-service>`.
 *
 * Upload stays a **CDN concern** — the `photo-upload-modal.js` + `photo-upload-service.js`
 * scripts remain loaded via <script> in each consumer's index.html. This hook only
 * standardizes the React glue; it does not reimplement the upload pipeline.
 *
 * Two entry points cover the two real call shapes:
 *   - `open(opts)`            → mounts the modal UI, resolves with the uploaded photos
 *                               (or [] if the user cancels). Mirrors the storage
 *                               create-wizard flow.
 *   - `uploadFiles(files,opts)` → drives the headless service directly (no UI),
 *                               resolves with the uploaded photos or throws on
 *                               failure. Mirrors the ideas cost-log receipt upload.
 *   - `openWithEditor(opts)`  → native file picker → shared `ImageEditorModal`
 *                               (crop/rotate/brightness, #482) → the same headless
 *                               `uploadFiles`. Drop-in replacement for `open()` that
 *                               adds a pre-upload edit step; mount the returned
 *                               `editor` element once in the tree.
 *
 * Both translate a single `entityId` to the per-context id field the CDN components
 * expect (`item-id`/`idea_id`/…). Non-standard contexts (e.g. `receipt`, which has
 * no id of its own and rides on `idea_id`) can override via `idField` or pass
 * additional `metadata`.
 */
import { createElement, Fragment, useCallback, useMemo, type ReactElement } from 'react';
import { useImageEditor } from './useImageEditor';
import { useFilePicker } from './useFilePicker';

/** A photo record as returned by the CDN upload pipeline (`/confirm`). */
export interface UploadedPhoto {
  photo_id: string;
  cloudfront_url?: string;
  thumb_cloudfront_url?: string;
  is_primary?: boolean;
  [key: string]: unknown;
}

/** Standard entity contexts → the id field the CDN components key on (snake_case). */
const CONTEXT_ID_KEY: Record<string, string> = {
  item: 'item_id',
  storage: 'storage_id',
  idea: 'idea_id',
  deployment: 'deployment_id',
  maintenance: 'record_id',
};

/** Resolve the id field name for a context, honoring an explicit override. */
function resolveIdKey(context: string, idField?: string): string | undefined {
  return idField ?? CONTEXT_ID_KEY[context];
}

export interface PhotoUploadOptions {
  /** Upload context — drives the id field, defaults photo type, and the CDN endpoint. */
  context: string;
  /** Photo-type tag. Defaults to `context`. */
  photo_type?: string;
  /** Season bucket. Defaults to `'shared'`. */
  season?: string;
  /** The entity's id; mapped to the context's id field (e.g. `storage_id`). */
  entityId?: string;
  /**
   * Override the id field name for non-standard contexts (e.g. a `receipt` upload
   * that rides on `idea_id`). Falls back to the CONTEXT_ID_KEY mapping.
   */
  idField?: string;
  /** Optional category tag (e.g. `'inspiration'` for idea catalog photos). */
  category?: string;
  /** Calendar year bucket. Defaults to the current year. */
  year?: number;
  /** Extra metadata merged into the upload (passthrough for edge-case contexts). */
  metadata?: Record<string, string | number | boolean>;
  /**
   * Mark uploads public (gallery context) — emitted as `is_public` in the upload
   * metadata, which the CDN service forwards to `/presign` and `/confirm`. Default false.
   * Available on every entry point (modal, headless, and editor) so the headless/editor
   * paths honor public too (#482 makes this live; #481 forwards it in the CDN modal).
   */
  isPublic?: boolean;
}

/** Options specific to the modal flow (`open`). */
export interface OpenPhotoUploadOptions extends PhotoUploadOptions {
  /** Max photos the modal will accept. Defaults to the modal's own default (10). */
  maxPhotos?: number;
}

/** Minimal structural type for the CDN `<photo-upload-service>` custom element. */
interface PhotoUploadServiceElement extends HTMLElement {
  upload(
    files: File[] | FileList,
    metadata: Record<string, unknown>,
  ): Promise<{ success: boolean; photo_ids: string[]; photos: UploadedPhoto[] }>;
}

export interface UsePhotoUpload {
  /**
   * Mount the CDN `<photo-upload-modal>` and resolve with the uploaded photos
   * once the user completes the flow, or `[]` if they cancel.
   */
  open: (opts: OpenPhotoUploadOptions) => Promise<UploadedPhoto[]>;
  /**
   * Drive the headless CDN `<photo-upload-service>` directly (no UI) and resolve
   * with the uploaded photos. Rejects if the service reports failure.
   */
  uploadFiles: (
    files: File[] | FileList,
    opts: PhotoUploadOptions,
  ) => Promise<UploadedPhoto[]>;
  /**
   * Open the shared dropzone (drag-and-drop / browse), run the chosen images through
   * the shared pre-upload editor (`ImageEditorModal`), then upload the edited files via
   * `uploadFiles`. Drop-in return shape identical to `open()`; resolves `[]` if nothing
   * is picked. Mount `editor` once in the component tree for the modals to render.
   */
  openWithEditor: (opts: PhotoUploadOptions) => Promise<UploadedPhoto[]>;
  /** The dropzone + editor elements to mount once (paired with `openWithEditor`). */
  editor: ReactElement;
}

export function usePhotoUpload(): UsePhotoUpload {
  const { editFiles, editor: editorModal } = useImageEditor();
  const { pickFiles, picker } = useFilePicker();

  /** Build the metadata object every entry point shares. */
  const buildMetadata = useCallback((opts: PhotoUploadOptions): Record<string, unknown> => {
    const idKey = resolveIdKey(opts.context, opts.idField);
    return {
      context: opts.context,
      photo_type: opts.photo_type ?? opts.context,
      season: opts.season || 'shared',
      year: opts.year ?? new Date().getFullYear(),
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.isPublic ? { is_public: true } : {}),
      ...(idKey && opts.entityId ? { [idKey]: opts.entityId } : {}),
      ...(opts.metadata ?? {}),
    };
  }, []);

  const open = useCallback(
    (opts: OpenPhotoUploadOptions): Promise<UploadedPhoto[]> =>
      new Promise((resolve) => {
        const modal = document.createElement('photo-upload-modal');
        const meta = buildMetadata(opts);
        // The modal reads hyphenated attributes; translate snake_case keys.
        for (const [key, value] of Object.entries(meta)) {
          modal.setAttribute(key.replace(/_/g, '-'), String(value));
        }
        if (opts.maxPhotos != null) modal.setAttribute('max-photos', String(opts.maxPhotos));

        const cleanup = () => {
          modal.removeEventListener('upload-complete', onComplete);
          modal.removeEventListener('upload-cancel', onCancel);
          modal.remove();
        };
        const onComplete = (e: Event) => {
          const detail = (e as CustomEvent).detail ?? {};
          cleanup();
          resolve((detail.photos as UploadedPhoto[]) ?? []);
        };
        const onCancel = () => {
          cleanup();
          resolve([]);
        };
        modal.addEventListener('upload-complete', onComplete);
        modal.addEventListener('upload-cancel', onCancel);
        document.body.appendChild(modal);
      }),
    [buildMetadata],
  );

  const uploadFiles = useCallback(
    async (files: File[] | FileList, opts: PhotoUploadOptions): Promise<UploadedPhoto[]> => {
      if (!files || (files as File[]).length === 0) return [];
      const service = document.createElement('photo-upload-service') as PhotoUploadServiceElement;
      try {
        const result = await service.upload(files, buildMetadata(opts));
        if (!result?.success) throw new Error('Photo upload service returned failure');
        return result.photos ?? [];
      } finally {
        service.remove();
      }
    },
    [buildMetadata],
  );

  const openWithEditor = useCallback(
    async (opts: PhotoUploadOptions): Promise<UploadedPhoto[]> => {
      const picked = await pickFiles();
      if (picked.length === 0) return [];
      const edited = await editFiles(picked);
      return uploadFiles(edited, opts);
    },
    [pickFiles, editFiles, uploadFiles],
  );

  // One element mounts both the dropzone and the per-file editor modal.
  const editor = useMemo(
    () => createElement(Fragment, null, picker, editorModal),
    [picker, editorModal],
  );

  return useMemo(
    () => ({ open, uploadFiles, openWithEditor, editor }),
    [open, uploadFiles, openWithEditor, editor],
  );
}
