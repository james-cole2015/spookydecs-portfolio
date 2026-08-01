/**
 * LibraryImageEditor — the powerful post-upload / library re-edit editor (#523),
 * built on `react-filerobot-image-editor`. Unlike the pre-upload `ImageEditorModal`
 * (react-easy-crop, which is fundamentally a crop widget), this one opens on a
 * *non-crop* tab and offers finetune (brightness/contrast/HSV/warmth/blur),
 * annotate (text/shapes/pen/arrows), filters, resize, and rotate/flip — with crop
 * available as one optional tab, not the default.
 *
 * Contract mirrors `ImageEditorModal`'s apply/close surface: it loads a CDN image
 * URL onto the canvas, and on save hands the caller a finished `Blob` (`onApply`),
 * so `ImageDetail`'s presign-replace → PUT → reprocess pipeline is reused unchanged.
 *
 * Filerobot (and its heavy `konva` dependency) is lazy-loaded via `React.lazy`, so
 * it lands in a separate chunk fetched only when the editor opens — never in the
 * images entry bundle (same precedent as `rasterizePdf.ts`'s dynamic import).
 *
 * Dependency note: Filerobot auto-pulls `react-konva`, whose latest line targets
 * React 19. This workspace is React 18, so `react-konva`/`konva` are pinned to the
 * React-18 line via explicit `packages/ui` deps plus a root `overrides` entry.
 */
import { lazy, Suspense } from 'react';
// Type-only import: fully erased at compile time, so it does NOT create a runtime
// import and does not defeat the lazy chunk below.
import type { FilerobotImageEditorConfig } from 'react-filerobot-image-editor';

// Lazy so konva/Filerobot are code-split into their own chunk (loaded on open only).
const FilerobotImageEditor = lazy(() => import('react-filerobot-image-editor'));

export interface LibraryImageEditorProps {
  isOpen: boolean;
  /** CDN image URL to edit. `null` when closed. */
  source: string | null;
  /** Called with the finished image once the user saves their edits. */
  onApply: (blob: Blob) => void;
  /** Called on dismiss/cancel without saving. */
  onClose: () => void;
}

type FilerobotTab = NonNullable<FilerobotImageEditorConfig['defaultTabId']>;
type FilerobotTool = NonNullable<FilerobotImageEditorConfig['defaultToolId']>;

// Open on Finetune (brightness/contrast/etc.), not Crop. Crop still lives in the
// Adjust tab, so it stays available — just not the landing tab. Order = tab order.
const TABS_IDS: FilerobotTab[] = ['Finetune', 'Filters', 'Annotate', 'Resize', 'Adjust'];
const DEFAULT_TAB: FilerobotTab = 'Finetune';
const DEFAULT_TOOL: FilerobotTool = 'Brightness';

export function LibraryImageEditor({ isOpen, source, onApply, onClose }: LibraryImageEditorProps) {
  if (!isOpen || !source) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen bg-black">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center text-white">
            Loading editor…
          </div>
        }
      >
        <FilerobotImageEditor
          source={source}
          tabsIds={TABS_IDS}
          defaultTabId={DEFAULT_TAB}
          defaultToolId={DEFAULT_TOOL}
          // Match the pre-upload editor's output so the reprocess pipeline is fed
          // the same format it already handles.
          defaultSavedImageType="jpeg"
          defaultSavedImageQuality={0.92}
          // Export at the image's native resolution (no devicePixelRatio upscale).
          savingPixelRatio={1}
          previewPixelRatio={1}
          onSave={async (saved) => {
            if (!saved.imageBase64) return;
            const blob = await fetch(saved.imageBase64).then((r) => r.blob());
            onApply(blob);
          }}
          onClose={onClose}
        />
      </Suspense>
    </div>
  );
}
