/**
 * useImageEditor — imperative, promise-based batch driver for `ImageEditorModal`,
 * built the same way `useConfirm` pairs with `ConfirmDialog`. Call `editFiles(files)`
 * and `await` the edited `File[]`; mount `editor` once in the tree.
 *
 *   const { editFiles, editor } = useImageEditor();
 *   const edited = await editFiles(picked);   // one modal per image, in sequence
 *   // …then render `{editor}` somewhere in the component.
 *
 * Non-image files pass straight through. On Apply the modal's `Blob` is re-wrapped
 * into a `File` (original name preserved; the canvas output MIME may differ — presign
 * validates against the allow-list). On "Use original"/dismiss, the source passes through.
 */
import { createElement, useCallback, useMemo, useRef, useState, type ReactElement } from 'react';
import { ImageEditorModal } from '../components/ImageEditorModal';

export interface UseImageEditor {
  /** Present each image `File` in the editor sequentially; resolve with the edited files. */
  editFiles: (files: File[] | FileList) => Promise<File[]>;
  /** The editor element to mount once in the component tree. */
  editor: ReactElement;
  /** Whether the editor is currently open (for callers that want to gate UI). */
  isEditing: boolean;
}

export function useImageEditor(): UseImageEditor {
  const [source, setSource] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const resolverRef = useRef<((file: File) => void) | null>(null);

  const settle = useCallback((file: File) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setIsOpen(false);
    resolve?.(file);
  }, []);

  const editOne = useCallback(
    (file: File) =>
      new Promise<File>((resolve) => {
        resolverRef.current = resolve;
        setSource(file);
        setIsOpen(true);
      }),
    [],
  );

  const editFiles = useCallback(
    async (files: File[] | FileList): Promise<File[]> => {
      const arr = Array.from(files ?? []);
      const out: File[] = [];
      for (const file of arr) {
        if (!file.type.startsWith('image/')) {
          out.push(file); // PDFs / non-images bypass the editor
          continue;
        }
        out.push(await editOne(file));
      }
      return out;
    },
    [editOne],
  );

  const handleApply = useCallback(
    (blob: Blob) => {
      if (!source) return;
      settle(new File([blob], source.name, { type: blob.type || source.type }));
    },
    [source, settle],
  );

  const handleSkip = useCallback(() => {
    if (source) settle(source);
  }, [source, settle]);

  const editor = useMemo(
    () =>
      createElement(ImageEditorModal, {
        isOpen,
        source,
        onApply: handleApply,
        onSkip: handleSkip,
        onClose: handleSkip,
      }),
    [isOpen, source, handleApply, handleSkip],
  );

  return { editFiles, editor, isEditing: isOpen };
}
